// BaseMapView.jsx — Overhead canvas map of the home base compound.
// Slot this into BaseView as the "overview" tab (or as the default landing view).
//
// Props:
//   snapshot      — same stateSnapshot BaseView already receives
//   worldState    — full worldState (for threat tier, night timer, etc.)
//   onAction(type, payload) — same action bus as BaseView's onHarvest
//   isNight       — boolean, driven by worldState day/night cycle
//   threatTier    — 0-4, drives zombie wave size + color
//
// Self-contained: owns its own rAF loop, local zombie sim for visual smoothness.
// Dispatches upward for real state changes (command survivor, repair turret, etc.).
// Never mutates props.

import React, { useRef, useEffect, useState, useCallback } from "react";

// ─── Layout constants ─────────────────────────────────────────────────────────
// The map renders a fixed-size "compound" in world units, then scales to canvas.
// World units are arbitrary — we scale everything to fit the canvas.

const W_WORLD = 1200;   // world width
const H_WORLD = 900;    // world height

// Building layout for the compound — mirrors engine_mapgen createHomeBaseMap
// but expressed in compact world-unit coords for the overhead view.
// These don't need to exactly match the engine coords — they're for display only.
const BUILDINGS = [
  { id: "hb_farmhouse",  label: "Farmhouse",  x: 480, y: 350, w: 200, h: 150, color: "rgba(120,90,55,0.9)",  icon: "🏠", zone: null },
  { id: "hb_workshop",   label: "Workshop",   x: 180, y: 200, w: 160, h: 120, color: "rgba(80,100,60,0.9)",  icon: "🏭", zone: "workshop" },
  { id: "hb_kitchen",    label: "Kitchen",    x: 820, y: 200, w: 160, h: 120, color: "rgba(100,80,55,0.9)",  icon: "🍳", zone: "kitchen" },
  { id: "hb_medical",    label: "Medical",    x: 820, y: 560, w: 160, h: 120, color: "rgba(60,110,100,0.9)", icon: "🏥", zone: "medical" },
  { id: "hb_garden",     label: "Garden",     x: 180, y: 560, w: 160, h: 120, color: "rgba(60,100,50,0.9)",  icon: "🌱", zone: "garden" },
];

// Perimeter wall segments (the base boundary zombies attack)
const WALL_PADDING = 80;
const WALL_X = WALL_PADDING;
const WALL_Y = WALL_PADDING;
const WALL_W = W_WORLD - WALL_PADDING * 2;
const WALL_H = H_WORLD - WALL_PADDING * 2;

// Where turrets are anchored per corner/side for display
const DEFAULT_TURRET_POSITIONS = [
  { x: WALL_X + 40,           y: WALL_Y + 40 },
  { x: WALL_X + WALL_W - 40,  y: WALL_Y + 40 },
  { x: WALL_X + 40,           y: WALL_Y + WALL_H - 40 },
  { x: WALL_X + WALL_W - 40,  y: WALL_Y + WALL_H - 40 },
  { x: WALL_X + WALL_W / 2,   y: WALL_Y + 10 },
  { x: WALL_X + WALL_W / 2,   y: WALL_Y + WALL_H - 10 },
  { x: WALL_X + 10,           y: WALL_Y + WALL_H / 2 },
  { x: WALL_X + WALL_W - 10,  y: WALL_Y + WALL_H / 2 },
];

// Workstation wander spots — where survivors drift when assigned
const WORKSTATION_SPOTS = {
  workshop:   { x: 260, y: 260 },
  kitchen:    { x: 900, y: 260 },
  medical:    { x: 900, y: 620 },
  garden:     { x: 260, y: 620 },
  guard_post: { x: 600, y: WALL_Y + 40 },
  builder:    { x: 600, y: 450 },
};
const CENTER = { x: W_WORLD / 2, y: H_WORLD / 2 };

