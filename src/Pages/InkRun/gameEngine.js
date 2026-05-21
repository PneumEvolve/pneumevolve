// src/Pages/InkRun/gameEngine.js
// Pure functions — no React, no side effects.

export const WORLD_H      = 720;   // viewport-height world units (fixed)
export const CHUNK_W      = 800;   // width of one terrain chunk
export const GROUND_Y     = WORLD_H - 80; // y of the ground line
export const RUNNER_R     = 14;
export const WALL_GRACE_S = 10;    // seconds before the death wall starts moving
// Max jump height: v²/2g = 420²/(2*900) ≈ 98px. Walls taller than this are unjumpable.
export const INK_TOKEN_R  = 12;  // collision/render radius for ink refill tokens
export const STROKE_COLORS = {
  black:  { fill: "rgba(220,230,255,0.92)", kill: false, platform: true,  speed: false, bounce: false },
  speed:  { fill: "rgba(80,220,255,0.92)",  kill: false, platform: true,  speed: true,  bounce: false },
  bounce: { fill: "rgba(80,255,160,0.92)",  kill: false, platform: true,  speed: false, bounce: true  },
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
  const walls      = [];
  const inkTokens  = [];

  // ── Ground gaps ───────────────────────────────────────────────────────────
  // Chunk 0: no gaps — give players time to orient.
  // Chunk 1: one mandatory "painter-required" gap (too wide to jump).
  // Chunk 2+: 1–2 big gaps plus possible bonus smaller gaps.
  // Jump distance at MOVE_SPEED 220 & JUMP_VY 420, GRAVITY 900:
  //   hangtime = 2*420/900 ≈ 0.93s → max range ≈ 220*0.93 ≈ 205px.
  //   So gaps > ~180px require painter help.
  const MIN_PAINTER_GAP = 190; // definitely requires bridging
  const MAX_GAP         = 260 + difficulty * 80; // grows with difficulty

  if (chunkIndex === 1) {
    // One guaranteed painter-required gap, placed in the middle third
    const gapStart = 220 + rand() * 160;
    const gapW     = MIN_PAINTER_GAP + rand() * (MAX_GAP - MIN_PAINTER_GAP);
    gaps.push({ x: offsetX + gapStart, w: gapW });
  } else if (chunkIndex > 1) {
    // Always one big mandatory gap
    let cursor = 80;
    const gapStart = cursor + 80 + rand() * 120;
    const gapW     = MIN_PAINTER_GAP + rand() * (MAX_GAP - MIN_PAINTER_GAP);
    if (gapStart + gapW < CHUNK_W - 60) {
      gaps.push({ x: offsetX + gapStart, w: gapW });
      cursor = gapStart + gapW + 80;
    }
    // Possibly a second gap at higher difficulties
    if (difficulty > 0.3 && rand() > 0.4) {
      const g2Start = cursor + 60 + rand() * 100;
      const g2W     = 120 + rand() * (MIN_PAINTER_GAP + difficulty * 60);
      if (g2Start + g2W < CHUNK_W - 40) {
        gaps.push({ x: offsetX + g2Start, w: g2W });
      }
    }
  }

  // ── Floating platforms ────────────────────────────────────────────────────
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

  // ── Terrain walls (too tall to jump over) ─────────────────────────────────
  // Start appearing from chunk 2. Painter must draw a ramp up/over, or the
  // runner must find an alternate route via painted bridges.
  if (chunkIndex >= 2 && rand() < 0.35 + difficulty * 0.3) {
    // Place wall clear of gaps
    const wx = offsetX + 300 + rand() * 300;
    const ww = 28 + rand() * 20; // 28–48px wide
    // Confirm it's not inside a gap
    const blocked = gaps.some(g => wx + ww > g.x - 20 && wx < g.x + g.w + 20);
    if (!blocked) {
      walls.push({
        id: `chunk${chunkIndex}_wall${0}`,
        x:  wx,
        y:  GROUND_Y - WALL_H,
        w:  ww,
        h:  WALL_H,
      });
    }
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
        // Collision box only covers the top 8px (spike tips) — not the full base
        hitH: 8,
      });
    }
  }

  // ── Ink refill tokens ─────────────────────────────────────────────────────
  // Appear every ~2 chunks. Placed at a random height so the painter must
  // draw a ramp to let the runner collect them.
  if (chunkIndex > 0 && rand() > 0.45) {
    const tx = offsetX + 200 + rand() * (CHUNK_W - 400);
    const ty = GROUND_Y - 90 - rand() * 180; // 90–270px above ground
    // Don't place over a gap
    const overGap = gaps.some(g => tx > g.x - 20 && tx < g.x + g.w + 20);
    if (!overGap) {
      inkTokens.push({
        id: `chunk${chunkIndex}_ink0`,
        x: tx,
        y: ty,
        collected: false,
      });
    }
  }

  return { chunkIndex, offsetX, platforms, gaps, enemies, spikes, walls, inkTokens };
}

// ─── Physics helpers ──────────────────────────────────────────────────────────

// Returns true if the x position is over a gap
// Use center-based check so runner doesn't fall before visually reaching the edge
export function isOverGap(x, gaps) {
  return gaps.some(g => x > g.x && x < g.x + g.w);
}

// Returns the y of the surface under a point (ground or platform top)
// Returns null if over a gap with no platform underneath
export function surfaceUnder(x, y, gaps, platforms, strokes) {
  // Check painted platforms first (black strokes)
  let best = null;

  // Painted black strokes as platforms — find highest one below the runner
  for (const stroke of strokes) {
  if (stroke.color === "red") continue;
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
  let bestY = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    if (wx >= minX - 6 && wx <= maxX + 6) {
      if (Math.abs(b.x - a.x) < 1) {
        const midY = (a.y + b.y) / 2;
        if (bestY === null || midY < bestY) bestY = midY;
        continue;
      }
      const t  = (wx - a.x) / (b.x - a.x);
      const sy = a.y + t * (b.y - a.y);
      // Accept slopes up to 1.5 (about 56°) — makes ramps climbable
      const slope = Math.abs(b.y - a.y) / (Math.max(1, Math.abs(b.x - a.x)));
      if (slope < 1.5) {
        if (bestY === null || sy < bestY) bestY = sy;
      }
    }
  }
  return bestY;
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