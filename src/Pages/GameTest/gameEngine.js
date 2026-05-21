// src/Pages/InkRun/gameEngine.js
// Pure functions — no React, no side effects.

export const WORLD_H      = 720;   // viewport-height world units (fixed)
export const CHUNK_W      = 800;   // width of one terrain chunk
export const GROUND_Y     = WORLD_H - 80; // y of the ground line
export const RUNNER_R     = 14;
export const STROKE_COLORS = {
  black: { fill: "rgba(220,230,255,0.92)", kill: false, platform: true  },
  red:   { fill: "rgba(255,80,80,0.92)",   kill: true,  platform: false },
};

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
export function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ─── Terrain chunk generation ─────────────────────────────────────────────────
// Each chunk has: platforms, gaps (in the ground), enemies, spikes
// difficulty 0→1 scales with distance

export function generateChunk(chunkIndex, seed) {
  const rand       = seededRand(seed + chunkIndex * 997);
  const difficulty = Math.min(1, chunkIndex * 0.07);
  const offsetX    = chunkIndex * CHUNK_W;

  const platforms  = [];
  const gaps       = [];
  const enemies    = [];
  const spikes     = [];

  // ── Ground gaps ───────────────────────────────────────────────────────────
  // First chunk: no gaps, give the painter time to get their bearings
  if (chunkIndex > 0) {
    const numGaps = 1 + Math.floor(rand() * (1 + difficulty * 3));
    let cursor = 80;
    for (let i = 0; i < numGaps; i++) {
      const gapStart = cursor + 60 + rand() * (CHUNK_W / numGaps - 120);
      const gapW     = 60 + rand() * (80 + difficulty * 120);
      if (gapStart + gapW < CHUNK_W - 40) {
        gaps.push({ x: offsetX + gapStart, w: gapW });
      }
      cursor = gapStart + gapW + 40;
    }
  }

  // ── Floating platforms (painter can land on these even without painting) ──
  const numPlatforms = Math.floor(rand() * (1 + difficulty * 2));
  for (let i = 0; i < numPlatforms; i++) {
    platforms.push({
      id:  `chunk${chunkIndex}_plat${i}`,
      x:   offsetX + 100 + rand() * (CHUNK_W - 200),
      y:   GROUND_Y - 120 - rand() * 180,
      w:   60 + rand() * 80,
      h:   14,
    });
  }

  // ── Ground enemies (walkers) ──────────────────────────────────────────────
  if (chunkIndex > 0) {
    const numEnemies = Math.floor(rand() * (1 + difficulty * 3));
    for (let i = 0; i < numEnemies; i++) {
      const ex = offsetX + 120 + rand() * (CHUNK_W - 240);
      // Place on ground or a platform
      const onPlatform = platforms.length > 0 && rand() > 0.6;
      const plat       = onPlatform ? platforms[Math.floor(rand() * platforms.length)] : null;
      enemies.push({
        id:       `chunk${chunkIndex}_enemy${i}`,
        x:        plat ? plat.x + plat.w / 2 : ex,
        y:        plat ? plat.y - 16          : GROUND_Y - 16,
        vy:       0,
        type:     "walker",
        dir:      rand() > 0.5 ? 1 : -1,
        speed:    40 + rand() * 40 * difficulty,
        patrolMin: plat ? plat.x        : offsetX + 60,
        patrolMax: plat ? plat.x + plat.w : offsetX + CHUNK_W - 60,
        alive:    true,
        hitFlash: 0,
      });
    }

    // ── Flying enemies ────────────────────────────────────────────────────
    const numFlyers = Math.floor(rand() * difficulty * 2.5);
    for (let i = 0; i < numFlyers; i++) {
      enemies.push({
        id:       `chunk${chunkIndex}_flyer${i}`,
        x:        offsetX + 100 + rand() * (CHUNK_W - 200),
        y:        GROUND_Y - 180 - rand() * 160,
        vy:       0,
        type:     "flyer",
        dir:      rand() > 0.5 ? 1 : -1,
        speed:    55 + rand() * 50 * difficulty,
        patrolMin: offsetX + 40,
        patrolMax: offsetX + CHUNK_W - 40,
        bobOffset: rand() * Math.PI * 2,
        alive:    true,
        hitFlash: 0,
      });
    }
  }

  // ── Spike clusters ────────────────────────────────────────────────────────
  if (chunkIndex > 1) {
    const numSpikes = Math.floor(rand() * difficulty * 4);
    for (let i = 0; i < numSpikes; i++) {
      spikes.push({
        id: `chunk${chunkIndex}_spike${i}`,
        x:  offsetX + 80 + rand() * (CHUNK_W - 160),
        y:  GROUND_Y - 18,
        w:  16 + rand() * 20,
        h:  18,
      });
    }
  }

  return { chunkIndex, offsetX, platforms, gaps, enemies, spikes };
}

