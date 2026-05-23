// src/Pages/InkRun/gameEngine.js
// Pure functions — no React, no side effects.

export const WORLD_H      = 720;   // viewport-height world units (fixed)
export const CHUNK_W      = 800;   // width of one terrain chunk
export const GROUND_Y     = WORLD_H - 80; // y of the base ground line
export const RUNNER_R     = 14;
export const WALL_GRACE_S = 10;    // seconds before the death wall starts moving
// Max jump height: v²/2g = 420²/(2*900) ≈ 98px. Walls taller than this are unjumpable.
export const WALL_H       = 120;   // terrain wall height — deliberately > max jump height
export const INK_TOKEN_R  = 12;    // collision/render radius for ink refill tokens
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
// Each chunk has: platforms (some moving), gaps, enemies, spikes, walls, inkTokens
// difficulty 0→1 scales with distance
// groundY per-chunk can be offset for height variation

export function generateChunk(chunkIndex, seed) {
  const rand       = seededRand(seed + chunkIndex * 997);
  const difficulty = Math.min(1, chunkIndex * 0.07);
  const offsetX    = chunkIndex * CHUNK_W;

  // ── Height variation ──────────────────────────────────────────────────────
  // Each chunk's ground can be raised or lowered. Runner must use painted
  // ramps to navigate. Chunk 0 is always flat so players can orient.
  // Steps of 40px — feels like deliberate terrain, not random noise.
  let groundY = GROUND_Y;
  if (chunkIndex > 1) {
    const steps = Math.floor(rand() * 4) - 1; // -1, 0, 1, or 2 steps
    groundY = Math.max(WORLD_H - 280, Math.min(GROUND_Y, GROUND_Y - steps * 50));
  }

  const platforms  = [];
  const gaps       = [];
  const enemies    = [];
  const spikes     = [];
  const walls      = [];
  const inkTokens  = [];

  // ── Ground gaps ───────────────────────────────────────────────────────────
  const MIN_PAINTER_GAP = 190;
  const MAX_GAP         = 260 + difficulty * 80;

  if (chunkIndex === 1) {
    const gapStart = 220 + rand() * 160;
    const gapW     = MIN_PAINTER_GAP + rand() * (MAX_GAP - MIN_PAINTER_GAP);
    gaps.push({ x: offsetX + gapStart, w: gapW, groundY });
  } else if (chunkIndex > 1) {
    let cursor = 80;
    const gapStart = cursor + 80 + rand() * 120;
    const gapW     = MIN_PAINTER_GAP + rand() * (MAX_GAP - MIN_PAINTER_GAP);
    if (gapStart + gapW < CHUNK_W - 60) {
      gaps.push({ x: offsetX + gapStart, w: gapW, groundY });
      cursor = gapStart + gapW + 80;
    }
    // Possibly a second gap
    if (difficulty > 0.3 && rand() > 0.4) {
      const g2Start = cursor + 60 + rand() * 100;
      const g2W     = 120 + rand() * (MIN_PAINTER_GAP + difficulty * 60);
      if (g2Start + g2W < CHUNK_W - 40) {
        gaps.push({ x: offsetX + g2Start, w: g2W, groundY });
      }
    }

    // ── Long gap with moving platform (chunk 3+, difficulty scales) ──────
    // A very wide gap (too wide even with painter help alone) with a moving
    // platform the painter must time/bridge onto. Appears 25–50% of chunks.
    if (chunkIndex >= 3 && rand() < 0.25 + difficulty * 0.25) {
      const mgStart = cursor + 60 + rand() * 80;
      const mgW     = 300 + rand() * 120; // 300–420px — very wide
      if (mgStart + mgW < CHUNK_W - 40) {
        gaps.push({ x: offsetX + mgStart, w: mgW, groundY });
        // Moving platform above the gap
        const platW   = 70 + rand() * 40;
        const patrolA = offsetX + mgStart + 20;
        const patrolB = offsetX + mgStart + mgW - platW - 20;
        platforms.push({
          id:       `chunk${chunkIndex}_movplat0`,
          x:        patrolA + rand() * (patrolB - patrolA),
          y:        groundY - 110 - rand() * 80,
          w:        platW,
          h:        14,
          moving:   true,
          speed:    55 + rand() * 45 * difficulty,
          patrolA,
          patrolB,
          dir:      rand() > 0.5 ? 1 : -1,
          phase:    rand() * Math.PI * 2,
        });
      }
    }
  }

  // ── Floating platforms (static) ───────────────────────────────────────────
  const numPlatforms = Math.floor(rand() * (1 + difficulty * 2));
  for (let i = 0; i < numPlatforms; i++) {
    platforms.push({
      id:     `chunk${chunkIndex}_plat${i}`,
      x:      offsetX + 100 + rand() * (CHUNK_W - 200),
      y:      groundY - 120 - rand() * 180,
      w:      60 + rand() * 80,
      h:      14,
      moving: false,
    });
  }

  // ── Terrain walls ─────────────────────────────────────────────────────────
  if (chunkIndex >= 2 && rand() < 0.35 + difficulty * 0.3) {
    const wx = offsetX + 300 + rand() * 300;
    const ww = 28 + rand() * 20;
    const blocked = gaps.some(g => wx + ww > g.x - 20 && wx < g.x + g.w + 20);
    if (!blocked) {
      walls.push({
        id: `chunk${chunkIndex}_wall0`,
        x:  wx,
        y:  groundY - WALL_H,
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
      const onPlatform = platforms.length > 0 && rand() > 0.6;
      const plat       = onPlatform ? platforms[Math.floor(rand() * platforms.length)] : null;
      enemies.push({
        id:        `chunk${chunkIndex}_enemy${i}`,
        x:         plat ? plat.x + plat.w / 2 : ex,
        y:         plat ? plat.y - 16          : groundY - 16,
        groundY:   plat ? plat.y               : groundY,
        vy:        0,
        type:      "walker",
        dir:       rand() > 0.5 ? 1 : -1,
        speed:     40 + rand() * 40 * difficulty,
        patrolMin: plat ? plat.x          : offsetX + 60,
        patrolMax: plat ? plat.x + plat.w : offsetX + CHUNK_W - 60,
        alive:     true,
        hitFlash:  0,
      });
    }

    // ── Flying enemies ────────────────────────────────────────────────────
    const numFlyers = Math.floor(rand() * difficulty * 2.5);
    for (let i = 0; i < numFlyers; i++) {
      enemies.push({
        id:        `chunk${chunkIndex}_flyer${i}`,
        x:         offsetX + 100 + rand() * (CHUNK_W - 200),
        y:         groundY - 180 - rand() * 160,
        groundY,
        vy:        0,
        type:      "flyer",
        dir:       rand() > 0.5 ? 1 : -1,
        speed:     55 + rand() * 50 * difficulty,
        patrolMin: offsetX + 40,
        patrolMax: offsetX + CHUNK_W - 40,
        bobOffset: rand() * Math.PI * 2,
        alive:     true,
        hitFlash:  0,
      });
    }
  }

  // ── Spike clusters ────────────────────────────────────────────────────────
  if (chunkIndex > 1) {
    const numSpikes = Math.floor(rand() * difficulty * 4);
    for (let i = 0; i < numSpikes; i++) {
      spikes.push({
        id:   `chunk${chunkIndex}_spike${i}`,
        x:    offsetX + 80 + rand() * (CHUNK_W - 160),
        y:    groundY - 18,
        w:    16 + rand() * 20,
        h:    18,
        hitH: 8,
      });
    }
  }

  // ── Ink refill tokens ─────────────────────────────────────────────────────
  if (chunkIndex > 0 && rand() > 0.45) {
    const tx = offsetX + 200 + rand() * (CHUNK_W - 400);
    const ty = groundY - 90 - rand() * 180;
    const overGap = gaps.some(g => tx > g.x - 20 && tx < g.x + g.w + 20);
    if (!overGap) {
      inkTokens.push({
        id: `chunk${chunkIndex}_ink0`,
        x:  tx,
        y:  ty,
        collected: false,
      });
    }
  }

  return { chunkIndex, offsetX, groundY, platforms, gaps, enemies, spikes, walls, inkTokens };
}

// ─── Moving platform tick ─────────────────────────────────────────────────────
// Call each frame to advance moving platforms. Returns the same array (mutated).
export function updatePlatforms(platforms, dt) {
  for (const p of platforms) {
    if (!p.moving) continue;
    p.x += p.dir * p.speed * dt;
    if (p.x > p.patrolB) { p.x = p.patrolB; p.dir = -1; }
    if (p.x < p.patrolA) { p.x = p.patrolA; p.dir =  1; }
  }
}

// ─── Physics helpers ──────────────────────────────────────────────────────────

export function isOverGap(x, gaps) {
  return gaps.some(g => x > g.x && x < g.x + g.w);
}

// groundYatX — returns the chunk's ground level at world-x (accounting for height steps)
// Falls back to GROUND_Y if no chunk matches.
export function groundYatX(x, chunks) {
  for (const chunk of chunks) {
    if (x >= chunk.offsetX && x < chunk.offsetX + CHUNK_W) {
      return chunk.groundY ?? GROUND_Y;
    }
  }
  return GROUND_Y;
}

// Returns the y of the surface under a point (ground or platform top)
// Returns null if over a gap with no platform underneath
export function surfaceUnder(x, y, gaps, platforms, strokes, chunks) {
  let best = null;

  // Painted strokes as platforms
  for (const stroke of strokes) {
    if (stroke.color === "red") continue;
    const sy = strokeYatX(stroke, x);
    if (sy !== null && sy >= y - 2 && (best === null || sy < best)) {
      best = sy;
    }
  }

  // Built-in platforms (static and moving)
  for (const p of platforms) {
    if (x + RUNNER_R * 0.5 > p.x && x - RUNNER_R * 0.5 < p.x + p.w) {
      const top = p.y;
      if (top >= y - 2 && (best === null || top < best)) best = top;
    }
  }

  // Ground — level can vary per chunk, use chunk groundY if available
  if (!isOverGap(x, gaps)) {
    const gy = chunks ? groundYatX(x, chunks) : GROUND_Y;
    if (best === null || gy < best) best = gy;
  }

  return best;
}

// ─── Stroke geometry ──────────────────────────────────────────────────────────

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
      const slope = Math.abs(b.y - a.y) / (Math.max(1, Math.abs(b.x - a.x)));
      if (slope < 1.5) {
        if (bestY === null || sy < bestY) bestY = sy;
      }
    }
  }
  return bestY;
}

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

