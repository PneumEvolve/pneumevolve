// src/Pages/Stronghold/BuilderView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxPlaceBuilding, sfxWorkerDeath, sfxBuilderDanger, sfxPing } from "./audio";
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
  TURRET_UPGRADE_BASE_COST,
  TURRET_TIER_DAMAGE, TURRET_TIER_RANGE, TURRET_TIER_RATE, TURRET_TIER_HP,
  HOME_UPGRADE_BASE_COST, HOME_TIER_WORKERS, HOME_TIER_HP,
  BARRACKS_TIER_HP,
  GARDEN_TIER_RADIUS, GARDEN_TIER_SLOW, GARDEN_TIER_HP,
  REPAIR_SHOP_TIER_RADIUS, REPAIR_SHOP_TIER_RATE, REPAIR_SHOP_TIER_HP,
  UPGRADE_SHOP_TIER_HP,
  MARKET_TIER_GOLD, MARKET_TIER_HP,
  FIRE_TRAP_TIER_DAMAGE, FIRE_TRAP_TIER_RANGE, FIRE_TRAP_TIER_HP,
  WALL_TIER_HP,
  BUILDING_UPGRADE_BASE_COST, BUILDING_TIER_HP,
  effectiveTier,
  createInitialMap, lerp, dist, calcTownspeople, clampWorkers,
  applyConstructionAura, sellBuilding, updateBuilderRepair, getBreatherDuration,
  upgradeCount, repeatableCost, getMovementSpeed, BUILDER_SPEED_BASE,
  segmentCrossesWall,
  getProtectorMaxHp, getBuilderTotalMaxHp, getBuilderOverhealCap,
} from "./strongholdEngine";

const BUILDER_SPEED  = 150;
const BASE_PLACE_RANGE = 80;
const MOVE_THROTTLE  = 50;

