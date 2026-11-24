// src/Pages/Arcade/games/walk-3d/bumper/bumperSim.js
//
// Bumper Blobs — the rules (no drawing here, so it can be tested on its own).
//
//   • The arena is a floating platform of hexagon tiles. After a while the
//     outside rings start to shake and fall, working inward. The middle never falls.
//   • Blobs slide around (a bit slippery), DASH to charge, and BUMP each other.
//     A dashing bump hits much harder. Fall off the platform = lose the round.
//   • Power-ups: GIANT (bigger + heavier + hits harder) and ZOOM (faster).
//   • Banana peels appear on the platform. Step on one and you spin out.
//   • First to 3 rounds wins the match.
//
// The tile crumble order comes from the round's seed, so both devices know
// exactly which tiles are gone at any moment without sending tile data.

export const T = {
  TILE: 1.2,               // hex size (centre to corner)
  RINGS: 5,                // rings around the centre (91 tiles)
  CRUMBLE_START: 14,       // seconds into the round before tiles start falling
  RING_GAP: 7,             // each ring inward starts this much later
  RING_SPREAD: 7,          // tiles in a ring fall spread over this many seconds
  SHAKE: 1.5,              // tiles shake this long before falling

  ACCEL: 30, MAX_SPEED: 7, ZOOM_SPEED: 10, DRAG: 2.4,
  DASH_SPEED: 13, DASH_CD: 1.0, DASH_TIME: 0.28,
  RADIUS: 0.65, GIANT_SCALE: 1.6, GIANT_MASS: 3,
  BUMP_MIN: 3.5, BUMP_MULT: 0.7, DASH_BUMP: 1.5,
  SLIP_TIME: 1.3, SLIP_DRAG: 0.35,
  GRAVITY: 25, OUT_Y: -10,

  POWERUP_FIRST: 7, POWERUP_EVERY: 9, POWERUP_TIME: 7, POWERUP_MAX: 2,
  BANANA_FIRST: 10, BANANA_EVERY: 11, BANANA_MAX: 3,
  COUNTDOWN: 3, ROUND_OVER: 2.6, WIN_ROUNDS: 3,
};

const SQ3 = Math.sqrt(3);

export function mulberry(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Arena ─────────────────────────────────────────────────────────────────────
// Pointy-top hexes on the x/z ground plane. Each tile: { q, r, x, z, ring, fallAt }.
export function makeArena(seed) {
  const rng = mulberry(seed);
  const tiles = [];
  const N = T.RINGS;
  for (let q = -N; q <= N; q++) for (let r = Math.max(-N, -q - N); r <= Math.min(N, -q + N); r++) {
    const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    const fallAt = ring === 0 ? Infinity : T.CRUMBLE_START + (N - ring) * T.RING_GAP + rng() * T.RING_SPREAD;
    tiles.push({ q, r, x: T.TILE * SQ3 * (q + r / 2), z: T.TILE * 1.5 * r, ring, fallAt });
  }
  const byKey = new Map(tiles.map(t => [`${t.q},${t.r}`, t]));
  return { tiles, byKey };
}

// which tile is under a spot (or null)
export function tileAt(arena, x, z) {
  const fq = (SQ3 / 3 * x - z / 3) / T.TILE, fr = (2 / 3 * z) / T.TILE, fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr), s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return arena.byKey.get(`${q},${r}`) || null;
}
export const tileSolid = (tile, t) => !!tile && t < tile.fallAt;
export const tileShaking = (tile, t) => !!tile && t >= tile.fallAt - T.SHAKE && t < tile.fallAt;

// a random tile that won't fall for a while (for power-ups / bananas)
export function safeSpot(arena, t, rng, ahead = 6) {
  const ok = arena.tiles.filter(tl => tl.fallAt > t + ahead);
  if (!ok.length) return null;
  const tl = ok[Math.floor(rng() * ok.length)];
  return { x: tl.x, z: tl.z };
}

// ── Blobs ─────────────────────────────────────────────────────────────────────
export const SPAWNS = [{ x: -3.5, z: 0 }, { x: 3.5, z: 0 }];

export function makeBlob(slot) {
  const s = SPAWNS[slot];
  return {
    x: s.x, z: s.z, y: 0, vx: 0, vz: 0, vy: 0, face: slot === 0 ? Math.PI / 2 : -Math.PI / 2,
    dashCd: 0, dashT: 0, slipT: 0, giantT: 0, zoomT: 0, falling: false, out: false, spin: 0,
  };
}
export const radiusOf = (b) => T.RADIUS * (b.giantT > 0 ? T.GIANT_SCALE : 1);
export const massOf = (b) => (b.giantT > 0 ? T.GIANT_MASS : 1);