// ─── Stroke gravity / anchoring ───────────────────────────────────────────────
// Called in PainterView when a stroke is committed.
// Returns the stroke with points translated down by yOffset if it was floating.
// yOffset is also stored on the stroke for sync (runner needs to apply same offset).

const ANCHOR_RADIUS = 14; // px — how close to solid counts as "touching"

export function settleStroke(stroke, gaps, platforms, existingStrokes, chunks) {
  if (stroke.color === "red") return { ...stroke, yOffset: 0 }; // red wisps float freely

  // Check if any point is close enough to a solid surface to count as anchored.
  // "Solid" = ground, platform, wall (via chunks.walls), or another committed stroke.
  if (isStrokeAnchored(stroke, gaps, platforms, existingStrokes, chunks)) {
    return { ...stroke, yOffset: 0 };
  }

  // Not anchored — find how far down we need to drop the stroke so it rests on something.
  // Binary-search / step down 3px at a time, max 800px drop.
  const pts = stroke.points;
  let drop = 0;
  const MAX_DROP = 800;
  const STEP = 3;

  while (drop < MAX_DROP) {
    drop += STEP;
    // Check if, at this drop, any point has hit a surface
    const shifted = pts.map(p => ({ x: p.x, y: p.y + drop }));
    if (shiftedTouchesSolid(shifted, gaps, platforms, existingStrokes, chunks)) {
      break;
    }
  }

  // Snap back up half a step so we sit ON the surface rather than inside it
  drop = Math.max(0, drop - STEP);

  const settled = {
    ...stroke,
    points: pts.map(p => ({ x: p.x, y: p.y + drop })),
    yOffset: drop,
  };
  return settled;
}

