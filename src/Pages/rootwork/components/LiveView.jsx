// src/Pages/rootwork/components/LiveView.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { CROPS, BARN_BUILDINGS, FISHING_BODY_ORDER, HERO_CLASS_META, FISHING_WORKER_BASE_INTERVAL } from "../gameConstants";

// ─── Layout constants ─────────────────────────────────────────────────────────
const PLOT_SIZE  = 18;
const PLOT_GAP   = 3;
const ZONE_PAD   = 18;
const ZONE_GAP   = 32;

// Zone x positions (world space) — computed at render time based on farm count
// All drawing uses a camera transform: ctx.translate(-cam.x, -cam.y) + ctx.scale(cam.z)

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  farmBg:       "rgba(99,153,34,0.12)",
  farmBorder:   "rgba(99,153,34,0.35)",
  plotEmpty:    "#D3D1C7",
  plotPlanted:  "#C0DD97",
  plotGrowing:  "#97C459",
  plotReady:    "#639922",
  plotReadyGlow:"#3B6D11",
  barnBg:       "rgba(186,117,23,0.12)",
  barnBorder:   "rgba(186,117,23,0.4)",
  pondBg:       "rgba(55,138,221,0.12)",
  pondBorder:   "rgba(55,138,221,0.4)",
  pondWater:    "rgba(55,138,221,0.18)",
  dungeonBg:    "rgba(60,52,137,0.18)",
  dungeonBorder:"rgba(127,119,221,0.5)",
  workerFarm:   "#378ADD",
  workerBarn:   "#BA7517",
  workerFish:   "#1D9E75",
  workerHero:   { fighter: "#ef4444", mage: "#a78bfa", scavenger: "#4ade80", default: "#94a3b8" },
  tavernBg:     "rgba(234,179,8,0.12)",
  tavernBorder: "rgba(234,179,8,0.4)",
  textMuted:    "rgba(136,135,128,0.9)",
  textBright:   "rgba(255,255,255,0.9)",
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function randomBetween(a, b) { return a + Math.random() * (b - a); }