// input: { x, z, dash }  (x/z = stick direction on the ground, length ≤ 1)
// Returns a list of sound/effect events: "dash", "fall".
export function stepBlob(b, input, dt, arena, t, canMove = true) {
  const ev = [];
  b.dashCd = Math.max(0, b.dashCd - dt);
  b.dashT = Math.max(0, b.dashT - dt);
  b.slipT = Math.max(0, b.slipT - dt);
  b.giantT = Math.max(0, b.giantT - dt);
  b.zoomT = Math.max(0, b.zoomT - dt);
  if (b.out) return ev;

  const ix = canMove && b.slipT <= 0 && !b.falling ? input.x : 0;
  const iz = canMove && b.slipT <= 0 && !b.falling ? input.z : 0;
  const mag = Math.hypot(ix, iz);
  if (mag > 0.05) {
    b.vx += ix * T.ACCEL * dt; b.vz += iz * T.ACCEL * dt;
    b.face = Math.atan2(ix, iz);
  }
  if (canMove && input.dash && b.dashCd <= 0 && b.slipT <= 0 && !b.falling) {
    const dx = mag > 0.05 ? ix / mag : Math.sin(b.face), dz = mag > 0.05 ? iz / mag : Math.cos(b.face);
    b.vx = dx * T.DASH_SPEED; b.vz = dz * T.DASH_SPEED;
    b.dashT = T.DASH_TIME; b.dashCd = T.DASH_CD;
    ev.push("dash");
  }
  // speed limit (dashing and bumps can go over it for a moment, drag brings it back)
  const max = b.zoomT > 0 ? T.ZOOM_SPEED : T.MAX_SPEED;
  const sp = Math.hypot(b.vx, b.vz);
  if (b.dashT <= 0 && sp > max && mag > 0.05) { b.vx *= max / sp; b.vz *= max / sp; }
  const drag = b.slipT > 0 ? T.SLIP_DRAG : T.DRAG;
  const k = Math.exp(-drag * dt * (mag > 0.05 && b.dashT <= 0 ? 0.6 : 1));
  b.vx *= k; b.vz *= k;
  b.x += b.vx * dt; b.z += b.vz * dt;
  if (b.slipT > 0) b.spin += dt * 18;

  // standing on a tile?
  if (!b.falling && !tileSolid(tileAt(arena, b.x, b.z), t)) { b.falling = true; ev.push("fall"); }
  if (b.falling) {
    b.vy -= T.GRAVITY * dt; b.y += b.vy * dt; b.spin += dt * 8;
    if (b.y < T.OUT_Y) b.out = true;
  }
  return ev;
}

// Two blobs bumping. Returns velocity changes for each, or null if not touching.
// (The host applies its own change and sends the other one to the guest.)
export function bump(a, b) {
  if (a.out || b.out || a.falling || b.falling) return null;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  const min = radiusOf(a) + radiusOf(b);
  if (d >= min || d < 0.0001) return null;
  const nx = dx / d, nz = dz / d;
  const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;     // how fast they're closing
  const base = Math.max(T.BUMP_MIN, Math.abs(rel) * T.BUMP_MULT);
  const ma = massOf(a), mb = massOf(b);
  const hitB = base * (a.dashT > 0 ? T.DASH_BUMP : 1) * (2 * ma / (ma + mb));
  const hitA = base * (b.dashT > 0 ? T.DASH_BUMP : 1) * (2 * mb / (ma + mb));
  const overlap = min - d;
  return {
    a: { vx: -nx * hitA, vz: -nz * hitA, px: -nx * overlap / 2, pz: -nz * overlap / 2 },
    b: { vx: nx * hitB, vz: nz * hitB, px: nx * overlap / 2, pz: nz * overlap / 2 },
    strength: (hitA + hitB) / 2 / T.BUMP_MIN,
    x: a.x + nx * radiusOf(a), z: a.z + nz * radiusOf(a),
  };
}

// ── CPU opponent (solo play) ─────────────────────────────────────────────────
// Chases you, dashes when close, and steers back toward the middle near edges.
export function cpuInput(cpu, target, arena, t, rng) {
  let x = 0, z = 0, dash = false;
  if (cpu.out || cpu.falling) return { x, z, dash };
  const dx = target.x - cpu.x, dz = target.z - cpu.z, d = Math.hypot(dx, dz) || 1;
  if (!target.out && !target.falling) { x = dx / d; z = dz / d; }
  // look a little ahead: if there's no floor, head for the middle instead
  const ahead = 1.6;
  const fx = cpu.x + cpu.vx * 0.25 + x * ahead, fz = cpu.z + cpu.vz * 0.25 + z * ahead;
  if (!tileSolid(tileAt(arena, fx, fz), t + 0.6)) {
    const cd = Math.hypot(cpu.x, cpu.z) || 1;
    x = -cpu.x / cd; z = -cpu.z / cd;
  } else if (d < 3 && cpu.dashCd <= 0 && rng() < 0.025) dash = true;
  // a little wobble so it isn't a perfect robot
  x += (rng() - 0.5) * 0.4; z += (rng() - 0.5) * 0.4;
  const m = Math.hypot(x, z) || 1;
  return { x: x / Math.max(1, m), z: z / Math.max(1, m), dash };
}