export default function BuilderView({ room, onGameOver, resumeState, saveNotice }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef      = useRef(createJoystick());
  const joystickTouchIds = useRef(new Set());
  const cursorRef        = useRef({ wx: 0, wy: 0 }); // world-space cursor for wall ghost
  const rafRef      = useRef(null);
  const lastMoveRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const selectedTypeRef  = useRef(null);
  // Wall rotation: 8 snapped angles covering 0–157.5° (0–180° is sufficient for a rect)
  const wallAngleIndexRef = useRef(0);
  const WALL_ANGLE_COUNT  = 8; // 0°, 22.5°, 45°, 67.5°, 90°, 112.5°, 135°, 157.5°
  const [wallAngleIndex, setWallAngleIndexState] = useState(0);
  const setWallAngleIndex = (v) => { wallAngleIndexRef.current = v; setWallAngleIndexState(v); };
  const getWallAngle = () => wallAngleIndexRef.current * (Math.PI / WALL_ANGLE_COUNT);

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
  const [upgrades,      setUpgrades]      = useState([]);
  const [, forceUpdate]                   = useState(0);
  // Inter-wave ready-up (easy mode)
  const [waveReady,     setWaveReady]     = useState(false);
  const waveReadyRef = useRef(false);
  const [difficulty,    setDifficulty]    = useState(room?.difficulty ?? "normal");
  const difficultyRef = useRef(room?.difficulty ?? "normal");
  // Accumulate kill count from wave summaries (builder doesn't have the full dead enemy list)
  const totalEnemiesKilledRef = useRef(0);

  const [protectorConnected, setProtectorConnected] = useState(true);
  const lastProtectorHeartbeatRef = useRef(Date.now());

  const handlers = useRef({
    onP1Move: ({ x, y }) => {
      if (!stateRef.current) return;
      stateRef.current.protectorTarget = { x, y };
      // Reset heartbeat
      lastProtectorHeartbeatRef.current = Date.now();
      setProtectorConnected(true);
    },
    onBuildingHealth: ({ buildings, builderHp, protectorHp, lockedWorkers }) => {
      if (!stateRef.current) return;
      buildings.forEach(({ id, hp, maxHp, workers, upgradeTier, turretProjectiles }) => {
        const b = stateRef.current.buildings.find(b => b.id === id);
        if (b) {
          b.hp = hp;
          if (maxHp !== undefined) b.maxHp = maxHp;
          // Only apply the Protector's upgradeTier if it is at least as high as what
          // the Builder already has locally. This prevents a stale sync (sent before the
          // Protector processed the Builder's sendBuildingUpgrade) from clobbering the
          // optimistic local increment and making the upgrade appear to silently fail.
          if (upgradeTier !== undefined && upgradeTier >= (b.upgradeTier ?? 0)) b.upgradeTier = upgradeTier;
          // Defensively zero workers on destroyed buildings regardless of what the sync says,
          // so the Builder never shows ghost workers on a dead building.
          if (hp <= 0) { b.workers = 0; }
          else if (workers !== undefined) { b.workers = workers; }
          if (turretProjectiles !== undefined) b.turretProjectiles = turretProjectiles;
        }
      });
      if (builderHp !== undefined) stateRef.current.builderHp = builderHp;
      if (protectorHp !== undefined) stateRef.current.protectorHp = protectorHp;
      if (lockedWorkers !== undefined) stateRef.current.lockedWorkers = lockedWorkers;
    },
    onEnemyUpdate:  ({ enemies }) => {
      if (!stateRef.current) return;
      // Lerp-friendly merge: preserve _rx/_ry render positions when updating existing enemies,
      // so the draw loop can smoothly interpolate instead of jumping on each network tick.
      const existingMap = new Map((stateRef.current.enemies ?? []).map(e => [e.id, e]));
      const merged = enemies.map(e => {
        const prev = existingMap.get(e.id);
        if (prev) {
          // Preserve lerped render position; update the authoritative network target
          return { ...prev, ...e, _rx: prev._rx ?? prev.x, _ry: prev._ry ?? prev.y };
        }
        return { ...e, _rx: e.x, _ry: e.y };
      });
      stateRef.current.enemies = merged;
    },
    onUnitUpdate:   ({ units })   => {
      if (!stateRef.current) return;
      // Merge hp/maxHp/follows onto existing units, add new ones, remove dead ones.
      // Store network positions as tx/ty (lerp targets); _rx/_ry are the smoothed render positions.
      const existingMap = new Map(stateRef.current.units.map(u => [u.id, u]));
      units.forEach(({ id, x, y, hp, maxHp, follows }) => {
        const u = existingMap.get(id);
        if (u) {
          u.tx = x; u.ty = y; // authoritative target
          if (hp      !== undefined) u.hp      = hp;
          if (maxHp   !== undefined) u.maxHp   = maxHp;
          if (follows !== undefined) u.follows  = follows;
        } else {
          // New unit: snap render position to avoid lerping from 0,0
          stateRef.current.units.push({ id, tx: x, ty: y, _rx: x, _ry: y, hp, maxHp, follows });
        }
      });
      const liveIds = new Set(units.map(u => u.id));
      stateRef.current.units = stateRef.current.units.filter(u => liveIds.has(u.id));
    },
    onGoldUpdate: ({ gold, from }) => {
  if (from === "builder") return;   // ← ignore own echoes
  if (stateRef.current) { stateRef.current.gold = gold; setGold(gold); }
},
    onPhaseChange: ({ phase, waveNumber, won, gold, townspeople: tp, bonusGold, builderHp, resumeBuildings, resumeUpgrades, difficulty: rxDiff, buildingWorkers }) => {
      if (!stateRef.current) return;
      if (rxDiff !== undefined) { difficultyRef.current = rxDiff; setDifficulty(rxDiff); }
      stateRef.current.phase = phase;
      setPhase(phase);
      if (waveNumber !== undefined) { stateRef.current.waveNumber = waveNumber; setWaveNumber(waveNumber); }
      if (gold      !== undefined) { stateRef.current.gold = gold; setGold(gold); }
      if (tp        !== undefined) {
        stateRef.current.townspeople = tp;
        if (buildingWorkers && buildingWorkers.length > 0) {
          // Apply the authoritative post-clamp worker counts from the Protector.
          // This prevents the Builder from re-clamping independently (which can
          // silently remove workers from fire traps, turrets, etc. depending on
          // building array order).
          buildingWorkers.forEach(({ id, workers }) => {
            const b = stateRef.current.buildings.find(b => b.id === id);
            if (b) b.workers = workers;
          });
          // Still zero out any destroyed buildings just in case.
          stateRef.current.buildings.forEach(b => { if (b.hp <= 0) b.workers = 0; });
        } else {
          // Fallback: no authoritative data, clamp locally (old behaviour).
          clampWorkers(stateRef.current.buildings, tp);
        }
        setTownspeople(tp);
      }
      if (builderHp !== undefined) stateRef.current.builderHp = builderHp;

      // Resume hydration — Protector sends full building + upgrade snapshot on first breather
      if (resumeBuildings && resumeBuildings.length > 0) {
        stateRef.current.buildings = resumeBuildings.map(b => ({
          ...b,
          turretProjectiles: b.turretProjectiles ?? [],
          _fireFlash: 0,
        }));
        const maxId = stateRef.current.buildings.reduce((m, b) => Math.max(m, b.id ?? 0), 0);
        stateRef.current.nextBuildingId = maxId + 1;
      }
      if (resumeUpgrades) {
        stateRef.current.upgrades = resumeUpgrades;
        setUpgrades(resumeUpgrades);
      }

      if (phase === "breather") {
        stateRef.current.lockedWorkers = 0;
        stateRef.current.breatherLeft = waveNumber !== undefined ? getBreatherDuration(waveNumber, difficultyRef.current) : 30;
        setSelectedType(null); setMood("cozy");
        // Reset inter-wave ready-up so the button is usable again next breather
        waveReadyRef.current = false;
        setWaveReady(false);
      }
      if (phase === "wave") {
        setMood("tense");
        waveReadyRef.current = false;
        setWaveReady(false);
      }
      if (phase === "gameover") { setMood(null); onGameOver({ won, waveReached: waveNumber ?? stateRef.current?.waveNumber ?? 0, standing: stateRef.current?.buildings?.filter(b => b.hp > 0).length ?? 0, total: stateRef.current?.buildings?.length ?? 0, enemiesKilled: totalEnemiesKilledRef.current }); }
    },
    onCountdown: ({ seconds }) => {
      if (stateRef.current) stateRef.current.breatherLeft = seconds;
      setCountdown(Math.ceil(seconds));
    },
    onChat: ({ text, from }) => {
      if (!stateRef.current) return;
      stateRef.current.chatMessages?.unshift({ text, from, ts: Date.now() });
    },
    onRevive: ({ target }) => {
      // Protector revived the builder
      const s = stateRef.current;
      if (!s || target !== "builder") return;
      if ((s.builderHp ?? BUILDER_TOTAL_MAX_HP) <= 0) {
        s.builderHp = Math.floor(getBuilderTotalMaxHp(s.upgrades ?? []) * 0.4);
      }
    },
    onPing: ({ x, y, from }) => {
      const s = stateRef.current;
      if (!s) return;
      if (!s.activePings) s.activePings = [];
      s.activePings.push({ x, y, from, ts: Date.now() });
      sfxPing();
    },
    onWaveSummary: (data) => {
      setWaveSummary(data);
      // Accumulate authoritative kill count from the Protector's wave summary
      totalEnemiesKilledRef.current += (data.enemiesKilled ?? 0);
      setTimeout(() => setWaveSummary(null), 6000);
    },
    onPlayerReady: ({ role, context }) => {
      // Mirror protector's inter-wave ready-up state so builder sees "protector is ready"
      if (context === "wave" && role === "p1") {
        // No-op on builder side — protector drives the wave start
      }
    },
    onRestart: ({ seed, swap }) => {
      // Protector triggered a restart — tell parent so index.jsx can remount
      // with the correct new role and seed.
      // NOTE: do NOT guard on stateRef.current here — if the component is already
      // unmounting, stateRef may be null but we still need to propagate the restart
      // signal up to index.jsx so the Builder doesn't get stuck.
      onGameOver({
        waveReached: stateRef.current?.waveNumber ?? 0,
        standing:    stateRef.current?.buildings?.filter(b => b.hp > 0).length ?? 0,
        total:       stateRef.current?.buildings?.length ?? 0,
        enemiesKilled: stateRef.current?.enemies?.filter(e => e.dead).length ?? 0,
        _restart: true, _seed: seed, _swap: swap,
      });
    },
  }).current;

  const { sendP2Move, sendBuildingPlace, sendChat, sendWorkerAssign, sendPlayerReady, sendGoldUpdate, sendRevive, sendPing, sendAllegianceChange, sendBuildingHealth, sendBuildingUpgrade, sendBuildingSell } =
    useStrongholdRoom(room?.id ?? null, handlers);

  // ── State init ────────────────────────────────────────────────────────────
  function initState() {
    const bx = WORLD / 2 - 200, by = WORLD / 2 - 200;

    // ── Resume from saved snapshot ──────────────────────────────────────────
    if (resumeState) {
      const snap = resumeState;
      const buildings = (snap.buildings ?? []).map(b => ({
        ...b,
        turretProjectiles: b.turretProjectiles ?? [],
        _fireFlash: 0,
      }));
      // Generate workerWander for townspeople count
      const tp = snap.townspeople ?? TOWNSPEOPLE_START;
      const workerWander = Array.from({ length: tp }, (_, i) => ({
        x: bx + Math.cos((i / Math.max(tp, 1)) * Math.PI * 2) * 22,
        y: by + Math.sin((i / Math.max(tp, 1)) * Math.PI * 2) * 22,
        phaseX:  Math.random() * Math.PI * 2,
        phaseY:  Math.random() * Math.PI * 2,
        radiusX: 16 + Math.random() * 20,
        radiusY: 14 + Math.random() * 18,
        speed:   0.6 + Math.random() * 0.5,
      }));
      // Compute nextBuildingId from max existing id
      const maxId = buildings.reduce((m, b) => Math.max(m, b.id ?? 0), 0);
      return {
        builder:         { x: bx, y: by },
        protectorPos:    { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
        protectorTarget: { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
        buildings,
        enemies: [], units: [],
        phase: "breather", waveNumber: snap.waveNumber ?? 0,
        cam: { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },
        chatMessages: [], nextBuildingId: maxId + 1,
        gold: snap.gold ?? STARTING_GOLD,
        townspeople: tp,
        builderHp: snap.builderHp ?? BUILDER_TOTAL_MAX_HP,
        protectorHp: snap.playerHp ?? PROTECTOR_MAX_HP,
        lockedWorkers: 0,
        workerWander,
        activePings: [],
        upgrades: snap.upgrades ?? [],
      };
    }

    const map = createInitialMap();
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
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

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

    // Check building tap for worker assignment — only when NOT in placement mode.
    // This prevents the panel from auto-opening right after you place a building.
    if (!selectedTypeRef.current) {
      for (const b of state.buildings) {
        if (b.hp <= 0) continue;
        const def = BUILDING_TYPES[b.type];
        if (dist(wx, wy, b.x, b.y) < def.radius + 12) {
          setAssignPanel({ buildingId: b.id, screenX, screenY });
          return;
        }
      }
    }

    setAssignPanel(null);

    // Place building
    if ((state.phase !== "build" && state.phase !== "breather" && state.phase !== "wave") || !selectedTypeRef.current) {
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

    const MIN_BUILDING_SEPARATION = 90;
    const isPlacingWall = selectedTypeRef.current === "wall";
    const tooClose = state.buildings.some(b => {
      if (b.hp <= 0) return false;
      // Walls have no minimum distance — they can be placed right next to anything
      if (isPlacingWall) return false;
      // Non-walls can't be placed too close to other non-wall buildings
      if (b.isWall) return false; // walls don't block non-wall placement checks
      return dist(wx, wy, b.x, b.y) < MIN_BUILDING_SEPARATION;
    });
    if (tooClose) return;

    const building = {
      id: state.nextBuildingId++,
      type: selectedTypeRef.current,
      x: wx, y: wy,
      hp: def.maxHp, maxHp: def.maxHp,
      workers: 0,
      ...(isPlacingWall ? { angle: getWallAngle(), isWall: true, halfW: def.halfW, halfH: def.halfH } : {}),
    };
    // (applyConstructionAura no-op — overheal happens via direct repair now)
    state.buildings.push(building);
    state.gold -= cost;

    // Homes grant +2 population immediately on placement
    if (building.type === "home") {
      const bonus = BUILDING_TYPES.home.workersGranted ?? 2;
      state.townspeople = (state.townspeople ?? TOWNSPEOPLE_START) + bonus;
      setTownspeople(state.townspeople);
    }

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

  function handleCanvasMouseMove(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const { wx, wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    cursorRef.current = { wx, wy };
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
    // Enforce per-building worker caps (e.g. fire trap max 8)
    const def = BUILDING_TYPES[b.type];
    if (delta > 0 && def.maxWorkers !== undefined && (b.workers ?? 0) >= def.maxWorkers) return;
    b.workers = Math.max(0, (b.workers ?? 0) + delta);
    // Clamp to cap in case delta > 1 pushed over the limit
    if (def.maxWorkers !== undefined) b.workers = Math.min(b.workers, def.maxWorkers);
    sendWorkerAssign(buildingId, b.workers);
    forceUpdate(n => n + 1);
  }

  // ── Barracks allegiance toggle ────────────────────────────────────────────
  function toggleAllegiance(buildingId) {
    const s = stateRef.current;
    if (!s) return;
    const b = s.buildings.find(b => b.id === buildingId);
    if (!b || b.type !== "barracks") return;
    const next = (b.allegiance ?? "protector") === "protector" ? "builder" : "protector";
    b.allegiance = next;
    // Update existing soldiers from this barracks
    s.units.forEach(u => { if (u.barracksId === buildingId) u.follows = next; });
    sendAllegianceChange(buildingId, next);
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
    sendBuildingSell(buildingId);
    setGold(s.gold);
    setAssignPanel(null);
    forceUpdate(n => n + 1);
  }

  // ── Upgrade a specific building (all types except town_center) ───────────────
  // Home: cash-only upgrade (noWorkers). All others: cash tiers stack with workers.
  function handleUpgradeBuilding(buildingId) {
    const s = stateRef.current;
    if (!s) return;
    const b = s.buildings.find(b => b.id === buildingId);
    if (!b || b.hp <= 0) return;
    if (b.type === "town_center") return;

    const baseCost = BUILDING_UPGRADE_BASE_COST[b.type];
    if (!baseCost) return; // unknown type
    const tier = b.upgradeTier ?? 0;
    const cost = repeatableCost(baseCost, tier + 1);
    if (s.gold < cost) return;

    // Apply cash upgrade tier
    b.upgradeTier = tier + 1;

    // Increase maxHp and heal by that amount
    const hpGain = BUILDING_TIER_HP[b.type] ?? 20;
    b.maxHp += hpGain;
    b.hp = Math.min(b.hp + hpGain, b.maxHp);

    // Home: also grant a townsperson
    if (b.type === "home") {
      s.townspeople = (s.townspeople ?? TOWNSPEOPLE_START) + HOME_TIER_WORKERS;
      setTownspeople(s.townspeople);
    }

    s.gold -= cost;
    sendGoldUpdate({ gold: s.gold, from: "builder" });
    // Notify Protector (authoritative engine) about the upgrade so its game logic
    // (repair shop range, turret stats, soldier counts, calcTownspeople) uses the
    // correct upgradeTier. sendBuildingHealth goes Protector→Builder only.
    sendBuildingUpgrade(b.id, b.upgradeTier, b.maxHp, b.hp);
    setGold(s.gold);
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
    sfxPing();
  }

  // ── Touch handlers — joystick owns bottom 50%, top 50% scrolls freely ───
  function onTouchStart(e) {
    const canvas = canvasRef.current;
    for (const touch of e.changedTouches) {
      const rect = canvas?.getBoundingClientRect();
      const inBottomHalf = rect && touch.clientY >= rect.top + rect.height * 0.6;
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

    // Placement valid-zone overlay
    if ((state.phase === "build" || state.phase === "breather" || state.phase === "wave") && selectedTypeRef.current) {
      const { cx, cy } = worldToCanvas(builder.x, builder.y);
      const placeRange = BASE_PLACE_RANGE + ((state.upgrades ?? []).includes("place_range") ? BUILDER_PLACE_RANGE_BONUS : 0);
      const MIN_SEP = 90;

      // Step 1: dark overlay over the entire canvas
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Step 2: punch a green-tinted valid zone (place range circle) into the overlay
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(cx, cy, placeRange, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
      ctx.restore();

      // Step 3: green tint wash over the now-revealed area
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(cx, cy, placeRange, 0, Math.PI * 2);
      ctx.fillStyle = "#44ff88";
      ctx.fill();
      ctx.restore();

      // Step 4: re-darken exclusion zones around existing buildings (too-close areas)
      // Walls have no minimum distance, so skip exclusion zones entirely when placing a wall
      if (selectedTypeRef.current !== "wall") {
        buildings.forEach(b => {
          if (b.hp <= 0) return; // destroyed buildings no longer block placement
          if (b.isWall) return; // walls don't block other buildings
          const { cx: bx, cy: by } = worldToCanvas(b.x, b.y);
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.arc(bx, by, MIN_SEP, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.fill();
          // soft red tint so player knows why it's blocked
          ctx.globalAlpha = 0.25;
          ctx.beginPath(); ctx.arc(bx, by, MIN_SEP, 0, Math.PI * 2);
          ctx.fillStyle = "#ff4444";
          ctx.fill();
          ctx.restore();
        });
      }

      // Step 5: crisp dashed border of the place range
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, placeRange, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(80,255,150,0.7)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }

    // Wall placement ghost — shows rotated rect at cursor position
    if (selectedTypeRef.current === "wall" && cursorRef.current) {
      const wallDef   = BUILDING_TYPES.wall;
      const wallAngle = getWallAngle();
      const { wx: gwx, wy: gwy } = cursorRef.current;
      const { cx: gcx, cy: gcy } = worldToCanvas(gwx, gwy);
      const ghostPlaceRange = BASE_PLACE_RANGE + ((state.upgrades ?? []).includes("place_range") ? BUILDER_PLACE_RANGE_BONUS : 0);
      const inRange  = dist(builder.x, builder.y, gwx, gwy) <= ghostPlaceRange;
      const tooClose = false; // walls have no minimum distance restriction
      const valid    = inRange && !tooClose;
      ctx.save();
      ctx.translate(gcx, gcy);
      ctx.rotate(wallAngle);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle   = valid ? "rgba(136,153,170,0.35)" : "rgba(255,60,60,0.25)";
      ctx.fillRect(-wallDef.halfW, -wallDef.halfH, wallDef.halfW * 2, wallDef.halfH * 2);
      ctx.globalAlpha = valid ? 0.85 : 0.6;
      ctx.strokeStyle = valid ? "rgba(136,200,255,0.9)" : "rgba(255,60,60,0.8)";
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(-wallDef.halfW, -wallDef.halfH, wallDef.halfW * 2, wallDef.halfH * 2);
      // Battlements preview
      ctx.globalAlpha = valid ? 0.5 : 0.3;
      const merlonW = 9, merlonH = 7, gap = 13;
      const totalM = Math.floor((wallDef.halfW * 2) / (merlonW + gap));
      const mStart = -((totalM * (merlonW + gap) - gap) / 2);
      for (let i = 0; i < totalM; i++) {
        ctx.strokeRect(mStart + i * (merlonW + gap), -wallDef.halfH - merlonH, merlonW, merlonH);
      }
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
      const tier    = effectiveTier(b); // workers + upgradeTier (matches engine's radius formula)
      const radius  = def.repairRadius + tier * REPAIR_SHOP_TIER_RADIUS;
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

    // Fire trap AOE range rings
    buildings.forEach(b => {
      if (b.type !== "fire_trap" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y);
      const aoeRange = BUILDING_TYPES.fire_trap.aoeRange + effectiveTier(b) * FIRE_TRAP_TIER_RANGE;
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

    buildings.forEach(b => drawBuilding(ctx, b, t, W, H));

    units.forEach(u => {
      const { cx, cy } = worldToCanvas(u._rx ?? u.tx ?? 0, u._ry ?? u.ty ?? 0);
      const hpFrac = Math.max(0, (u.hp ?? 1) / (u.maxHp ?? 1));
      const isBuilderUnit = u.follows === "builder";
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = isBuilderUnit
        ? (hpFrac > 0.5 ? "#ffdd44" : "#ffaa00")
        : (hpFrac > 0.5 ? "#ff9966" : "#ff4444");
      ctx.fill(); ctx.restore();
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
      const { cx, cy } = worldToCanvas(e._rx ?? e.x, e._ry ?? e.y);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      const eRadius = e.radius ?? 7;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, eRadius, 0, Math.PI * 2);
      const fill = e.type === "demolisher"
        ? (e.chasingBuilder ? "#cc44ff" : "#7722cc")
        : e.chasingBuilder ? "#ff44aa" : "#cc2222";
      ctx.fillStyle = fill; ctx.fill();
      if (e.type === "demolisher") {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
        const r = eRadius * 0.4;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
      }
      // HP bar
      if (e.hp !== undefined && e.maxHp !== undefined && e.hp < e.maxHp) {
        const hpFrac = Math.max(0, e.hp / e.maxHp);
        const barW = eRadius * 2 + 4;
        const barH = 2.5;
        const barX = cx - barW / 2;
        const barY = cy - eRadius - 5;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpFrac > 0.5 ? "#ff5555" : "#ff2222";
        ctx.fillRect(barX, barY, barW * hpFrac, barH);
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
      ctx.beginPath(); ctx.arc(mx + (e._rx ?? e.x) * scale, my + (e._ry ?? e.y) * scale, e.type === "demolisher" ? 2 : 1.5, 0, Math.PI * 2);
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

    // Walls: slim rotated HP bar along the top edge
    if (def.isWall) {
      if (b.hp > 0 && hpPct < 1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(b.angle ?? 0);
        const barW = def.halfW * 2;
        const barY = -(def.halfH + 8);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(-def.halfW, barY, barW, 3);
        ctx.fillStyle = hpPct > 0.5 ? "rgba(100,255,100,0.8)" : hpPct > 0.25 ? "rgba(255,200,60,0.9)" : "rgba(255,60,60,1)";
        ctx.fillRect(-def.halfW, barY, barW * hpPct, 3);
        ctx.restore();
      }
      return; // no workers, no repair ring, no label on walls
    }

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
      const _overhealMax = getBuilderOverhealCap(state.upgrades ?? []) - 1.0; // e.g. 0.25/0.5/0.75/1.0
      const overhealFrac = _overhealMax > 0 ? Math.min((b.hp - b.maxHp) / (b.maxHp * _overhealMax), 1) : 0; // 0..1 across overheal range
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * overhealFrac);
      ctx.strokeStyle = `rgba(255,215,0,${0.6 + 0.2 * Math.sin(t * 3)})`;
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    // Turret: range ring + projectiles
    if (b.type === "turret" && b.hp > 0) {
      const ringRange = b._effectiveRange ?? def.attackRange;
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.beginPath(); ctx.arc(cx, cy, ringRange, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,68,136,0.8)"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      (b.turretProjectiles ?? []).forEach(p => {
        const progress = p.age / p.ttl;
        const { cx: sx, cy: sy } = worldToCanvas(p.x, p.y);
        const { cx: ex, cy: ey } = worldToCanvas(p.tx, p.ty);
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
          ctx.save(); ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(180,220,255,0.8)"; ctx.fill();
          ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(120,180,255,0.4)"; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.restore();
        }
      }
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(def.label, cx, cy + def.radius + 16);
      // Market: show income rate
      if (b.type === "market" && (stateRef.current?.waveNumber ?? 0) >= 1) {
        const rate = BUILDING_TYPES.market.goldPerSec + effectiveTier(b) * MARKET_TIER_GOLD;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(255,215,0,0.8)";
        ctx.font = "9px sans-serif";
        ctx.fillText(`+${rate.toFixed(1)}g/s`, cx, cy + def.radius + 27);
      }
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
    else if (phase === "breather") { const _diff = difficultyRef.current; label = _diff === "easy" ? "both ready up to start" : _diff === "hard" ? "next wave incoming…" : `next wave in ${Math.ceil(state.breatherLeft ?? 0)}s`; }
    ctx.fillText(label, W / 2, 28);

    if (phase === "breather") {
      ctx.globalAlpha = 0.15; ctx.fillStyle = "#ff4444";
      const secsLeft = state.breatherLeft ?? 0; const totalSecs = getBreatherDuration(state.waveNumber, difficultyRef.current); if (totalSecs > 0 && totalSecs !== Infinity) ctx.fillRect(0, 0, W * (1 - secsLeft / totalSecs), 3);
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
    const dpr   = window.devicePixelRatio || 1;
    const W     = canvas.width / dpr, H = canvas.height / dpr;
    const state = stateRef.current;
    const dt    = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;

    // ── Protector disconnect detection ─────────────────────────────────────
    {
      const secsSinceHB = (Date.now() - lastProtectorHeartbeatRef.current) / 1000;
      const activePhase = state.phase === "wave" || state.phase === "breather" || state.phase === "build";
      if (activePhase && secsSinceHB > 8) {
        setProtectorConnected(false);
      }
    }

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
      const builderSpeed = getMovementSpeed(state.upgrades ?? [], "builder_move_speed", BUILDER_SPEED_BASE);
      state.builder.x = Math.max(20, Math.min(WORLD - 20, state.builder.x + (vx / len) * builderSpeed * dt));
      state.builder.y = Math.max(20, Math.min(WORLD - 20, state.builder.y + (vy / len) * builderSpeed * dt));
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

    // Smoothly lerp enemy render positions toward their latest network positions.
    // With SYNC_THROTTLE at 200ms the positions arrive ~5/sec; lerping at ~0.25/frame
    // at 60fps closes the gap in ~6 frames (~100ms), giving fluid motion without lag.
    state.enemies.forEach(e => {
      if (e._rx === undefined) { e._rx = e.x; e._ry = e.y; return; }
      e._rx = lerp(e._rx, e.x, 0.25);
      e._ry = lerp(e._ry, e.y, 0.25);
    });

    // Smoothly lerp soldier render positions toward their network targets.
    state.units.forEach(u => {
      if (u._rx === undefined) { u._rx = u.tx ?? u.x ?? 0; u._ry = u.ty ?? u.y ?? 0; return; }
      u._rx = lerp(u._rx, u.tx ?? u._rx, 0.25);
      u._ry = lerp(u._ry, u.ty ?? u._ry, 0.25);
    });

    // Builder repairs buildings in all phases (wave, breather, build)
    if (!builderDown) {
      updateBuilderRepair(state.builder.x, state.builder.y, state.buildings, dt, state.upgrades ?? []);
    }

    // Builder revives downed protector by walking near them (wave or breather)
    if (state.phase === "wave" || state.phase === "breather") {
      const protectorDown = (state.protectorHp ?? PROTECTOR_MAX_HP) <= 0;
      if (protectorDown && !builderDown) {
        const dToProtector = dist(state.builder.x, state.builder.y, state.protectorPos.x, state.protectorPos.y);
        if (dToProtector < REVIVE_RADIUS) {
          state.protectorHp = Math.floor(PROTECTOR_MAX_HP * 0.4);
          sendRevive("protector");
        }
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, state, ts / 1000, W, H);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;
    function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * dpr;
  canvas.height = canvas.offsetHeight * dpr;
}
    resize();
    window.addEventListener("resize", resize);
    stateRef.current = initState();
    lastProtectorHeartbeatRef.current = Date.now();
    setProtectorConnected(true);
    rafRef.current   = requestAnimationFrame(loop);
    initAudio();
    setMood("cozy");

    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      // R / Shift+R: rotate wall
      if ((e.key === "r" || e.key === "R") && selectedTypeRef.current === "wall") {
        const dir = e.shiftKey ? -1 : 1;
        const next = ((wallAngleIndexRef.current + dir) + WALL_ANGLE_COUNT) % WALL_ANGLE_COUNT;
        setWallAngleIndex(next);
        e.preventDefault();
      }
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

  const inBuildPhase    = phase === "build" || phase === "breather";
  const canBuildOrRepair = phase === "build" || phase === "breather" || phase === "wave";
  const canPlace     = canBuildOrRepair && !!selectedType;
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
        onMouseMove={handleCanvasMouseMove}
      />

      {/* Protector disconnected warning */}
      {!protectorConnected && (
        <div style={{
          position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)",
          background: "rgba(10,13,15,0.92)", border: "0.5px solid rgba(255,100,60,0.3)",
          borderRadius: 12, padding: "10px 18px", zIndex: 18,
          fontSize: 12, color: "rgba(255,120,80,0.85)", textAlign: "center",
          backdropFilter: "blur(4px)", letterSpacing: "0.03em",
        }}>
          ⚠ protector may have disconnected
        </div>
      )}

      {/* Save notice — Protector saved the game */}
      {saveNotice && (
        <div style={{
          position: "absolute", top: protectorConnected ? 48 : 86, left: "50%", transform: "translateX(-50%)",
          background: "rgba(10,13,15,0.92)", border: "0.5px solid rgba(120,255,120,0.3)",
          borderRadius: 12, padding: "10px 18px", zIndex: 18,
          fontSize: 12, color: "rgba(120,255,120,0.85)", textAlign: "center",
          backdropFilter: "blur(4px)", letterSpacing: "0.03em",
        }}>
          ✓ game saved by protector
        </div>
      )}

      {/* Building description tooltip — floats above the bar, never pushes layout */}
      {canBuildOrRepair && selectedDef && (
        <div style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 62px)",
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
          {selectedType === "wall" && (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
              <button
                onClick={() => setWallAngleIndex(((wallAngleIndexRef.current - 1) + WALL_ANGLE_COUNT) % WALL_ANGLE_COUNT)}
                style={{ background: "rgba(136,153,170,0.15)", border: "1px solid rgba(136,153,170,0.3)", borderRadius: 6, color: "#8899aa", fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ↺
              </button>
              <span style={{
                display: "inline-block",
                transform: `rotate(${wallAngleIndex * (180 / WALL_ANGLE_COUNT)}deg)`,
                fontSize: 18, color: "#8899aa", transition: "transform 0.15s",
                width: 28, textAlign: "center", lineHeight: 1,
              }}>—</span>
              <button
                onClick={() => setWallAngleIndex((wallAngleIndexRef.current + 1) % WALL_ANGLE_COUNT)}
                style={{ background: "rgba(136,153,170,0.15)", border: "1px solid rgba(136,153,170,0.3)", borderRadius: 6, color: "#8899aa", fontSize: 14, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ↻
              </button>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>R to rotate</span>
            </span>
          )}
          {canPlace && (
            <span style={{ color: "rgba(120,200,255,0.5)", display: "block", fontSize: 10, marginTop: 2 }}>
              tap within range to place
            </span>
          )}
        </div>
      )}

      {/* Building selector — outside canvas, scrolls freely */}
      {canBuildOrRepair && (
        <div style={{
          background: "rgba(10,13,15,0.95)",
          borderTop:  "0.5px solid rgba(255,255,255,0.06)",
          padding:    "8px 0 env(safe-area-inset-bottom, 8px)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5, padding: "0 8px",
            justifyContent: "center",
          }}>
            {PLACEABLE_BUILDINGS.map(b => {
              const affordable = gold >= (b.cost ?? 0);
              const isSelected = selectedType === b.id;
              const isWall     = b.id === "wall";
              return (
                <button key={b.id} onClick={() => setSelectedType(isSelected ? null : b.id)} style={{
                  flexShrink: 0,
                  background:   isSelected ? `rgba(${hexToRgb(b.color)},0.15)` : "rgba(255,255,255,0.03)",
                  border:       `1px solid ${isSelected ? b.color : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 10,
                  color:        isSelected ? b.color : affordable ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
                  fontSize: 10, padding: "6px 8px", minHeight: 40, minWidth: 58,
                  cursor: affordable ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap", transition: "all 0.12s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                }}>
                  {isWall ? (
                    <span style={{ display: "inline-block", transform: `rotate(${wallAngleIndex * (180 / WALL_ANGLE_COUNT)}deg)`, fontSize: 14, lineHeight: 1, transition: "transform 0.15s" }}>—</span>
                  ) : null}
                  <span>{b.label}</span>
                  <span style={{ opacity: 0.55, fontSize: 9 }}>{b.cost}g</span>
                </button>
              );
            })}

            {showReadyUp && (
              <button onClick={() => { if (!ready) { setReady(true); sendPlayerReady("p2"); } }} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 10,
                minHeight: 40, minWidth: 64, fontSize: 10,
                background: ready ? "rgba(120,255,120,0.08)" : "rgba(120,200,255,0.08)",
                border: `1px solid ${ready ? "rgba(120,255,120,0.3)" : "rgba(120,200,255,0.25)"}`,
                color:  ready ? "rgba(120,255,120,0.7)" : "rgba(120,200,255,0.9)",
                cursor: ready ? "default" : "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ready ? "✓ ready" : "ready up"}
              </button>
            )}
            {/* Inter-wave ready-up — easy mode, shown during breather */}
            {difficulty === "easy" && phase === "breather" && (
              <button onClick={() => {
                if (waveReadyRef.current) return;
                waveReadyRef.current = true;
                setWaveReady(true);
                sendPlayerReady("p2", "wave");
              }} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 10,
                minHeight: 40, minWidth: 120, fontSize: 10,
                background: waveReady ? "rgba(120,255,120,0.08)" : "rgba(255,210,80,0.08)",
                border: `1px solid ${waveReady ? "rgba(120,255,120,0.3)" : "rgba(255,210,80,0.3)"}`,
                color:  waveReady ? "rgba(120,255,120,0.7)" : "rgba(255,210,80,0.9)",
                cursor: waveReady ? "default" : "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {waveReady ? "✓ ready" : `start wave ${waveNumber + 1}`}
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
            {!BUILDING_TYPES[panelBuilding.type]?.noWorkers && (<>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 4 }}>
              {[-4, -2, -1].map(delta => {
                const canDo = (panelBuilding.workers ?? 0) >= Math.abs(delta);
                return (
                  <button key={delta} onClick={() => adjustWorkers(panelBuilding.id, delta)} style={{
                    flex: 1, height: 32, borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12,
                    cursor: canDo ? "pointer" : "default", opacity: canDo ? 1 : 0.25, fontVariantNumeric: "tabular-nums",
                  }}>{delta}</button>
                );
              })}
              <span style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.85)", minWidth: 26, textAlign: "center" }}>
                {panelBuilding.workers ?? 0}
              </span>
              {[1, 2, 4].map(delta => {

                const canDo = freeWorkers >= delta && canAddToBarracks;
                return (
                  <button key={delta} onClick={() => adjustWorkers(panelBuilding.id, delta)} style={{
                    flex: 1, height: 32, borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12,
                    cursor: canDo ? "pointer" : "default", opacity: canDo ? 1 : 0.25, fontVariantNumeric: "tabular-nums",
                  }}>+{delta}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>{freeWorkers} free</div>
            {lockedWorkers > 0 && panelBuilding.type === "barracks" && (
              <div style={{ fontSize: 10, color: "rgba(255,100,100,0.55)", marginTop: 8, lineHeight: 1.4 }}>
                {lockedWorkers} grieving — available at breather
              </div>
            )}
            </>)}
            {/* Allegiance toggle — barracks only */}
            {panelBuilding.type === "barracks" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>soldiers follow</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["protector", "builder"].map(side => {
                    const current = panelBuilding.allegiance ?? "protector";
                    const isActive = current === side;
                    const color = side === "protector" ? "#88ccff" : "#ffcc44";
                    return (
                      <button key={side} onClick={() => toggleAllegiance(panelBuilding.id)} disabled={isActive} style={{
                        flex: 1, padding: "6px 4px", borderRadius: 8, fontSize: 10,
                        border: `0.5px solid ${isActive ? color : "rgba(255,255,255,0.1)"}`,
                        background: isActive ? `rgba(${side === "protector" ? "120,180,255" : "255,200,60"},0.1)` : "rgba(255,255,255,0.03)",
                        color: isActive ? color : "rgba(255,255,255,0.3)",
                        cursor: isActive ? "default" : "pointer",
                        letterSpacing: "0.04em", transition: "all 0.15s",
                      }}>
                        {side === "protector" ? "⚔ protector" : "🔨 builder"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Upgrade button — all buildings except town_center */}
            {panelBuilding.type !== "town_center" && BUILDING_UPGRADE_BASE_COST[panelBuilding.type] && (() => {
              const tier     = panelBuilding.upgradeTier ?? 0;
              const workers  = panelBuilding.workers ?? 0;
              const baseCost = BUILDING_UPGRADE_BASE_COST[panelBuilding.type];
              const cost     = repeatableCost(baseCost, tier + 1);
              const canAfford = gold >= cost;
              const isHome   = panelBuilding.type === "home";
              const effectTier = workers + tier;

              // Build a human-readable list of what each cash upgrade adds
              const statLines = {
                turret:       [`+${TURRET_TIER_DAMAGE} dmg`, `+${TURRET_TIER_RANGE} range`, `+${TURRET_TIER_RATE.toFixed(1)}/s rate`, `+${TURRET_TIER_HP} HP`],
                home:         [`+${HOME_TIER_WORKERS} person`, `+${HOME_TIER_HP} HP`],
                barracks:     [`+1 soldier`, `+${BARRACKS_TIER_HP} HP`],
                garden:       [`+${GARDEN_TIER_RADIUS} slow radius`, `-${(GARDEN_TIER_SLOW * 100).toFixed(0)}% slow`, `+${GARDEN_TIER_HP} HP`],
                repair_shop:  [`+${REPAIR_SHOP_TIER_RADIUS} reach`, `+${REPAIR_SHOP_TIER_RATE} repair/s`, `+${REPAIR_SHOP_TIER_HP} HP`],
                upgrade_shop: [`+${UPGRADE_SHOP_TIER_HP} HP`],
                market:       [`+${MARKET_TIER_GOLD.toFixed(1)}g/s`, `+${MARKET_TIER_HP} HP`],
                fire_trap:    [`+${FIRE_TRAP_TIER_DAMAGE} dmg`, `+${FIRE_TRAP_TIER_RANGE} range`, `+${FIRE_TRAP_TIER_HP} HP`],
                wall:         [`+${WALL_TIER_HP} HP`],
              };
              const stats = statLines[panelBuilding.type] ?? [`+${BUILDING_TIER_HP[panelBuilding.type] ?? 20} HP`];

              return (
                <div style={{ marginTop: 8 }}>
                  {!isHome && tier > 0 && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 4, lineHeight: 1.4 }}>
                      {workers > 0
                        ? `${workers} workers + ${tier} cash = tier ${effectTier} effective`
                        : `${tier} cash tier${tier !== 1 ? "s" : ""} — tier ${effectTier} effective`}
                    </div>
                  )}
                  <button
                    onClick={() => canAfford && handleUpgradeBuilding(panelBuilding.id)}
                    style={{
                      width: "100%", padding: "8px", borderRadius: 8,
                      background: canAfford ? "rgba(255,200,60,0.08)" : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${canAfford ? "rgba(255,200,60,0.35)" : "rgba(255,255,255,0.1)"}`,
                      color: canAfford ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.25)",
                      fontSize: 11, cursor: canAfford ? "pointer" : "default", letterSpacing: "0.04em",
                      textAlign: "left", lineHeight: 1.5,
                    }}>
                    <div>{tier > 0 ? `upgrade tier ${tier + 1} — ${cost}g` : `upgrade — ${cost}g`}</div>
                    <div style={{ opacity: 0.6, fontSize: 10, marginTop: 2 }}>
                      {stats.join("  ·  ")}
                    </div>
                  </button>
                </div>
              );
            })()}
            {/* Sell button — not for town center */}
            {panelBuilding.type !== "town_center" && (
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
          <div onClick={() => setWaveSummary(null)} style={{ position: "absolute", top: 8, right: 10, fontSize: 16, color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</div>
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