function isStrokeAnchored(stroke, gaps, platforms, existingStrokes, chunks) {
  const pts = stroke.points;
  for (const p of pts) {
    // Ground check (accounting for height steps)
    const gy = chunks ? groundYatX(p.x, chunks) : GROUND_Y;
    if (!isOverGap(p.x, gaps) && Math.abs(p.y - gy) < ANCHOR_RADIUS) return true;

    // Platform check
    for (const plat of platforms) {
      if (p.x >= plat.x - 4 && p.x <= plat.x + plat.w + 4 &&
          Math.abs(p.y - plat.y) < ANCHOR_RADIUS) return true;
    }

    // Wall check (top surface)
    if (chunks) {
      for (const chunk of chunks) {
        for (const w of (chunk.walls || [])) {
          if (p.x >= w.x - 4 && p.x <= w.x + w.w + 4 &&
              Math.abs(p.y - w.y) < ANCHOR_RADIUS) return true;
        }
      }
    }

    // Another committed stroke check
    for (const other of existingStrokes) {
      if (other.id === stroke.id) continue;
      if (other.color === "red") continue;
      const sy = strokeYatX(other, p.x);
      if (sy !== null && Math.abs(p.y - sy) < ANCHOR_RADIUS) return true;
    }
  }
  return false;
}

