// src/Pages/Firefly/gameEngine.js
// Pure functions — no React, no side effects.

const WORLD = 2400;

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Map generation ───────────────────────────────────────────────────────────
//
// Wall placement uses a coarse occupancy grid to prevent stacking.
// The world is divided into GRID_COLS × GRID_ROWS cells.
// Each wall claims the grid cells it covers; a cell can only be claimed once.
// This guarantees walls spread across the map and never overlap.

export function generateMap(seed) {
  const rand    = seededRand(seed);
  const ffRand  = seededRand(seed + 1);
  const hazRand = seededRand(seed + 2);

  const cx = WORLD / 2, cy = WORLD / 2;
  const clearR = 180; // safe zone radius around spawn

  // ── Occupancy grid ─────────────────────────────────────────────────────────
  // Each cell is 120×120 world units — coarse enough that walls feel organic,
  // fine enough that overlaps are impossible.
  const CELL_SIZE  = 120;
  const GRID_COLS  = Math.ceil(WORLD / CELL_SIZE);
  const GRID_ROWS  = Math.ceil(WORLD / CELL_SIZE);
  const occupied   = new Uint8Array(GRID_COLS * GRID_ROWS); // 0 = free, 1 = taken

  function gridIdx(col, row) { return row * GRID_COLS + col; }

  // Returns the grid cell range a rect covers (clamped to grid bounds)
  function rectCells(x, y, w, h) {
    const c0 = Math.max(0, Math.floor(x / CELL_SIZE));
    const r0 = Math.max(0, Math.floor(y / CELL_SIZE));
    const c1 = Math.min(GRID_COLS - 1, Math.floor((x + w - 1) / CELL_SIZE));
    const r1 = Math.min(GRID_ROWS - 1, Math.floor((y + h - 1) / CELL_SIZE));
    return { c0, r0, c1, r1 };
  }

  // Check whether all cells a rect would occupy are free
  function canPlace(x, y, w, h) {
    const { c0, r0, c1, r1 } = rectCells(x, y, w, h);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (occupied[gridIdx(c, r)]) return false;
    return true;
  }

  // Mark cells as occupied
  function markOccupied(x, y, w, h) {
    const { c0, r0, c1, r1 } = rectCells(x, y, w, h);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        occupied[gridIdx(c, r)] = 1;
  }

  // Pre-mark the spawn safe zone so walls never appear there
  function markCircle(wx, wy, radius) {
    const c0 = Math.max(0, Math.floor((wx - radius) / CELL_SIZE));
    const r0 = Math.max(0, Math.floor((wy - radius) / CELL_SIZE));
    const c1 = Math.min(GRID_COLS - 1, Math.ceil((wx + radius) / CELL_SIZE));
    const r1 = Math.min(GRID_ROWS - 1, Math.ceil((wy + radius) / CELL_SIZE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        // cell centre
        const ccx = c * CELL_SIZE + CELL_SIZE / 2;
        const ccy = r * CELL_SIZE + CELL_SIZE / 2;
        if (Math.hypot(ccx - wx, ccy - wy) < radius + CELL_SIZE)
          occupied[gridIdx(c, r)] = 1;
      }
    }
  }
  markCircle(cx, cy, clearR);

  // Also mark the outer border cells so walls don't clip the world edge
  for (let c = 0; c < GRID_COLS; c++) {
    occupied[gridIdx(c, 0)] = 1;
    occupied[gridIdx(c, GRID_ROWS - 1)] = 1;
  }
  for (let r = 0; r < GRID_ROWS; r++) {
    occupied[gridIdx(0, r)] = 1;
    occupied[gridIdx(GRID_COLS - 1, r)] = 1;
  }

  const walls = [];

  function tryAddWall(x, y, w, h) {
    // Snap to world bounds
    x = Math.max(0, x); y = Math.max(0, y);
    w = Math.min(w, WORLD - x); h = Math.min(h, WORLD - y);
    if (w < 20 || h < 20) return false;
    if (!canPlace(x, y, w, h)) return false;
    markOccupied(x, y, w, h);
    walls.push({ x, y, w, h });
    return true;
  }

  // ── Large scattered chunks (target: 45) ───────────────────────────────────
  // Retry each one a few times if it lands on occupied space so we hit count
  for (let i = 0; i < 20; i++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = 80 + rand() * (WORLD - 240);
      const y = 80 + rand() * (WORLD - 240);
      const w = 60 + rand() * 140;
      const h = 60 + rand() * 140;
      if (tryAddWall(x, y, w, h)) break;
    }
  }

  // ── Corridor cluster walls (target: ~65 more) ────────────────────────────
  // Fixed anchor points spread across the map to ensure good coverage
  const corridorCenters = [
    { x: 500,  y: 500  }, { x: 1200, y: 400  }, { x: 1900, y: 500  },
    { x: 400,  y: 1200 }, { x: 1200, y: 1200 }, { x: 2000, y: 1200 },
    { x: 500,  y: 1900 }, { x: 1200, y: 2000 }, { x: 1900, y: 1900 },
    { x: 800,  y: 800  }, { x: 1600, y: 800  }, { x: 800,  y: 1600 },
    { x: 1600, y: 1600 },
  ];
  corridorCenters.forEach(c => {
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const ox = (rand() - 0.5) * 350;
        const oy = (rand() - 0.5) * 350;
        const w  = 30 + rand() * 90;
        const h  = 30 + rand() * 90;
        if (tryAddWall(c.x + ox - w / 2, c.y + oy - h / 2, w, h)) break;
      }
    }
  });

  // ── Fill sparse areas with extra medium walls ─────────────────────────────
  // Walk every grid cell; if an area looks empty, drop a wall in it.
  // This ensures the far corners of the map aren't totally open.
  for (let r = 1; r < GRID_ROWS - 1; r++) {
    for (let c = 1; c < GRID_COLS - 1; c++) {
      if (occupied[gridIdx(c, r)]) continue;
      // Only fill about 30% of remaining free cells to keep it navigable
      if (rand() > 0.10) continue;
      const x = c * CELL_SIZE + rand() * (CELL_SIZE * 0.4);
      const y = r * CELL_SIZE + rand() * (CELL_SIZE * 0.4);
      const w = 30 + rand() * 70;
      const h = 30 + rand() * 70;
      tryAddWall(x, y, w, h);
    }
  }

  // ── Fireflies ─────────────────────────────────────────────────────────────
  const fireflies = [];
  for (let i = 0; i < 70; i++) {
    fireflies.push({
      id:        i,
      x:         80 + ffRand() * (WORLD - 160),
      y:         80 + ffRand() * (WORLD - 160),
      angle:     ffRand() * Math.PI * 2,
      speed:     25 + ffRand() * 35,
      turnRate:  (ffRand() - 0.5) * 1.5,
      pulse:     ffRand() * Math.PI * 2,
      size:      2.5 + ffRand() * 2,
      collected: false,
    });
  }

  // ── Mushroom clusters (P2-visible only) ───────────────────────────────────
  const mushrooms = [];
  const numClusters = 12;
  for (let c = 0; c < numClusters; c++) {
    const clx = 150 + hazRand() * (WORLD - 300);
    const cly = 150 + hazRand() * (WORLD - 300);
    if (Math.hypot(clx - cx, cly - cy) < clearR + 80) continue;
    const count = 3 + Math.floor(hazRand() * 3);
    for (let i = 0; i < count; i++) {
      const ox = (hazRand() - 0.5) * 90;
      const oy = (hazRand() - 0.5) * 90;
      const mx = clx + ox, my = cly + oy;
      if (Math.hypot(mx - cx, my - cy) < clearR + 20) continue;
      mushrooms.push({
        id:      mushrooms.length,
        x:       mx,
        y:       my,
        radius:  18 + hazRand() * 10,
        pulse:   hazRand() * Math.PI * 2,
        capSize: 8  + hazRand() * 6,
      });
    }
  }

  // ── Holes ─────────────────────────────────────────────────────────────────
  const holes = [];
  for (let i = 0; i < 14; i++) {
    const x = 150 + hazRand() * (WORLD - 300);
    const y = 150 + hazRand() * (WORLD - 300);
    if (Math.hypot(x - cx, y - cy) < clearR + 60) continue;
    holes.push({ id: i, x, y, radius: 22 + hazRand() * 12 });
  }

  // ── Spike traps ───────────────────────────────────────────────────────────
  const spikes = [];
  for (let i = 0; i < 30; i++) {
    const x = 150 + hazRand() * (WORLD - 300);
    const y = 150 + hazRand() * (WORLD - 300);
    if (Math.hypot(x - cx, y - cy) < clearR + 40) continue;
    spikes.push({ id: i, x, y, radius: 16 });
  }

  return { walls, fireflies, mushrooms, holes, spikes };
}

