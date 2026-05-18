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

export function generateMap(seed) {
  const rand     = seededRand(seed);
  const ffRand   = seededRand(seed + 1);
  const hazRand  = seededRand(seed + 2);
  const walls    = [];
  const cx = WORLD / 2, cy = WORLD / 2;
  const clearR   = 180; // safe zone around spawn

  function tooClose(x, y, r) {
    const dx = cx - x, dy = cy - y;
    return Math.sqrt(dx * dx + dy * dy) < clearR + r;
  }

  function tryAddWall(x, y, w, h) {
    const nearX = Math.max(x, Math.min(cx, x + w));
    const nearY = Math.max(y, Math.min(cy, y + h));
    const dx = cx - nearX, dy = cy - nearY;
    if (Math.sqrt(dx * dx + dy * dy) < clearR) return;
    walls.push({ x, y, w, h });
  }

  // Scattered large chunks
  for (let i = 0; i < 45; i++) {
    const x = 80 + rand() * (WORLD - 240);
    const y = 80 + rand() * (WORLD - 240);
    const w = 50 + rand() * 160;
    const h = 50 + rand() * 160;
    tryAddWall(x, y, w, h);
  }

  // Tighter corridor clusters
  const corridorCenters = [
    { x: 500,  y: 500  }, { x: 1200, y: 400  }, { x: 1900, y: 500  },
    { x: 400,  y: 1200 }, { x: 1200, y: 1200 }, { x: 2000, y: 1200 },
    { x: 500,  y: 1900 }, { x: 1200, y: 2000 }, { x: 1900, y: 1900 },
    { x: 800,  y: 800  }, { x: 1600, y: 800  }, { x: 800,  y: 1600 },
    { x: 1600, y: 1600 },
  ];
  corridorCenters.forEach(c => {
    const count = 4 + Math.floor(rand() * 5);
    for (let i = 0; i < count; i++) {
      const ox = (rand() - 0.5) * 350;
      const oy = (rand() - 0.5) * 350;
      const w  = 25 + rand() * 90;
      const h  = 25 + rand() * 90;
      tryAddWall(c.x + ox - w / 2, c.y + oy - h / 2, w, h);
    }
  });

  // Fireflies
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

  // ── Mushroom clusters (P2 only visible) ──────────────────────────────────
  // Each cluster has 3-5 mushrooms in a tight group
  const mushrooms = [];
  const numClusters = 12;
  for (let c = 0; c < numClusters; c++) {
    const clx = 150 + hazRand() * (WORLD - 300);
    const cly = 150 + hazRand() * (WORLD - 300);
    if (tooClose(clx, cly, 80)) continue;
    const count = 3 + Math.floor(hazRand() * 3);
    for (let i = 0; i < count; i++) {
      const ox  = (hazRand() - 0.5) * 90;
      const oy  = (hazRand() - 0.5) * 90;
      const mx  = clx + ox;
      const my  = cly + oy;
      if (tooClose(mx, my, 20)) continue;
      mushrooms.push({
        id:     mushrooms.length,
        x:      mx,
        y:      my,
        radius: 18 + hazRand() * 10,
        pulse:  hazRand() * Math.PI * 2,
        // slight size variation for visual interest
        capSize: 8 + hazRand() * 6,
      });
    }
  }

  // ── Holes ─────────────────────────────────────────────────────────────────
  const holes = [];
  for (let i = 0; i < 14; i++) {
    const x = 150 + hazRand() * (WORLD - 300);
    const y = 150 + hazRand() * (WORLD - 300);
    if (tooClose(x, y, 60)) continue;
    holes.push({
      id:     i,
      x,
      y,
      radius: 22 + hazRand() * 12,
    });
  }

  // ── Spike traps ───────────────────────────────────────────────────────────
  const spikes = [];
  for (let i = 0; i < 30; i++) {
    const x = 150 + hazRand() * (WORLD - 300);
    const y = 150 + hazRand() * (WORLD - 300);
    if (tooClose(x, y, 40)) continue;
    spikes.push({
      id:     i,
      x,
      y,
      radius: 16,
    });
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