// ─── Build world layout from game state ──────────────────────────────────────
function buildLayout(game) {
  const zones = [];
  let curX = ZONE_PAD;

  // ── Farm zones ──
  const farms = game.farms ?? [];
  farms.forEach((farm, fi) => {
    const crop = CROPS[farm.crop];
    const plots = farm.plots ?? [];
    const unlocked = farm.unlockedPlots ?? plots.length;
    const cols = Math.ceil(Math.sqrt(unlocked));
    const rows = Math.ceil(unlocked / cols);
    const w = cols * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP + ZONE_PAD * 2;
    const h = rows * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP + ZONE_PAD * 2 + 22;
    zones.push({
      type: "farm", id: farm.id, farmIndex: fi, farm,
      crop, cols, rows, plots: plots.slice(0, unlocked),
      x: curX, y: 0, w, h,
      label: `${crop?.emoji ?? "🌾"} ${crop?.name ?? "Farm"}`,
    });
    curX += w + ZONE_GAP;
  });

  // ── Barn zones ──
  const barnInstances = game.barnInstances ?? [];
  barnInstances.forEach((inst, bi) => {
    const def = BARN_BUILDINGS[inst.buildingType];
    const animals = inst.animals ?? [];
    const workers = inst.barnWorkers ?? [];
    const slotCount = Math.max(animals.length, 3);
    const animalCols = Math.min(slotCount, 4);
    const animalRows = Math.ceil(slotCount / animalCols);
    const w = animalCols * 28 + ZONE_PAD * 2;
    const h = animalRows * 28 + ZONE_PAD * 2 + 22 + (workers.length > 0 ? 14 : 0);
    zones.push({
      type: "barn", id: inst.id, barnIndex: bi, inst, def, animals, workers,
      animalCols, animalRows, slotCount,
      x: curX, y: 0, w, h,
      label: `${def?.emoji ?? "🐄"} ${def?.name ?? "Barn"}`,
    });
    curX += w + ZONE_GAP;
  });

  // ── Fishing zones ──
  const fishingBodies = game.fishing?.bodies ?? {};
  const activeBodies = FISHING_BODY_ORDER.filter(id => fishingBodies[id]?.unlocked);
  const FISH_EMOJIS = { pond: "🏊", lake: "🏞️", river: "🏔️", ocean: "🌊" };
  const FISH_COLORS = { pond: "rgba(96,165,250,0.25)", lake: "rgba(37,99,235,0.25)", river: "rgba(30,64,175,0.25)", ocean: "rgba(15,23,42,0.35)" };

  if (activeBodies.length > 0) {
    const maxWorkers = activeBodies.reduce((m, id) => {
      const ws = fishingBodies[id]?.workers ?? [];
      return Math.max(m, ws.length);
    }, 1);
    const w = Math.max(110, maxWorkers * 28 + ZONE_PAD * 2);
    const h = activeBodies.length * 52 + ZONE_PAD * 2 + 22;
    zones.push({
      type: "fishing", id: "fishing",
      bodies: activeBodies.map(id => ({
        id, workers: fishingBodies[id]?.workers ?? [],
        emoji: FISH_EMOJIS[id] ?? "🎣",
        waterColor: FISH_COLORS[id] ?? FISH_COLORS.pond,
        label: id.charAt(0).toUpperCase() + id.slice(1),
      })),
      x: curX, y: 0, w, h,
      label: "🎣 Fishing",
    });
    curX += w + ZONE_GAP;
  }

  // ── Dungeon zone (heroes + tavern) ──
  const adventurers = game.adventurers ?? [];
  const tavernBuilt = game.town?.tavernBuilt === true || (game.townBuildings?.tavern?.built === true);
  const bossFight = game.bossFight;
  const w = Math.max(160, adventurers.length * 30 + ZONE_PAD * 2);
  const h = 200;
  zones.push({
    type: "dungeon", id: "dungeon",
    adventurers, tavernBuilt, bossFight,
    x: curX, y: 0, w, h,
    label: "⚔️ Dungeon",
  });
  curX += w + ZONE_PAD;

  const worldW = curX;
  const worldH = Math.max(...zones.map(z => z.h)) + ZONE_PAD * 2;
  return { zones, worldW, worldH };
}