// ─── Collision ────────────────────────────────────────────────────────────────

function resolveCircleRect(px, py, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(px, rx + rw));
  const nearY = Math.max(ry, Math.min(py, ry + rh));
  const dx = px - nearX, dy = py - nearY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= r) return null;
  const overlap = r - dist;
  return { nx: (dx / dist) * overlap, ny: (dy / dist) * overlap };
}

export function moveWithSlide(ox, oy, vx, vy, dt, speed, radius, walls) {
  let nx = ox + vx * speed * dt;
  let ny = oy + vy * speed * dt;
  nx = Math.max(radius, Math.min(WORLD - radius, nx));
  ny = Math.max(radius, Math.min(WORLD - radius, ny));
  for (const w of walls) {
    const res = resolveCircleRect(nx, ny, radius, w.x, w.y, w.w, w.h);
    if (res) { nx += res.nx; ny += res.ny; }
  }
  return { x: nx, y: ny };
}

// ─── Circle-circle overlap ────────────────────────────────────────────────────

export function circleOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy) < ar + br;
}

// ─── Firefly update ───────────────────────────────────────────────────────────

export function updateFireflies(fireflies, player, dt, collectR) {
  fireflies.forEach(f => {
    if (f.collected) return;
    f.angle += f.turnRate * dt;
    f.x += Math.cos(f.angle) * f.speed * dt;
    f.y += Math.sin(f.angle) * f.speed * dt;
    if (f.x < 50)         { f.angle = Math.PI - f.angle; f.x = 50; }
    if (f.x > WORLD - 50) { f.angle = Math.PI - f.angle; f.x = WORLD - 50; }
    if (f.y < 50)         { f.angle = -f.angle; f.y = 50; }
    if (f.y > WORLD - 50) { f.angle = -f.angle; f.y = WORLD - 50; }
    const dx = f.x - player.x, dy = f.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < collectR) f.collected = true;
  });
}

// ─── Random open position (for teleport) ─────────────────────────────────────

export function randomOpenPos(walls, rand) {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = 200 + rand() * (WORLD - 400);
    const y = 200 + rand() * (WORLD - 400);
    const blocked = walls.some(w =>
      x > w.x - 20 && x < w.x + w.w + 20 &&
      y > w.y - 20 && y < w.y + w.h + 20
    );
    if (!blocked) return { x, y };
  }
  return { x: WORLD / 2, y: WORLD / 2 };
}