// ─── Color palette ────────────────────────────────────────────────────────────
const COL = {
  ground_day:   "#0f1a0c",
  ground_night: "#060b06",
  wall_day:     "rgba(160,140,100,0.7)",
  wall_night:   "rgba(100,80,50,0.7)",
  wall_hp_high: "rgba(120,200,80,0.6)",
  wall_hp_low:  "rgba(220,60,40,0.6)",
  survivor:     "rgba(80,180,255,0.95)",
  survivor_glow:"rgba(80,180,255,0.15)",
  turret_ok:    "rgba(120,210,80,0.95)",
  turret_warn:  "rgba(255,180,40,0.95)",
  turret_dead:  "rgba(100,100,100,0.5)",
  zombie:       "rgba(200,30,30,0.92)",
  zombie_brute: "rgba(240,80,20,0.95)",
  bullet:       "rgba(255,230,80,0.9)",
  garden:       "rgba(60,160,60,0.5)",
  garden_ready: "rgba(120,220,60,0.7)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Seeded random for stable per-survivor wandering offsets
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Spawn positions around the perimeter edge (outside walls)
function spawnOnEdge(t_frac) {
  // Distribute evenly around perimeter
  const perim = 2 * (W_WORLD + H_WORLD);
  const pos = t_frac * perim;
  if (pos < W_WORLD) return { x: pos, y: 0 };
  if (pos < W_WORLD + H_WORLD) return { x: W_WORLD, y: pos - W_WORLD };
  if (pos < 2 * W_WORLD + H_WORLD) return { x: W_WORLD - (pos - W_WORLD - H_WORLD), y: H_WORLD };
  return { x: 0, y: H_WORLD - (pos - 2 * W_WORLD - H_WORLD) };
}

// ─── Local visual sim for zombies ─────────────────────────────────────────────
// These are NOT the engine zombies — they're purely visual entities that mimic
// wave behavior. Real damage/defense calc happens in the engine.

function makeVisualZombie(id, threatTier = 0) {
  const frac = Math.random();
  const sp = spawnOnEdge(frac);
  const isBrute = Math.random() < (0.08 + threatTier * 0.04);
  return {
    id,
    x: sp.x, y: sp.y,
    hp: isBrute ? 3 : 1, maxHp: isBrute ? 3 : 1,
    speed: isBrute ? 55 : 80 + Math.random() * 40,
    radius: isBrute ? 10 : 7,
    isBrute,
    dead: false,
    targetX: CENTER.x + (Math.random() - 0.5) * 300,
    targetY: CENTER.y + (Math.random() - 0.5) * 300,
    _wobble: Math.random() * Math.PI * 2,
    _staggerX: 0, _staggerY: 0,
  };
}

// ─── Local survivor positions ─────────────────────────────────────────────────
// Survivors from the roster are mapped to stable world positions.
// They wander gently around their workstation, or the farmhouse if unassigned.

function buildSurvivorPositions(survivors, tick) {
  return (survivors ?? []).map((sv, i) => {
    const rand = seededRand(sv.id ? sv.id.charCodeAt(0) * 7 + i * 31 : i * 137);
    const ws = sv.workstation ?? null;
    const anchor = ws && WORKSTATION_SPOTS[ws] ? WORKSTATION_SPOTS[ws] : CENTER;
    // Gentle wander offset using time + per-survivor phase
    const phase = rand() * Math.PI * 2;
    const wanderR = 40 + rand() * 30;
    const wx = anchor.x + Math.cos(tick * 0.3 + phase) * wanderR * 0.6;
    const wy = anchor.y + Math.sin(tick * 0.5 + phase) * wanderR * 0.4;
    return { ...sv, _vx: wx, _vy: wy };
  });
}

// ─── Bullet sparks (visual only) ─────────────────────────────────────────────
let _bulletId = 0;
function makeBullet(fx, fy, tx, ty) {
  return { id: _bulletId++, x: fx, y: fy, tx, ty, age: 0, ttl: 0.18 };
}

// ─── Garden plot layout ───────────────────────────────────────────────────────
function getGardenPlotRects(gardenPlotCount) {
  const plots = [];
  const origin = BUILDINGS.find(b => b.id === "hb_garden");
  if (!origin) return plots;
  const cols = Math.min(gardenPlotCount, 3);
  const rows = Math.ceil(gardenPlotCount / 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= gardenPlotCount) break;
      plots.push({
        x: origin.x + origin.w + 10 + c * 34,
        y: origin.y + r * 30,
        w: 28, h: 24,
      });
    }
  }
  return plots;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BaseMapView({
  snapshot,
  worldState,
  onAction,
  onZoneChange,
}) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null); // latest props captured for rAF closure
  const lastTimeRef = useRef(null);
  const tickRef     = useRef(0);

  // Visual-only sim state
  const zombiesRef  = useRef([]);
  const bulletsRef  = useRef([]);
  const flashRef    = useRef(0);        // wall hit flash intensity
  const nextZIdRef  = useRef(1000);
  const waveTimerRef = useRef(0);       // seconds until next zombie spawns
  const waveActiveRef= useRef(false);

  // Interaction
  const [hovered, setHovered]       = useState(null);  // { type, id, x, y }
  const [selected, setSelected]     = useState(null);  // same shape
  const [tooltip, setTooltip]       = useState(null);  // { label, items, x, y }
  const canvasBoundsRef = useRef(null);

  // Derive key values from props
  const isNight    = snapshot?.isNight ?? worldState?.levels?.[0]?.isNight ?? false;
  const threatTier = worldState?.levels?.[0]?.threatTier ?? 0;
  const baseHp     = worldState?.levels?.[0]?.baseHp ?? 100;
  const survivors  = snapshot?.survivors ?? [];
  const turrets    = snapshot?.turrets   ?? [];
  const crops      = snapshot?.crops     ?? [];
  const gardenPlotCount = snapshot?.gardenPlots ?? 2;

  // ── Keep stateRef current so rAF doesn't capture stale closures ──────────
  useEffect(() => {
    stateRef.current = {
      isNight, threatTier, baseHp,
      survivors, turrets, crops, gardenPlotCount,
    };
  });

  // ── Wave management: spawn visual zombies at night ────────────────────────
  useEffect(() => {
    waveActiveRef.current = isNight;
    if (!isNight) {
      // Dawn: clear remaining visual zombies gracefully
      zombiesRef.current = zombiesRef.current.map(z => ({ ...z, dead: true }));
    }
  }, [isNight]);

  // ── Main rAF loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId;
    let running = true;

    function frame(now) {
      if (!running) return;
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const dt = Math.min(dtMs / 1000, 0.05); // cap at 50ms to avoid spiral
      tickRef.current += dt;

      const s = stateRef.current ?? {};
      const W = canvas.width  / (window.devicePixelRatio || 1);
      const H = canvas.height / (window.devicePixelRatio || 1);

      // Scale world → canvas
      const scaleX = W / W_WORLD;
      const scaleY = H / H_WORLD;
      const scale  = Math.min(scaleX, scaleY) * 0.92; // slight padding
      const offX   = (W - W_WORLD * scale) / 2;
      const offY   = (H - H_WORLD * scale) / 2;

      // ── Update visual zombie sim ──────────────────────────────────────────
      const zs = zombiesRef.current;
      const bs = bulletsRef.current;

      // Spawn new zombies at night
      if (waveActiveRef.current) {
        waveTimerRef.current -= dt;
        if (waveTimerRef.current <= 0) {
          const tier = s.threatTier ?? 0;
          const rate = Math.max(0.4, 2.5 - tier * 0.4); // faster at higher tiers
          const burst = 1 + Math.floor(tier / 2);
          for (let i = 0; i < burst; i++) {
            zs.push(makeVisualZombie(nextZIdRef.current++, tier));
          }
          // Cap total visual zombies to avoid perf issues
          while (zs.length > 60) zs.shift();
          waveTimerRef.current = rate;
        }
      }

      // Move zombies toward compound center, or toward nearest turret
      const aliveTurretPositions = (s.turrets ?? [])
        .filter(t => !t.destroyed && (t.hp ?? 0) > 0)
        .map((t, i) => ({
          x: DEFAULT_TURRET_POSITIONS[i % DEFAULT_TURRET_POSITIONS.length].x,
          y: DEFAULT_TURRET_POSITIONS[i % DEFAULT_TURRET_POSITIONS.length].y,
          hp: t.hp ?? 150, maxHp: t.maxHp ?? 150,
        }));

      for (let i = zs.length - 1; i >= 0; i--) {
        const z = zs[i];
        if (z.dead) { zs.splice(i, 1); continue; }

        // Slight wobble
        z._wobble += dt * 2.1;
        const wobble = Math.sin(z._wobble) * 6;

        // Target: drift toward compound center + wobble
        const tx = z.targetX + Math.cos(z._wobble * 0.7) * wobble;
        const ty = z.targetY + Math.sin(z._wobble * 0.3) * wobble;
        const d  = dist(z.x, z.y, tx, ty);
        if (d > 4) {
          z.x += ((tx - z.x) / d) * z.speed * dt;
          z.y += ((ty - z.y) / d) * z.speed * dt;
        }

        // If zombie reaches inside wall boundary, "attack" base
        const inWall = z.x > WALL_X + 10 && z.x < WALL_X + WALL_W - 10
                    && z.y > WALL_Y + 10 && z.y < WALL_Y + WALL_H - 10;
        if (inWall) {
          flashRef.current = Math.min(1, flashRef.current + 0.15);
          z.dead = true; // remove — engine handles the real damage
          continue;
        }
      }

      // Turrets shoot at nearest zombie (visual only — bullets)
      if (waveActiveRef.current) {
        for (let ti = 0; ti < aliveTurretPositions.length; ti++) {
          const tp = aliveTurretPositions[ti];
          // Find nearest zombie within range
          let nearest = null, nearestDist = Infinity;
          for (const z of zs) {
            if (z.dead) continue;
            const dz = dist(tp.x, tp.y, z.x, z.y);
            if (dz < 300 && dz < nearestDist) { nearest = z; nearestDist = dz; }
          }
          if (!nearest) continue;
          // Shoot once per ~0.7s (not per frame — use a timer on the turret pos)
          if (!tp._shootTimer) tp._shootTimer = Math.random() * 0.7;
          tp._shootTimer -= dt;
          if (tp._shootTimer <= 0) {
            tp._shootTimer = 0.65 + Math.random() * 0.3;
            bs.push(makeBullet(tp.x, tp.y, nearest.x, nearest.y));
            nearest.hp -= 1;
            if (nearest.hp <= 0) nearest.dead = true;
          }
        }
      }

      // Move + age bullets
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        b.age += dt;
        if (b.age >= b.ttl) { bs.splice(i, 1); continue; }
        const p = b.age / b.ttl;
        b.x = lerp(b.x, b.tx, p * 0.9);
        b.y = lerp(b.y, b.ty, p * 0.9);
      }

      // Decay flash
      flashRef.current = Math.max(0, flashRef.current - dt * 1.8);

      // ── Draw ──────────────────────────────────────────────────────────────
      const ctx = canvas.getContext("2d");
      ctx.save();

      // DPR scale
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      // World transform
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = s.isNight ? COL.ground_night : COL.ground_day;
      ctx.fillRect(0, 0, W_WORLD, H_WORLD);

      // Ground texture — subtle grid
      ctx.save();
      ctx.strokeStyle = s.isNight ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5 / scale;
      const gridSize = 80;
      for (let gx = 0; gx <= W_WORLD; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H_WORLD); ctx.stroke();
      }
      for (let gy = 0; gy <= H_WORLD; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W_WORLD, gy); ctx.stroke();
      }
      ctx.restore();

      // ── Perimeter wall ────────────────────────────────────────────────────
      const wallHpFrac = clamp((s.baseHp ?? 100) / 100, 0, 1);
      const wallColor = wallHpFrac > 0.5
        ? COL.wall_day
        : wallHpFrac > 0.25
        ? "rgba(220,150,40,0.7)"
        : "rgba(220,50,40,0.7)";

      // Wall flash from zombie hit
      const flashAlpha = flashRef.current;
      ctx.save();
      ctx.strokeStyle = flashAlpha > 0
        ? `rgba(255,80,40,${0.4 + flashAlpha * 0.5})`
        : (s.isNight ? COL.wall_night : wallColor);
      ctx.lineWidth = 6 / scale;
      ctx.setLineDash([12, 6]);
      ctx.strokeRect(WALL_X, WALL_Y, WALL_W, WALL_H);
      ctx.setLineDash([]);
      ctx.restore();

      // Wall HP bar (top edge)
      {
        const bw = WALL_W * wallHpFrac;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(WALL_X, WALL_Y - 14, WALL_W, 5);
        ctx.fillStyle = wallHpFrac > 0.5 ? COL.wall_hp_high : wallHpFrac > 0.25 ? "rgba(255,180,40,0.7)" : COL.wall_hp_low;
        ctx.fillRect(WALL_X, WALL_Y - 14, bw, 5);
      }

      // ── Garden plots ──────────────────────────────────────────────────────
      const gardenPlotRects = getGardenPlotRects(s.gardenPlotCount ?? 2);
      for (let pi = 0; pi < gardenPlotRects.length; pi++) {
        const gp = gardenPlotRects[pi];
        const crop = (s.crops ?? []).find(c => c.plotId && pi === parseInt(c.plotId.replace(/\D/g, '')) % gardenPlotRects.length);
        const isReady = crop?.stage === "ready";
        const growFrac = crop ? (crop.growTimer ?? 0) / (crop.growTime ?? 60) : 0;
        ctx.fillStyle = isReady ? COL.garden_ready : (growFrac > 0 ? "rgba(80,130,50,0.6)" : COL.garden);
        ctx.fillRect(gp.x, gp.y, gp.w, gp.h);
        ctx.strokeStyle = isReady ? "rgba(140,220,60,0.7)" : "rgba(60,120,40,0.4)";
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(gp.x, gp.y, gp.w, gp.h);
        if (isReady) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `${10 / scale}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🌽", gp.x + gp.w / 2, gp.y + gp.h / 2 + 3 / scale);
        }
      }

      // ── Buildings ─────────────────────────────────────────────────────────
      for (const b of BUILDINGS) {
        const isSelected = selected?.id === b.id;
        const isHovered  = hovered?.id === b.id;

        // Shadow
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);
        ctx.restore();

        // Body
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Highlight on hover/select
        if (isSelected || isHovered) {
          ctx.fillStyle = isSelected
            ? "rgba(255,200,80,0.18)"
            : "rgba(255,255,255,0.06)";
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Border
        ctx.strokeStyle = isSelected
          ? "rgba(255,200,80,0.9)"
          : (isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)");
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) / scale;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Label + icon
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font      = `bold ${11 / scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(b.icon + " " + b.label, b.x + b.w / 2, b.y + b.h / 2 - 4 / scale);

        // Worker count badge
        const workerCount = (s.survivors ?? []).filter(sv =>
          sv.workstation && b.zone && sv.workstation.startsWith(b.zone.split("_")[0])
        ).length;
        if (workerCount > 0) {
          ctx.fillStyle = "rgba(80,180,255,0.15)";
          ctx.strokeStyle = "rgba(80,180,255,0.4)";
          ctx.lineWidth = 1 / scale;
          const bx = b.x + b.w - 18, by = b.y + 6;
          ctx.beginPath();
          ctx.arc(bx, by, 9, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(120,200,255,0.9)";
          ctx.font = `bold ${9 / scale}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(workerCount, bx, by + 3 / scale);
        }
      }

      // ── Turrets ───────────────────────────────────────────────────────────
      for (let ti = 0; ti < Math.min((s.turrets ?? []).length, DEFAULT_TURRET_POSITIONS.length); ti++) {
        const t  = s.turrets[ti];
        const tp = DEFAULT_TURRET_POSITIONS[ti];
        const hpFrac = (t.hp ?? 0) / (t.maxHp ?? 150);
        const tColor = t.destroyed || hpFrac <= 0
          ? COL.turret_dead
          : hpFrac > 0.5 ? COL.turret_ok : COL.turret_warn;

        // Range ring (faint, night only)
        if (!t.destroyed && hpFrac > 0 && s.isNight) {
          ctx.save();
          ctx.strokeStyle = tColor.replace("0.95", "0.08");
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([4, 8]);
          ctx.beginPath(); ctx.arc(tp.x, tp.y, 300, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Base circle
        ctx.save();
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = t.destroyed ? "rgba(40,30,30,0.7)" : "rgba(20,30,20,0.85)";
        ctx.fill();
        ctx.strokeStyle = tColor;
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
        ctx.restore();

        // Icon
        ctx.fillStyle = tColor;
        ctx.font = `${10 / scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(t.destroyed ? "✕" : "⊕", tp.x, tp.y + 3.5 / scale);

        // HP bar
        if (!t.destroyed) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(tp.x - 12, tp.y + 12, 24, 3);
          ctx.fillStyle = tColor;
          ctx.fillRect(tp.x - 12, tp.y + 12, 24 * hpFrac, 3);
        }
      }

      // ── Bullets (turret fire) ─────────────────────────────────────────────
      for (const b of bs) {
        const p = b.age / b.ttl;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = COL.bullet;
        ctx.fill();
        // Tracer tail
        ctx.strokeStyle = "rgba(255,220,80,0.4)";
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(lerp(b.x, b.tx, -0.1), lerp(b.y, b.ty, -0.1));
        ctx.stroke();
        ctx.restore();
      }

      // ── Zombies ───────────────────────────────────────────────────────────
      for (const z of zs) {
        if (z.dead) continue;
        ctx.save();
        ctx.globalAlpha = 0.9;

        const pulse = 0.85 + 0.15 * Math.sin(tickRef.current * 4 + z._wobble);
        if (z.isBrute) {
          // Brute: larger, darker red, double ring
          ctx.beginPath(); ctx.arc(z.x, z.y, z.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(240,80,20,0.25)"; ctx.lineWidth = 2 / scale; ctx.stroke();
          ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,50,10,${pulse})`;
          ctx.fill();
          ctx.strokeStyle = COL.zombie_brute; ctx.lineWidth = 1.5 / scale; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,20,20,${pulse * 0.9})`;
          ctx.fill();
          ctx.strokeStyle = COL.zombie; ctx.lineWidth = 1 / scale; ctx.stroke();
        }
        ctx.restore();
      }

      // ── Survivors ────────────────────────────────────────────────────────
      const tick = tickRef.current;
      const svPositions = buildSurvivorPositions(s.survivors ?? [], tick);
      for (const sv of svPositions) {
        const isSelected = selected?.id === sv.id;
        const hpFrac = (sv.hp ?? 80) / (sv.maxHp ?? 80);

        // Glow
        if (isSelected) {
          ctx.save();
          ctx.beginPath(); ctx.arc(sv._vx, sv._vy, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(80,180,255,0.15)"; ctx.fill();
          ctx.restore();
        }

        // Body
        ctx.save();
        ctx.beginPath(); ctx.arc(sv._vx, sv._vy, 8, 0, Math.PI * 2);
        ctx.fillStyle = hpFrac < 0.3 ? "rgba(255,80,60,0.9)" : COL.survivor;
        ctx.fill();
        ctx.strokeStyle = isSelected ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.3)";
        ctx.lineWidth = (isSelected ? 2 : 1) / scale;
        ctx.stroke();
        ctx.restore();

        // Name label
        ctx.fillStyle = isSelected ? "rgba(255,200,80,0.95)" : "rgba(255,255,255,0.55)";
        ctx.font = `${9 / scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(sv.name ?? "?", sv._vx, sv._vy - 12 / scale);

        // HP bar
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(sv._vx - 12, sv._vy + 10, 24, 2.5);
        ctx.fillStyle = hpFrac > 0.5 ? "rgba(80,200,80,0.8)" : "rgba(255,120,40,0.8)";
        ctx.fillRect(sv._vx - 12, sv._vy + 10, 24 * hpFrac, 2.5);

        // Workstation badge
        if (sv.workstation) {
          ctx.fillStyle = "rgba(80,180,255,0.12)";
          ctx.strokeStyle = "rgba(80,180,255,0.3)";
          ctx.lineWidth = 0.8 / scale;
          ctx.beginPath(); ctx.arc(sv._vx + 8, sv._vy - 8, 5, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }

      // ── Night overlay vignette ────────────────────────────────────────────
      if (s.isNight) {
        const grad = ctx.createRadialGradient(
          W_WORLD / 2, H_WORLD / 2, H_WORLD * 0.2,
          W_WORLD / 2, H_WORLD / 2, H_WORLD * 0.9,
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W_WORLD, H_WORLD);
      }

      // ── Wall hit flash overlay ────────────────────────────────────────────
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(200,40,0,${flashRef.current * 0.18})`;
        ctx.fillRect(0, 0, W_WORLD, H_WORLD);
      }

      // ── Day/Night indicator ───────────────────────────────────────────────
      {
        const label = s.isNight ? "🌙 Night — Defend!" : "☀️ Day — Gather";
        const tier = s.threatTier ?? 0;
        const tierColors = ["rgba(120,200,80,0.8)", "rgba(200,180,60,0.8)", "rgba(220,130,40,0.8)", "rgba(200,60,40,0.8)", "rgba(180,40,60,0.8)"];
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect(WALL_X, WALL_Y - 38, 200, 22, 6);
        ctx.fill();
        ctx.fillStyle = s.isNight ? "rgba(180,200,255,0.9)" : "rgba(255,230,120,0.9)";
        ctx.font = `${11 / scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(label, WALL_X + 8, WALL_Y - 22);
        if (tier > 0) {
          ctx.fillStyle = tierColors[Math.min(tier, 4)];
          ctx.textAlign = "right";
          ctx.fillText(`Threat ${tier}`, WALL_X + 200 - 8, WALL_Y - 22);
        }
      }

      ctx.restore(); // undo world transform
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, []); // run once — stateRef.current keeps data live

  // ── Canvas resize ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      canvasBoundsRef.current = canvas.getBoundingClientRect();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── Hit testing: canvas coords → world coords → entity ────────────────────
  function hitTest(clientX, clientY) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const px = (clientX - rect.left);
    const py = (clientY - rect.top);

    const W = rect.width;
    const H = rect.height;
    const scaleX = W / W_WORLD;
    const scaleY = H / H_WORLD;
    const scale  = Math.min(scaleX, scaleY) * 0.92;
    const offX   = (W - W_WORLD * scale) / 2;
    const offY   = (H - H_WORLD * scale) / 2;

    const wx = (px - offX) / scale;
    const wy = (py - offY) / scale;

    // Check survivors (largest hit area)
    const tick = tickRef.current;
    const svPositions = buildSurvivorPositions(stateRef.current?.survivors ?? [], tick);
    for (const sv of svPositions) {
      if (dist(wx, wy, sv._vx, sv._vy) < 14) {
        return { type: "survivor", id: sv.id, data: sv, wx, wy };
      }
    }

    // Check buildings
    for (const b of BUILDINGS) {
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
        return { type: "building", id: b.id, data: b, wx, wy };
      }
    }

    // Check turrets
    const turretsArr = stateRef.current?.turrets ?? [];
    for (let ti = 0; ti < Math.min(turretsArr.length, DEFAULT_TURRET_POSITIONS.length); ti++) {
      const tp = DEFAULT_TURRET_POSITIONS[ti];
      if (dist(wx, wy, tp.x, tp.y) < 16) {
        return { type: "turret", id: turretsArr[ti].id, data: turretsArr[ti], posIndex: ti, wx, wy };
      }
    }

    return null;
  }

  function handleMouseMove(e) {
    const hit = hitTest(e.clientX, e.clientY);
    setHovered(hit);
  }

  function handleClick(e) {
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) { setSelected(null); setTooltip(null); return; }

    setSelected(hit);

    // Build tooltip content
    if (hit.type === "survivor") {
      const sv = hit.data;
      const hpFrac = (sv.hp ?? 80) / (sv.maxHp ?? 80);
      setTooltip({
        title: sv.name,
        subtitle: sv.role ?? "Survivor",
        items: [
          { label: "HP",       value: `${Math.round(sv.hp ?? 80)} / ${sv.maxHp ?? 80}`, color: hpFrac > 0.5 ? "rgba(120,220,80,0.9)" : "rgba(255,120,60,0.9)" },
          { label: "Morale",   value: `${sv.morale ?? 100}%` },
          { label: "Station",  value: sv.workstation?.replace("_", " ") ?? "unassigned" },
          { label: "Traits",   value: (sv.traits ?? []).join(", ") || "none" },
        ],
        actions: [
          { label: "📋 Assign Station", action: () => onAction?.("reassign", { survivorId: sv.id }) },
          { label: "💊 Heal",           action: () => onAction?.("heal", { survivorId: sv.id }) },
          { label: "🗡 Send to Fight",  action: () => onAction?.("command", { survivorId: sv.id, command: "fight" }) },
        ],
        wx: hit.wx, wy: hit.wy,
      });
    } else if (hit.type === "building") {
      const b = hit.data;
      setTooltip({
        title: b.label,
        subtitle: b.zone ? `Zone: ${b.zone}` : "Compound structure",
        items: [],
        actions: b.zone ? [
          { label: `📂 Open ${b.label}`, action: () => { setTooltip(null); setSelected(null); onZoneChange?.(b.zone); } },
        ] : [],
        wx: hit.wx, wy: hit.wy,
      });
    } else if (hit.type === "turret") {
      const t = hit.data;
      const hpFrac = (t.hp ?? 150) / (t.maxHp ?? 150);
      setTooltip({
        title: t.destroyed ? "Turret (destroyed)" : "Turret",
        subtitle: t.destroyed ? "Needs repair" : `HP: ${Math.round(t.hp ?? 0)} / ${t.maxHp ?? 150}`,
        items: [
          { label: "Status", value: t.destroyed ? "💀 destroyed" : hpFrac > 0.5 ? "✅ operational" : "⚠ damaged" },
        ],
        actions: !t.destroyed ? [
          { label: "🔧 Repair (2 scrap)", action: () => { onAction?.("repair_turret", { turretId: t.id }); setTooltip(null); } },
        ] : [],
        wx: hit.wx, wy: hit.wy,
      });
    }
  }

  // ── Tooltip panel position (converted back to screen coords) ──────────────
  function tooltipScreenPos() {
    if (!tooltip) return { left: 0, top: 0 };
    const canvas = canvasRef.current;
    if (!canvas) return { left: 0, top: 0 };
    const rect  = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const scale = Math.min(W / W_WORLD, H / H_WORLD) * 0.92;
    const offX  = (W - W_WORLD * scale) / 2;
    const offY  = (H - H_WORLD * scale) / 2;
    const sx = offX + tooltip.wx * scale;
    const sy = offY + tooltip.wy * scale;
    // Keep within canvas
    const panelW = 220, panelH = 200;
    return {
      left: clamp(sx + 16, 8, W - panelW - 8),
      top:  clamp(sy - 20, 8, H - panelH - 8),
    };
  }

  const tPos = tooltipScreenPos();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#060a06", overflow: "hidden" }}>
      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", cursor: hovered ? "pointer" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
      />

      {/* ── Day/Night pill (React overlay — more readable than canvas text) ── */}
      <div style={{
        position:   "absolute",
        top:        12,
        left:       "50%",
        transform:  "translateX(-50%)",
        display:    "flex",
        alignItems: "center",
        gap:        8,
        padding:    "5px 14px",
        borderRadius: 20,
        background: isNight ? "rgba(20,20,60,0.8)" : "rgba(30,40,10,0.8)",
        border:     `1px solid ${isNight ? "rgba(100,120,255,0.3)" : "rgba(150,200,60,0.3)"}`,
        backdropFilter: "blur(4px)",
        fontSize:   11,
        color:      isNight ? "rgba(160,180,255,0.9)" : "rgba(220,240,120,0.9)",
        letterSpacing: "0.06em",
        pointerEvents: "none",
      }}>
        <span>{isNight ? "🌙" : "☀️"}</span>
        <span>{isNight ? "NIGHT — DEFEND" : "DAY — IDLE"}</span>
        {threatTier > 0 && (
          <>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ color: ["rgba(120,200,80,0.9)","rgba(200,180,60,0.9)","rgba(220,130,40,0.9)","rgba(200,60,40,0.9)","rgba(180,40,60,0.9)"][Math.min(threatTier,4)] }}>
              THREAT {threatTier}
            </span>
          </>
        )}
      </div>

      {/* ── Base HP pill ── */}
      <div style={{
        position: "absolute", top: 12, right: 12,
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 16,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${baseHp > 50 ? "rgba(80,180,80,0.3)" : "rgba(220,60,40,0.3)"}`,
        backdropFilter: "blur(4px)", fontSize: 11,
        color: baseHp > 50 ? "rgba(120,220,80,0.9)" : "rgba(255,100,60,0.9)",
        letterSpacing: "0.05em",
        pointerEvents: "none",
      }}>
        <span>🛡</span>
        <span>Walls {Math.round(baseHp)}%</span>
      </div>

      {/* ── Survivor count pill ── */}
      <div style={{
        position: "absolute", top: 12, left: 12,
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 16,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(80,180,255,0.2)",
        backdropFilter: "blur(4px)", fontSize: 11,
        color: "rgba(120,200,255,0.9)", letterSpacing: "0.05em",
        pointerEvents: "none",
      }}>
        <span>👤</span>
        <span>{survivors.length} survivor{survivors.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Hint text ── */}
      <div style={{
        position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em",
        pointerEvents: "none",
      }}>
        click survivors, buildings, or turrets to inspect
      </div>

      {/* ── Tooltip panel ── */}
      {tooltip && (
        <div style={{
          position:   "absolute",
          left:       tPos.left,
          top:        tPos.top,
          width:      220,
          background: "rgba(8,12,10,0.95)",
          border:     "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding:    "14px 16px",
          display:    "flex",
          flexDirection: "column",
          gap:        8,
          backdropFilter: "blur(8px)",
          boxShadow:  "0 8px 32px rgba(0,0,0,0.6)",
          zIndex:     20,
          fontSize:   12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{tooltip.title}</div>
              {tooltip.subtitle && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, letterSpacing: "0.05em" }}>{tooltip.subtitle}</div>
              )}
            </div>
            <button
              onClick={() => { setTooltip(null); setSelected(null); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Stats */}
          {tooltip.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tooltip.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{item.label}</span>
                  <span style={{ color: item.color ?? "rgba(255,255,255,0.7)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {tooltip.actions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
              {tooltip.actions.map((act, i) => (
                <button
                  key={i}
                  onClick={act.action}
                  style={{
                    padding:    "7px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border:     "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 7,
                    color:      "rgba(255,255,255,0.75)",
                    fontSize:   11,
                    cursor:     "pointer",
                    textAlign:  "left",
                    letterSpacing: "0.02em",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,200,80,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}