function shiftedTouchesSolid(shiftedPts, gaps, platforms, existingStrokes, chunks) {
  for (const p of shiftedPts) {
    const gy = chunks ? groundYatX(p.x, chunks) : GROUND_Y;
    if (!isOverGap(p.x, gaps) && p.y >= gy - ANCHOR_RADIUS) return true;

    for (const plat of platforms) {
      if (p.x >= plat.x - 4 && p.x <= plat.x + plat.w + 4 &&
          Math.abs(p.y - plat.y) < ANCHOR_RADIUS) return true;
    }

    if (chunks) {
      for (const chunk of chunks) {
        for (const w of (chunk.walls || [])) {
          if (p.x >= w.x - 4 && p.x <= w.x + w.w + 4 &&
              Math.abs(p.y - w.y) < ANCHOR_RADIUS) return true;
        }
      }
    }

    for (const other of existingStrokes) {
      if (other.color === "red") continue;
      const sy = strokeYatX(other, p.x);
      if (sy !== null && Math.abs(p.y - sy) < ANCHOR_RADIUS) return true;
    }
  }
  return false;
}

// ─── Enemy update ─────────────────────────────────────────────────────────────
// strokes is optional — pass it so walkers can climb ink surfaces.
export function updateEnemies(enemies, dt, t, strokes, gaps, platforms, chunks) {
  enemies.forEach(e => {
    if (!e.alive) return;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);

    if (e.type === "walker") {
      // Find floor under enemy (ink surface or ground/platform)
      const floorY = strokes
        ? surfaceUnder(e.x, e.y, gaps || [], platforms || [], strokes, chunks)
        : (e.groundY ?? GROUND_Y);

      // Gravity — pull enemy down to floor
      if (floorY !== null) {
        const targetY = floorY - 16;
        if (e.y < targetY - 1) {
          e.vy = (e.vy || 0) + 900 * dt;
          e.y += e.vy * dt;
          if (e.y >= targetY) { e.y = targetY; e.vy = 0; }
        } else {
          e.vy = 0;
        }
      }

      // Horizontal patrol
      const nextX = e.x + e.dir * e.speed * dt;

      // Check if next step would walk off a cliff or into a wall
      // Walker navigates ink ramps: look ahead 12px
      const lookX    = nextX + e.dir * 12;
      const aheadFloor = strokes
        ? surfaceUnder(lookX, e.y - 30, gaps || [], platforms || [], strokes, chunks)
        : null;

      // If floor ahead is too steep down (gap or big drop), reverse
      if (aheadFloor === null && strokes) {
        e.dir *= -1;
      } else if (aheadFloor !== null && strokes) {
        const rise = aheadFloor - (floorY ?? GROUND_Y);
        // If slope going up is too steep (>80px in 12px horiz = 6.6 ratio), bounce back
        if (rise < -80) {
          e.dir *= -1;
        } else {
          e.x = nextX;
        }
      } else {
        e.x = nextX;
      }

      if (e.x > e.patrolMax) { e.x = e.patrolMax; e.dir = -1; }
      if (e.x < e.patrolMin) { e.x = e.patrolMin; e.dir =  1; }

    } else if (e.type === "flyer") {
      e.x += e.dir * e.speed * dt;
      e.y  = e.y + Math.sin(t * 1.8 + e.bobOffset) * 0.4;
      if (e.x > e.patrolMax) { e.x = e.patrolMax; e.dir = -1; }
      if (e.x < e.patrolMin) { e.x = e.patrolMin; e.dir =  1; }

    } else if (e.type === "inkEater") {
      // Ink Eater: follows painter cursor, then hunts nearest stroke point.
      // Moves fast, killed only by runner stomp. Respawns after 30s.
      const spd = 90 + (e.difficulty ?? 0) * 40;

      // Move toward target
      const tx = e.targetX ?? e.x;
      const ty = e.targetY ?? e.y;
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        e.x += (dx / dist) * spd * dt;
        e.y += (dy / dist) * spd * dt;
      }

      // Clamp to world bounds (don't go underground)
      const gy = chunks ? groundYatX(e.x, chunks) : GROUND_Y;
      if (e.y > gy - 10) e.y = gy - 10;
      if (e.y < 60) e.y = 60;
    }
  });
}