// ─── Worker visual state (animated positions, keyed by worker ID) ─────────────
function initWorkerVisuals(zones, existing) {
  const vis = { ...existing };

  zones.forEach(zone => {
    if (zone.type === "farm") {
      const farmWorkers = (zone.farm ? [] : []);
      // farm workers are in game.workers with farmId
    }
  });

  return vis;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiveView({ game }) {
  const canvasRef    = useRef(null);
  const gameRef      = useRef(game);
  const camRef       = useRef({ x: 0, y: 0, z: 1 });
  const workerVis    = useRef({});  // id → { x, y, tx, ty, state, timer }
  const dragRef      = useRef(null);
  const rafRef       = useRef(null);
  const layoutRef    = useRef(null);
  const lastTimeRef  = useRef(null);

  // Keep gameRef current without triggering re-renders
  useEffect(() => { gameRef.current = game; }, [game]);

  // ── Worker visual bootstrap ────────────────────────────────────────────────
  function ensureWorkerVis(id, x, y, color, size = 5) {
    if (!workerVis.current[id]) {
      workerVis.current[id] = {
        x: x + randomBetween(-4, 4),
        y: y + randomBetween(-4, 4),
        tx: x, ty: y,
        color, size,
        state: "idle",
        timer: randomBetween(0, 3),
        idleAngle: Math.random() * Math.PI * 2,
        idleRadius: randomBetween(4, 10),
      };
    } else {
      workerVis.current[id].color = color;
    }
    return workerVis.current[id];
  }

  // ── Animation tick ─────────────────────────────────────────────────────────
  const tick = useCallback((ts) => {
    rafRef.current = requestAnimationFrame(tick);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    if (!g) return;

    const dt = Math.min((ts - (lastTimeRef.current ?? ts)) / 1000, 0.05);
    lastTimeRef.current = ts;

    const layout = buildLayout(g);
    layoutRef.current = layout;

    const cam = camRef.current;
    const DPR = window.devicePixelRatio || 1;
    const CW = canvas.width / DPR;
    const CH = canvas.height / DPR;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(DPR, DPR);

    // Dark background
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    ctx.fillStyle = isDark ? "#1a1a24" : "#f0efea";
    ctx.fillRect(0, 0, CW, CH);

    // Camera transform
    ctx.translate(CW / 2, CH / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);

    // Draw ground
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
    ctx.fillRect(0, -10, layout.worldW, layout.worldH + 20);

    // ── Draw each zone ──
    layout.zones.forEach(zone => {
      drawZone(ctx, zone, g, dt, isDark);
    });

    // ── Draw all animated workers on top ──
    drawWorkers(ctx, layout, g, dt, isDark);

    ctx.restore();
  }, []);

  // ── Draw zone background + static content ─────────────────────────────────
  function drawZone(ctx, zone, g, dt, isDark) {
    const { x, y, w, h } = zone;
    const textColor = isDark ? COLORS.textBright : "rgba(30,30,30,0.9)";
    const mutedColor = isDark ? COLORS.textMuted : "rgba(80,80,80,0.8)";

    // Zone label
    ctx.font = "500 11px system-ui, sans-serif";
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "left";
    ctx.fillText(zone.label, x + ZONE_PAD, y + 14);

    if (zone.type === "farm") {
      // Zone bg
      ctx.fillStyle = isDark ? COLORS.farmBg : "rgba(99,153,34,0.08)";
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.farmBorder;
      ctx.lineWidth = 0.75;
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.stroke();

      // Plots
      zone.plots.forEach((plot, pi) => {
        const col = pi % zone.cols;
        const row = Math.floor(pi / zone.cols);
        const px = x + ZONE_PAD + col * (PLOT_SIZE + PLOT_GAP);
        const py = y + 18 + ZONE_PAD + row * (PLOT_SIZE + PLOT_GAP);

        const growthPct = plot.state === "ready" ? 1
          : plot.state === "planted" ? Math.min(0.95, (plot.growthTick ?? 0) / ((CROPS[zone.farm.crop]?.growTime ?? 15)))
          : 0;

        const col2 = plot.state === "ready" ? COLORS.plotReady
          : plot.state === "planted" && growthPct > 0.5 ? COLORS.plotGrowing
          : plot.state === "planted" ? COLORS.plotPlanted
          : COLORS.plotEmpty;

        ctx.fillStyle = col2;
        roundRect(ctx, px, py, PLOT_SIZE, PLOT_SIZE, 3);
        ctx.fill();

        // Ready indicator
        if (plot.state === "ready") {
          ctx.fillStyle = COLORS.plotReadyGlow;
          ctx.font = "9px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("✓", px + PLOT_SIZE / 2, py + PLOT_SIZE / 2 + 3);
        } else if (plot.state === "planted" && growthPct > 0.05) {
          // mini progress bar
          const bw = (PLOT_SIZE - 4) * growthPct;
          ctx.fillStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
          roundRect(ctx, px + 2, py + PLOT_SIZE - 4, PLOT_SIZE - 4, 3, 1);
          ctx.fill();
          ctx.fillStyle = "#3B6D11";
          roundRect(ctx, px + 2, py + PLOT_SIZE - 4, bw, 3, 1);
          ctx.fill();
        }
      });
    }

    if (zone.type === "barn") {
      ctx.fillStyle = isDark ? COLORS.barnBg : "rgba(186,117,23,0.07)";
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.barnBorder;
      ctx.lineWidth = 0.75;
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.stroke();

      // Animal slots
      zone.animals.forEach((animal, ai) => {
        const col = ai % zone.animalCols;
        const row = Math.floor(ai / zone.animalCols);
        const ax = x + ZONE_PAD + col * 28;
        const ay = y + 18 + ZONE_PAD + row * 28;
        const mood = animal.mood ?? 100;
        const moodColor = mood > 70 ? "#4ade80" : mood > 40 ? "#f59e0b" : "#ef4444";

        ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
        roundRect(ctx, ax, ay, 22, 22, 4);
        ctx.fill();

        // Mood ring
        ctx.strokeStyle = moodColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax + 11, ay + 11, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Animal emoji text
        const animalEmoji = zone.def?.animalType === "chicken" ? "🐔"
          : zone.def?.animalType === "cow" ? "🐄" : "🐑";
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(animalEmoji, ax + 11, ay + 15);

        // Ready dot
        if ((animal.stock ?? 0) > 0) {
          ctx.fillStyle = "#4ade80";
          ctx.beginPath();
          ctx.arc(ax + 20, ay + 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    if (zone.type === "fishing") {
      ctx.fillStyle = isDark ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.05)";
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.pondBorder;
      ctx.lineWidth = 0.75;
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.stroke();

      // Each body of water
      zone.bodies.forEach((body, bi) => {
        const by = y + 18 + ZONE_PAD + bi * 52;
        const bw = w - ZONE_PAD * 2;

        // Water area
        ctx.fillStyle = body.waterColor;
        roundRect(ctx, x + ZONE_PAD, by + 14, bw, 32, 5);
        ctx.fill();

        // Body label
        ctx.font = "10px system-ui";
        ctx.fillStyle = mutedColor;
        ctx.textAlign = "left";
        ctx.fillText(`${body.emoji} ${body.label}`, x + ZONE_PAD + 4, by + 11);

        // Fisher slots (shown as dock positions)
        body.workers.forEach((_, wi) => {
          const wx = x + ZONE_PAD + 6 + wi * 26;
          const wy = by + 14;
          // Dock post
          ctx.strokeStyle = isDark ? "rgba(186,117,23,0.5)" : "rgba(120,80,20,0.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(wx + 5, wy + 5);
          ctx.lineTo(wx + 5, wy + 28);
          ctx.stroke();
        });
      });
    }

    if (zone.type === "dungeon") {
      // Dark moody bg
      ctx.fillStyle = isDark ? "rgba(60,52,137,0.25)" : "rgba(60,52,137,0.12)";
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.dungeonBorder;
      ctx.lineWidth = 0.75;
      roundRect(ctx, x, y + 18, w, h - 18, 10);
      ctx.stroke();

      // Dungeon entrance
      const ex = x + w - 52;
      const ey = y + h - 70;
      ctx.fillStyle = isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)";
      roundRect(ctx, ex, ey, 40, 50, 20, 20, 0, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(127,119,221,0.6)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, ex, ey, 40, 50, 20, 20, 0, 0);
      ctx.stroke();
      ctx.font = "18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("🌑", ex + 20, ey + 32);

      // Boss indicator
      if (zone.bossFight?.phase === "fighting") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 9px system-ui";
        ctx.fillText("⚔ BOSS", ex + 20, ey - 6);
      }

      // Tavern
      if (zone.tavernBuilt) {
        const tx = x + ZONE_PAD;
        const ty = y + h - 64;
        ctx.fillStyle = isDark ? COLORS.tavernBg : "rgba(234,179,8,0.1)";
        roundRect(ctx, tx, ty, 50, 40, 6);
        ctx.fill();
        ctx.strokeStyle = COLORS.tavernBorder;
        ctx.lineWidth = 0.75;
        roundRect(ctx, tx, ty, 50, 40, 6);
        ctx.stroke();
        ctx.font = "16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("🍺", tx + 25, ty + 26);
        ctx.font = "8px system-ui";
        ctx.fillStyle = mutedColor;
        ctx.fillText("Tavern", tx + 25, ty + 38);
      }
    }
  }

  // ── Draw animated worker dots ─────────────────────────────────────────────
  function drawWorkers(ctx, layout, g, dt, isDark) {
    const speed = 40; // px/sec world space

    // Farm workers
    const farmWorkers = g.workers ?? [];
    layout.zones.filter(z => z.type === "farm").forEach(zone => {
      const zoneWorkers = farmWorkers.filter(w => w.farmId === zone.farm.id);
      zoneWorkers.forEach((w, wi) => {
        const plots = zone.plots;
        if (plots.length === 0) return;

        const vis = ensureWorkerVis(
          w.id,
          zone.x + ZONE_PAD + 8,
          zone.y + 18 + ZONE_PAD + 8,
          COLORS.workerFarm
        );

        // Pick a target plot to wander toward
        vis.timer -= dt;
        if (vis.timer <= 0 || dist(vis, { x: vis.tx, y: vis.ty }) < 2) {
          const readyPlots = plots.filter(p => p.state === "ready");
          const pool = readyPlots.length > 0 ? readyPlots : plots;
          const pi = Math.floor(Math.random() * pool.length);
          const targetPlot = pool[pi];
          const origIdx = plots.indexOf(targetPlot);
          const col = (origIdx < 0 ? 0 : origIdx) % zone.cols;
          const row = Math.floor((origIdx < 0 ? 0 : origIdx) / zone.cols);
          vis.tx = zone.x + ZONE_PAD + col * (PLOT_SIZE + PLOT_GAP) + PLOT_SIZE / 2;
          vis.ty = zone.y + 18 + ZONE_PAD + row * (PLOT_SIZE + PLOT_GAP) + PLOT_SIZE / 2;
          vis.timer = randomBetween(1.5, 3.5);
        }

        moveToward(vis, speed, dt);
        drawDot(ctx, vis.x, vis.y, vis.color, 5);
      });
    });

    // Barn workers
    layout.zones.filter(z => z.type === "barn").forEach(zone => {
      zone.workers.forEach((w, wi) => {
        const cx = zone.x + zone.w / 2;
        const cy = zone.y + 18 + zone.h / 2;
        const vis = ensureWorkerVis(w.id ?? `bw-${zone.id}-${wi}`, cx, cy, COLORS.workerBarn);

        vis.timer -= dt;
        if (vis.timer <= 0 || dist(vis, { x: vis.tx, y: vis.ty }) < 2) {
          // Wander between animal slots
          const ai = Math.floor(Math.random() * Math.max(1, zone.animals.length));
          const col = ai % zone.animalCols;
          const row = Math.floor(ai / zone.animalCols);
          vis.tx = zone.x + ZONE_PAD + col * 28 + 11;
          vis.ty = zone.y + 18 + ZONE_PAD + row * 28 + 11;
          vis.timer = randomBetween(2, 5);
        }

        moveToward(vis, speed, dt);
        drawDot(ctx, vis.x, vis.y, vis.color, 5);
      });
    });

    // Fishing workers
    layout.zones.filter(z => z.type === "fishing").forEach(zone => {
      zone.bodies.forEach((body, bi) => {
        const byBase = zone.y + 18 + ZONE_PAD + bi * 52;
        body.workers.forEach((w, wi) => {
          const id = `fish-${body.id}-${wi}`;
          const dockX = zone.x + ZONE_PAD + 6 + wi * 26 + 5;
          const dockY = byBase + 14 + 14;
          const vis = ensureWorkerVis(id, dockX, dockY, COLORS.workerFish);

          // Fishers gently bob — they mostly stay at their dock
          vis.timer -= dt;
          if (vis.timer <= 0) {
            const interval = FISHING_WORKER_BASE_INTERVAL;
            const castPct = (w.timer ?? 0) / Math.max(1, interval);
            if (castPct > 0.8) {
              // About to catch — lean forward
              vis.tx = dockX + 3;
              vis.ty = dockY + 4;
            } else {
              vis.tx = dockX + randomBetween(-1, 1);
              vis.ty = dockY + randomBetween(-1, 1);
            }
            vis.timer = randomBetween(0.8, 2);
          }

          moveToward(vis, 12, dt);

          // Fishing line
          ctx.strokeStyle = "rgba(136,135,128,0.5)";
          ctx.lineWidth = 0.75;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(vis.x, vis.y);
          ctx.lineTo(vis.x + 12, vis.y + 16);
          ctx.stroke();
          ctx.setLineDash([]);

          // Bobber
          const castPct = (w.timer ?? 0) / Math.max(1, FISHING_WORKER_BASE_INTERVAL);
          const bobberColor = castPct > 0.85 ? "#ef4444" : "#378ADD";
          ctx.fillStyle = bobberColor;
          ctx.beginPath();
          ctx.arc(vis.x + 12, vis.y + 16, 2.5, 0, Math.PI * 2);
          ctx.fill();

          drawDot(ctx, vis.x, vis.y, COLORS.workerFish, 5);
        });
      });
    });

    // Heroes
    const dungeonZone = layout.zones.find(z => z.type === "dungeon");
    if (dungeonZone) {
      const dz = dungeonZone;
      const entrance = { x: dz.x + dz.w - 32, y: dz.y + dz.h - 45 };
      const tavernCenter = { x: dz.x + ZONE_PAD + 25, y: dz.y + dz.h - 44 };

      (g.adventurers ?? []).forEach((adv, ai) => {
        const cls = adv.heroClass ?? adv.class ?? "default";
        const color = COLORS.workerHero[cls] ?? COLORS.workerHero.default;
        const baseX = dz.x + ZONE_PAD + 16 + (ai % 4) * 28;
        const baseY = dz.y + 38 + Math.floor(ai / 4) * 28;
        const vis = ensureWorkerVis(`hero-${adv.id}`, baseX, baseY, color, 6);
        vis.color = color;

        vis.timer -= dt;

        const isDead   = (adv.hp ?? 1) <= 0;
        const isResting = adv.tavernResting === true;
        const isBoss   = adv.bossAssigned === true;
        const onMission = !!adv.mission && !adv.bossAssigned;

        if (isDead) {
          // Stay put, dim
          vis.tx = baseX;
          vis.ty = baseY;
        } else if (isResting && dz.tavernBuilt) {
          // Hang around the tavern
          if (vis.timer <= 0) {
            vis.tx = tavernCenter.x + randomBetween(-12, 12);
            vis.ty = tavernCenter.y + randomBetween(-8, 8);
            vis.timer = randomBetween(2, 4);
          }
        } else if (isBoss) {
          // March toward dungeon entrance
          vis.tx = entrance.x + randomBetween(-6, 6);
          vis.ty = entrance.y + randomBetween(-4, 4);
          vis.timer = 0.5;
        } else if (onMission) {
          // Walking into dungeon
          if (vis.timer <= 0) {
            const inDungeon = Math.random() > 0.4;
            vis.tx = inDungeon
              ? entrance.x + randomBetween(-8, 4)
              : entrance.x + randomBetween(-20, -8);
            vis.ty = entrance.y + randomBetween(-5, 5);
            vis.timer = randomBetween(1.5, 3.5);
          }
        } else {
          // Idle — mill around in dungeon zone
          if (vis.timer <= 0) {
            vis.tx = baseX + randomBetween(-8, 8);
            vis.ty = baseY + randomBetween(-8, 8);
            vis.timer = randomBetween(1.5, 4);
          }
        }

        moveToward(vis, onMission || isBoss ? 30 : 18, dt);

        const alpha = isDead ? 0.3 : 1;
        ctx.globalAlpha = alpha;
        drawDot(ctx, vis.x, vis.y, color, 6);
        ctx.globalAlpha = 1;

        // Class badge
        const classMeta = HERO_CLASS_META[cls];
        if (classMeta && !isDead) {
          ctx.font = "8px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(classMeta.emoji, vis.x, vis.y - 8);
        }

        // Status ring
        if (isBoss) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(vis.x, vis.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (onMission) {
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(vis.x, vis.y, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isResting) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(vis.x, vis.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }
  }

  function moveToward(vis, speed, dt) {
    const dx = vis.tx - vis.x;
    const dy = vis.ty - vis.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.5) return;
    const step = Math.min(speed * dt, d);
    vis.x += (dx / d) * step;
    vis.y += (dy / d) * step;
  }

  function drawDot(ctx, x, y, color, r) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, tl, tr, br, bl) {
    const r = typeof tl === "number" ? tl : 6;
    const rtr = tr ?? r; const rbr = br ?? r; const rbl = bl ?? r;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - rtr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rtr);
    ctx.lineTo(x + w, y + h - rbr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rbr, y + h);
    ctx.lineTo(x + rbl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rbl);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width  = rect.width  * DPR;
      canvas.height = rect.height * DPR;
      canvas.style.width  = rect.width  + "px";
      canvas.style.height = rect.height + "px";
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // ── Start animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Pan (mouse drag) ───────────────────────────────────────────────────────
  function onMouseDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, camX: camRef.current.x, camY: camRef.current.y };
  }

  function onMouseMove(e) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / camRef.current.z;
    const dy = (e.clientY - dragRef.current.startY) / camRef.current.z;
    camRef.current.x = dragRef.current.camX - dx;
    camRef.current.y = dragRef.current.camY - dy;
  }

  function onMouseUp() { dragRef.current = null; }

  // ── Zoom (wheel) ──────────────────────────────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    camRef.current.z = Math.min(3, Math.max(0.3, camRef.current.z * factor));
  }

  // ── Touch pan + pinch ─────────────────────────────────────────────────────
  const touchRef = useRef({});

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchRef.current = { type: "pan", x: e.touches[0].clientX, y: e.touches[0].clientY, camX: camRef.current.x, camY: camRef.current.y };
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchRef.current = { type: "pinch", startDist: d, startZ: camRef.current.z };
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const t = touchRef.current;
    if (!t) return;
    if (t.type === "pan" && e.touches.length === 1) {
      const dx = (e.touches[0].clientX - t.x) / camRef.current.z;
      const dy = (e.touches[0].clientY - t.y) / camRef.current.z;
      camRef.current.x = t.camX - dx;
      camRef.current.y = t.camY - dy;
    } else if (t.type === "pinch" && e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      camRef.current.z = Math.min(3, Math.max(0.3, t.startZ * (d / t.startDist)));
    }
  }

  function onTouchEnd() { touchRef.current = {}; }

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  function zoomIn()  { camRef.current.z = Math.min(3, camRef.current.z * 1.25); }
  function zoomOut() { camRef.current.z = Math.max(0.3, camRef.current.z * 0.8); }
  function resetCam() { camRef.current = { x: 0, y: 0, z: 1 }; }

  return (
    <div style={{ width: "100%", height: "calc(100dvh - 8rem)", position: "relative", overflow: "hidden", background: "var(--bg)" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", cursor: "grab", touchAction: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Controls */}
      <div style={{
        position: "absolute", bottom: "1rem", right: "1rem",
        display: "flex", flexDirection: "column", gap: "6px",
      }}>
        {[
          { label: "+", onClick: zoomIn },
          { label: "−", onClick: zoomOut },
          { label: "⌂", onClick: resetCam },
        ].map(btn => (
          <button key={btn.label} onClick={btn.onClick} style={{
            width: 36, height: 36, borderRadius: 8, border: "0.5px solid var(--border)",
            background: "var(--bg-elev)", color: "var(--text)",
            fontSize: "1rem", cursor: "pointer", fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{btn.label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", top: "0.75rem", left: "0.75rem",
        display: "flex", gap: "10px", flexWrap: "wrap",
        background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "6px 10px",
      }}>
        {[
          { color: COLORS.workerFarm, label: "Farm worker" },
          { color: COLORS.workerBarn, label: "Barn worker" },
          { color: COLORS.workerFish, label: "Fisher" },
          { color: COLORS.workerHero.fighter, label: "Fighter" },
          { color: COLORS.workerHero.mage,    label: "Mage" },
          { color: COLORS.workerHero.scavenger, label: "Scavenger" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}