// ─── Physics helpers ──────────────────────────────────────────────────────────

// Returns true if the x position is over a gap
export function isOverGap(x, gaps) {
  return gaps.some(g => x + RUNNER_R > g.x && x - RUNNER_R < g.x + g.w);
}

// Returns the y of the surface under a point (ground or platform top)
// Returns null if over a gap with no platform underneath
export function surfaceUnder(x, y, gaps, platforms, strokes) {
  // Check painted platforms first (black strokes)
  let best = null;

  // Painted black strokes as platforms — find highest one below the runner
  for (const stroke of strokes) {
    if (stroke.color !== "black") continue;
    const sy = strokeYatX(stroke, x);
    if (sy !== null && sy >= y - 2 && (best === null || sy < best)) {
      best = sy;
    }
  }

  // Built-in platforms
  for (const p of platforms) {
    if (x + RUNNER_R * 0.5 > p.x && x - RUNNER_R * 0.5 < p.x + p.w) {
      const top = p.y;
      if (top >= y - 2 && (best === null || top < best)) best = top;
    }
  }

  // Ground — only if not over a gap
  if (!isOverGap(x, gaps)) {
    if (best === null || GROUND_Y < best) best = GROUND_Y;
  }

  return best; // null means falling into void
}

// ─── Stroke geometry ──────────────────────────────────────────────────────────
// A stroke is { id, color, points: [{x,y},...], worldX: number }
// worldX is the camera offset at time of drawing — points are in world coords

// Find the y value of a stroke at a given world x (for platform collision)
export function strokeYatX(stroke, wx) {
  const pts = stroke.points;
  if (!pts || pts.length < 2) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    if (wx >= minX - 4 && wx <= maxX + 4) {
      if (Math.abs(b.x - a.x) < 1) return (a.y + b.y) / 2;
      const t  = (wx - a.x) / (b.x - a.x);
      const sy = a.y + t * (b.y - a.y);
      // Only act as platform if relatively horizontal (within 40px vertical per 100px horizontal)
      const slope = Math.abs(b.y - a.y) / (Math.max(1, Math.abs(b.x - a.x)));
      if (slope < 0.7) return sy;
    }
  }
  return null;
}

// Check if a point (wx, wy) is close enough to a red stroke to be killed
export function touchesRedStroke(wx, wy, strokes, radius) {
  for (const stroke of strokes) {
    if (stroke.color !== "red") continue;
    const pts = stroke.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dist = pointSegmentDist(wx, wy, a.x, a.y, b.x, b.y);
      if (dist < radius + 5) return true;
    }
  }
  return false;
}

// Check if an enemy circle touches a red stroke
export function enemyTouchesRed(ex, ey, er, strokes) {
  return touchesRedStroke(ex, ey, strokes, er);
}

function pointSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ─── Enemy update ─────────────────────────────────────────────────────────────
export function updateEnemies(enemies, dt, t) {
  enemies.forEach(e => {
    if (!e.alive) return;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);

    if (e.type === "walker") {
      e.x += e.dir * e.speed * dt;
      if (e.x > e.patrolMax) { e.x = e.patrolMax; e.dir = -1; }
      if (e.x < e.patrolMin) { e.x = e.patrolMin; e.dir =  1; }
    } else if (e.type === "flyer") {
      e.x += e.dir * e.speed * dt;
      e.y  = e.y + Math.sin(t * 1.8 + e.bobOffset) * 0.4; // gentle bob
      if (e.x > e.patrolMax) { e.x = e.patrolMax; e.dir = -1; }
      if (e.x < e.patrolMin) { e.x = e.patrolMin; e.dir =  1; }
    }
  });
}