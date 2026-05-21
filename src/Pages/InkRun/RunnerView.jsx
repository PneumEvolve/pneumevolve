// src/Pages/InkRun/RunnerView.jsx
import React, { useEffect, useRef } from "react";
import { useInkRunRoom } from "./useInkRunRoom";
import {
  WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R, WALL_GRACE_S, INK_TOKEN_R,
  generateChunk, surfaceUnder, strokeYatX, touchesRedStroke, updateEnemies,
} from "./gameEngine";

const GRAVITY        = 900;
const JUMP_VY        = -420;
const MOVE_SPEED     = 220;
const WALL_START_VX  = 60;
const WALL_ACCEL     = 2.5;
const MOVE_THROTTLE  = 40;
const CHUNKS_AHEAD   = 5;
const RUNNER_START_X = 160;
const MAX_HP         = 3;
const INVINCIBLE_S   = 1.5;
const ENEMY_R        = 14;

// ─── tiny sound engine ────────────────────────────────────────────────────────
function makeSounds() {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const beep = (type, f0, f1, dur, vol) => {
    try {
      const ac = getCtx(), osc = ac.createOscillator(), g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch {}
  };
  return {
    unlock: () => { try { getCtx(); } catch {} },
    jump:   () => beep("sine",    320, 520, 0.12, 0.12),
    hit:    () => beep("sawtooth",180,  40, 0.30, 0.20),
    land:   () => beep("sine",    200, 120, 0.08, 0.08),
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function maxChunkIndex(chunks) {
  let m = 0;
  for (let i = 0; i < chunks.length; i++) if (chunks[i].chunkIndex > m) m = chunks[i].chunkIndex;
  return m;
}

// ─── ground rendering (fixed) ─────────────────────────────────────────────────
// gaps are in world-space; camX converts them to screen-space.
// We walk across [0 .. WW] in screen-space and fill every non-gap segment.
function drawGround(ctx, chunks, camX, WW) {
  // collect all gaps visible on screen, already in screen coords
  const gaps = [];
  for (const chunk of chunks) {
    for (const g of chunk.gaps) {
      const sx = g.x - camX;
      const ex = sx + g.w;
      if (ex > 0 && sx < WW) gaps.push({ sx, ex });
    }
  }
  gaps.sort((a, b) => a.sx - b.sx);

  // Fill ground blocks
  ctx.fillStyle = "#1c1c32";
  let cursor = 0;
  for (const g of gaps) {
    const start = Math.max(0, g.sx);
    const end   = Math.min(WW, g.ex);
    if (start > cursor) {
      ctx.fillRect(cursor, GROUND_Y, start - cursor, WORLD_H - GROUND_Y);
    }
    cursor = end;
  }
  if (cursor < WW) ctx.fillRect(cursor, GROUND_Y, WW - cursor, WORLD_H - GROUND_Y);

  // Ground edge line
  ctx.strokeStyle = "#4a4a7a";
  ctx.lineWidth   = 2;
  cursor = 0;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (const g of gaps) {
    const start = Math.max(0, g.sx);
    const end   = Math.min(WW, g.ex);
    if (start > cursor) {
      ctx.lineTo(start, GROUND_Y);
    }
    ctx.moveTo(end, GROUND_Y);
    cursor = end;
  }
  if (cursor < WW) ctx.lineTo(WW, GROUND_Y);
  ctx.stroke();
}

export default function RunnerView({ room, onGameOver }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const rafRef      = useRef(null);
  const keysRef     = useRef({});
  const soundRef    = useRef(null);
  const lastMoveRef = useRef(0);
  const strokesRef  = useRef([]);
  const strokeHistoryRef = useRef([]); // append-only — never trimmed; used for end-of-game timelapse
  const pingsRef    = useRef([]);         // { wx, wy, from, born } world-space markers
  const lastTapRef  = useRef(0);          // for double-tap ping detection

  const handlers = useRef({
    onStrokeAdded:    ({ stroke })   => {
      strokesRef.current = [...strokesRef.current, stroke];
      // Record full original stroke in history (never trimmed)
      strokeHistoryRef.current = [...strokeHistoryRef.current, { ...stroke, points: [...stroke.points] }];
    },
    onStrokeReclaimed:({ strokeId }) => { strokesRef.current = strokesRef.current.filter(s => s.id !== strokeId); },
    // Sync enemy kills that the painter triggers via red strokes
    onEnemyKilled: ({ enemyId }) => {
      if (!stateRef.current) return;
      for (const chunk of stateRef.current.chunks) {
        const e = chunk.enemies.find(en => en.id === enemyId);
        if (e) { e.alive = false; break; }
      }
    },
    onPing: ({ wx, wy, from }) => {
      pingsRef.current = [...pingsRef.current, { wx, wy, from, born: performance.now() }];
    },
  }).current;

  const { sendRunnerMove, sendGameOver, sendPing, sendWallTime, sendInkRefill } = useInkRunRoom(room?.id ?? null, handlers, ":game");

  // ── state init ──────────────────────────────────────────────────────────────
  function initState() {
    const chunks = [];
    for (let i = 0; i < CHUNKS_AHEAD; i++) chunks.push(generateChunk(i, room.map_seed));
    return {
      rx: RUNNER_START_X,
      ry: GROUND_Y - RUNNER_R,
      vy: 0,
      onGround: true,
      wasOnGround: true,
      hp: MAX_HP,
      invincible: 0,
      hitFlash: 0,
      wallX: -80,
      wallVx: WALL_START_VX,
      wallGrace: WALL_GRACE_S,   // seconds remaining before wall starts
      wallStartedAt: null,       // performance.now() when grace expires — broadcast to painter
      camX: 0,
      chunks,
      nextChunk: CHUNKS_AHEAD,
      distance: 0,
      kills: 0,
      speedBoost: 0,      // seconds remaining of speed boost
      over: false,
      coyoteTime: 0,
      lastTime: performance.now(),
    };
  }

  // ── game loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;

    soundRef.current = makeSounds();

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    strokesRef.current = [];
    strokeHistoryRef.current = [];

    // ── input ────────────────────────────────────────────────────────────────
    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") && (stateRef.current?.onGround || stateRef.current?.coyoteTime > 0)) {
        stateRef.current.vy = JUMP_VY;
        stateRef.current.onGround = false;
        stateRef.current.coyoteTime = 0;
        soundRef.current?.jump();
      }
      // P = ping current position to painter
      if (e.key === "p" || e.key === "P") {
        const st = stateRef.current;
        if (st) sendPing(Math.round(st.rx), Math.round(st.ry), "runner");
      }
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };

    const onTouchStart = (e) => {
      soundRef.current?.unlock();
      e.preventDefault();
      const W = canvas.offsetWidth;
      // Zones: left 25% = move left, right 25% = move right, middle 50% = jump
      // Double-tap middle = send ping at runner position
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const xPct  = touch.clientX / W;
        if (xPct < 0.25) {
          keysRef.current["ArrowLeft"] = true;
        } else if (xPct > 0.75) {
          keysRef.current["ArrowRight"] = true;
        } else {
          // Middle zone = jump; double-tap = ping
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
            // Double-tap: send ping at runner's current world position
            const st = stateRef.current;
            if (st) sendPing(Math.round(st.rx), Math.round(st.ry), "runner");
          }
          lastTapRef.current = now;
          const st = stateRef.current;
          if (st && (st.onGround || st.coyoteTime > 0)) {
            st.vy = JUMP_VY;
            st.onGround = false;
            st.coyoteTime = 0;
            soundRef.current?.jump();
          }
        }
      }
    };
    const onTouchEnd = (e) => {
      e.preventDefault();
      const W = canvas.offsetWidth;
      let hasLeft = false, hasRight = false;
      for (let i = 0; i < e.touches.length; i++) {
        const xPct = e.touches[i].clientX / W;
        if (xPct < 0.25)  hasLeft  = true;
        if (xPct > 0.75)  hasRight = true;
      }
      if (!hasLeft)  delete keysRef.current["ArrowLeft"];
      if (!hasRight) delete keysRef.current["ArrowRight"];
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });

    // ── loop ─────────────────────────────────────────────────────────────────
    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!state || state.over) return;

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const scale = H / WORLD_H;
      const WW    = W / scale;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      // Gather terrain
      const allPlatforms = state.chunks.flatMap(c => c.platforms);
      const allGaps      = state.chunks.flatMap(c => c.gaps);
      const allSpikes    = state.chunks.flatMap(c => c.spikes);

      // Wall — frozen for WALL_GRACE_S seconds at start
      if (state.wallGrace > 0) {
        state.wallGrace = Math.max(0, state.wallGrace - dt);
        // On the frame grace expires, broadcast the authoritative timestamp to the painter
        if (state.wallGrace === 0 && !state.wallStartedAt) {
          state.wallStartedAt = ts;
          sendWallTime(ts);
        }
      } else {
        state.wallVx += WALL_ACCEL * dt;
        state.wallX  += state.wallVx * dt;
      }
      if (state.rx - RUNNER_R < state.wallX) state.rx = state.wallX + RUNNER_R + 2;

      // Movement
      let moveX = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) moveX -= 1;
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) moveX += 1;
      const speedMult = state.speedBoost > 0 ? 1.5 : 1;
      state.rx += moveX * MOVE_SPEED * speedMult * dt;
      state.rx = Math.max(state.wallX + RUNNER_R + 2, state.rx);

      // Gravity + collision
      state.vy += GRAVITY * dt;
      state.ry += state.vy * dt;

      // Terrain wall collision — block horizontal passage
      for (const chunk of state.chunks) {
        for (const w of (chunk.walls || [])) {
          // Only collide if runner overlaps vertically with the wall
          if (state.ry - RUNNER_R < w.y + w.h && state.ry + RUNNER_R > w.y) {
            const runnerLeft  = state.rx - RUNNER_R;
            const runnerRight = state.rx + RUNNER_R;
            const wallLeft    = w.x;
            const wallRight   = w.x + w.w;
            // Moving right into wall
            if (runnerRight > wallLeft && runnerRight < wallLeft + w.w + RUNNER_R * 2 && state.rx < w.x + w.w / 2) {
              state.rx = wallLeft - RUNNER_R - 1;
            }
            // Moving left into wall
            if (runnerLeft < wallRight && runnerLeft > wallRight - w.w - RUNNER_R * 2 && state.rx > w.x + w.w / 2) {
              state.rx = wallRight + RUNNER_R + 1;
            }
          }
        }
      }

      const strokes = strokesRef.current;
      const surface = surfaceUnder(state.rx, state.ry, allGaps, allPlatforms, strokes);
      state.wasOnGround = state.onGround;

      if (surface !== null && state.vy >= 0 && state.ry >= surface - RUNNER_R) {
        state.ry      = surface - RUNNER_R;
        state.vy      = 0;
        state.onGround = true;
        state.coyoteTime = 0.1; // 100ms grace window after leaving ground
        if (!state.wasOnGround) soundRef.current?.land();
      } else {
        if (state.onGround) {
          // Just left the ground — start coyote timer
          state.coyoteTime = state.coyoteTime ?? 0;
        }
        state.onGround = false;
        state.coyoteTime = Math.max(0, (state.coyoteTime ?? 0) - dt);
      }

      // Speed boost timer
      state.speedBoost = Math.max(0, (state.speedBoost ?? 0) - dt);

      // Detect speed/bounce strokes underfoot when on ground
      if (state.onGround) {
        let onSpeed = false;
        for (const stroke of strokes) {
          const sy = strokeYatX(stroke, state.rx);
          if (sy !== null && Math.abs((state.ry + RUNNER_R) - sy) < 8) {
            if (stroke.color === "speed")  onSpeed = true;
            if (stroke.color === "bounce" && !state.wasOnGround) {
              // Just landed on a bounce stroke — launch at 1.5× jump height
              state.vy = JUMP_VY * 1.5;
              state.onGround = false;
              soundRef.current?.jump();
            }
          }
        }
        if (onSpeed) state.speedBoost = Math.max(state.speedBoost, 3);
      }

      // Ink token collection
      for (const chunk of state.chunks) {
        for (const token of (chunk.inkTokens || [])) {
          if (token.collected) continue;
          if (Math.hypot(state.rx - token.x, state.ry - token.y) < RUNNER_R + INK_TOKEN_R) {
            token.collected = true;
            const refillAmount = 400; // ~22% of MAX_INK
            sendInkRefill(token.id, refillAmount);
          }
        }
      }

      // Slope push — if standing on a steep-ish stroke, nudge runner uphill along it
      if (state.onGround) {
        for (const stroke of strokes) {
          if (stroke.color !== "black") continue;
          const pts = stroke.points;
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
            if (state.rx >= minX - 4 && state.rx <= maxX + 4) {
              const dx = b.x - a.x, dy = b.y - a.y;
              const slope = Math.abs(dy) / (Math.max(1, Math.abs(dx)));
              // For slopes between 0.2 and 1.5 (walkable ramps), push runner forward
              if (slope > 0.15 && slope < 1.5 && Math.abs(dx) > 1) {
                // Push is proportional to slope — steeper = more help
                const dir = dx > 0 ? 1 : -1;
                const pushStrength = Math.min(slope * 60, 80);
                // Only push if runner is moving in stroke direction
                const moveX2 = (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) ? 1 :
                               (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) ? -1 : 0;
                if (moveX2 * dir > 0) {
                  state.rx += dir * pushStrength * dt;
                }
              }
            }
          }
        }
      }

      // Void respawn
      if (state.ry > WORLD_H + 80) {
        state.hp = Math.max(0, state.hp - 1);
        soundRef.current?.hit();
        state.rx = state.wallX + RUNNER_R + 80;
        state.ry = GROUND_Y - RUNNER_R;
        state.vy = 0;
        state.onGround   = true;
        state.invincible = INVINCIBLE_S;
        state.hitFlash   = 1;
      }

      // Damage sources
      const dmg = (_src) => {
        if (state.invincible > 0) return;
        state.hp         = Math.max(0, state.hp - 1);
        state.invincible = INVINCIBLE_S;
        state.hitFlash   = 1;
        soundRef.current?.hit();
      };

      if (state.invincible === 0) {
        if (touchesRedStroke(state.rx, state.ry, strokes, RUNNER_R)) dmg("red");
      }
      if (state.invincible === 0) {
        for (const chunk of state.chunks) {
          for (const e of chunk.enemies) {
            if (!e.alive) continue;
            if (Math.hypot(state.rx - e.x, state.ry - e.y) < RUNNER_R + ENEMY_R) { dmg("enemy"); break; }
          }
        }
      }
      if (state.invincible === 0) {
        for (const s of allSpikes) {
          // Only collide with the top portion (spike tips), not the full base
          const hitTop = s.y + (s.h - (s.hitH ?? s.h));
          if (state.rx + RUNNER_R > s.x && state.rx - RUNNER_R < s.x + s.w &&
              state.ry + RUNNER_R > hitTop && state.ry - RUNNER_R < s.y + s.h) { dmg("spike"); break; }
        }
      }

      // Stomp — runner falling onto an enemy kills it
      if (state.vy > 80) {
        for (const chunk of state.chunks) {
          for (const e of chunk.enemies) {
            if (!e.alive) continue;
            const dx = state.rx - e.x;
            const dy = state.ry - e.y;
            // Must be coming from above (runner bottom overlapping enemy top half)
            if (Math.abs(dx) < RUNNER_R + 10 && dy < 0 && dy > -(RUNNER_R + 18)) {
              e.alive = false;
              state.kills++;
              state.vy = JUMP_VY * 0.55; // bounce
              soundRef.current?.jump();
              break;
            }
          }
        }
      }

      if (state.invincible > 0) state.invincible = Math.max(0, state.invincible - dt);
      if (state.hitFlash  > 0) state.hitFlash   = Math.max(0, state.hitFlash   - dt * 3);

      if (state.hp <= 0) {
        state.over = true;
        const finalStats = { distance: Math.floor(state.distance), kills: state.kills, strokes: strokeHistoryRef.current.length };
        sendGameOver(finalStats);
        onGameOver(finalStats, strokeHistoryRef.current);
        return;
      }

      state.distance = Math.max(state.distance, Math.floor((state.rx - RUNNER_START_X) / 10));

      // Enemy update + red-kill
      state.chunks.forEach(chunk => updateEnemies(chunk.enemies, dt, t));
      state.chunks.forEach(chunk => {
        chunk.enemies.forEach(e => {
          if (!e.alive) return;
          for (const stroke of strokes) {
            if (stroke.color !== "red") continue;
            for (let i = 0; i < stroke.points.length - 1; i++) {
              const a = stroke.points[i], b = stroke.points[i+1];
              const dx = b.x-a.x, dy = b.y-a.y, len2 = dx*dx+dy*dy||1;
              const t2  = Math.max(0, Math.min(1, ((e.x-a.x)*dx+(e.y-a.y)*dy)/len2));
              if (Math.hypot(e.x-(a.x+t2*dx), e.y-(a.y+t2*dy)) < ENEMY_R+6) {
                e.alive = false; state.kills++;
              }
            }
          }
        });
      });

      // Camera
      const targetCamX = state.rx - WW * 0.32;
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      // Chunk management
      const rightmost = maxChunkIndex(state.chunks);
      if ((rightmost + 1) * CHUNK_W - state.camX < WW * 2.5) {
        state.chunks.push(generateChunk(state.nextChunk, room.map_seed));
        state.nextChunk++;
      }
      state.chunks = state.chunks.filter(c => (c.chunkIndex + 1) * CHUNK_W > state.camX - 200);

      // Trim / cull strokes eaten by wall (trim points gradually as wall advances)
      strokesRef.current = strokesRef.current.flatMap(s => {
        const live = s.points.filter(p => p.x >= state.wallX - 8);
        if (live.length === 0) return [];
        if (live.length < s.points.length) return [{ ...s, points: live }];
        return [s];
      });

      // Broadcast — include wallX so the painter mirrors the exact same wall position
      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunnerMove(state.rx, state.ry, state.vy, state.onGround ? "ground" : "air", state.wallX);
        lastMoveRef.current = ts;
      }

      // ── DRAW ────────────────────────────────────────────────────────────────
      const camX = state.camX;
      const wallSX = state.wallX - camX;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.scale(scale, scale);

      // Ground (uses fixed helper)
      drawGround(ctx, state.chunks, camX, WW);

      // Platforms
      state.chunks.forEach(chunk => {
        chunk.platforms.forEach(p => {
          const sx = p.x - camX;
          if (sx > WW + 20 || sx + p.w < -20) return;
          ctx.fillStyle   = "#2a2a4a"; ctx.fillRect(sx, p.y, p.w, p.h);
          ctx.strokeStyle = "#4a4a7a"; ctx.lineWidth = 1; ctx.strokeRect(sx, p.y, p.w, p.h);
        });

        // Terrain walls
        (chunk.walls || []).forEach(w => {
          const sx = w.x - camX;
          if (sx > WW + 20 || sx + w.w < -20) return;
          // Body
          ctx.fillStyle = "#2a1a4a";
          ctx.fillRect(sx, w.y, w.w, w.h);
          // Edge highlight
          ctx.strokeStyle = "#7a4aaa";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, w.y, w.w, w.h);
          // Warning stripes at top
          ctx.save();
          ctx.beginPath(); ctx.rect(sx, w.y, w.w, 8); ctx.clip();
          ctx.fillStyle = "rgba(180,80,255,0.5)";
          ctx.fillRect(sx, w.y, w.w, 8);
          ctx.restore();
        });

        // Spikes
        chunk.spikes.forEach(s => {
          const sx = s.x - camX;
          if (sx < -30 || sx > WW + 30) return;
          ctx.save();
          ctx.translate(sx, s.y);
          const pulse = 0.65 + 0.35 * Math.sin(t * 2.5 + s.x);
          ctx.globalAlpha = pulse;
          // simple triangle spikes
          const count = Math.max(2, Math.round(s.w / 10));
          const sw = s.w / count;
          ctx.fillStyle = "#cc3333";
          for (let i = 0; i < count; i++) {
            ctx.beginPath();
            ctx.moveTo(i * sw, s.h);
            ctx.lineTo(i * sw + sw / 2, 0);
            ctx.lineTo((i + 1) * sw, s.h);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        });

        // Enemies
        chunk.enemies.forEach(e => {
          if (!e.alive) return;
          const sx = e.x - camX, sy = e.y;
          if (sx < -30 || sx > WW + 30) return;
          ctx.save();
          const pulse = 0.7 + 0.3 * Math.sin(t * 3 + e.x);
          ctx.globalAlpha = e.hitFlash > 0 ? 1 : pulse;
          if (e.type === "walker") {
            ctx.beginPath(); ctx.arc(sx, sy, ENEMY_R, 0, Math.PI * 2);
            ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "rgba(255,140,60,0.9)";
            ctx.fill();
            ctx.fillStyle = "#0a0a0f";
            ctx.beginPath(); ctx.arc(sx + e.dir * 4, sy - 3, 3, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(sx, sy - ENEMY_R * 1.2);
            ctx.lineTo(sx + ENEMY_R, sy);
            ctx.lineTo(sx, sy + ENEMY_R * 0.8);
            ctx.lineTo(sx - ENEMY_R, sy);
            ctx.closePath();
            ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "rgba(255,80,180,0.9)";
            ctx.fill();
          }
          ctx.restore();
        });
      });

      // Expire old pings (3s lifetime)
      pingsRef.current = pingsRef.current.filter(p => ts - p.born < 3000);

      // Painted strokes
      for (const stroke of strokes) {
        if (!stroke.points || stroke.points.length < 2) continue;
        ctx.save();
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i], sx = p.x - camX;
          i === 0 ? ctx.moveTo(sx, p.y) : ctx.lineTo(sx, p.y);
        }
        const glowColor = stroke.color === "speed"  ? "rgba(80,220,255,0.22)"
                        : stroke.color === "bounce" ? "rgba(80,255,160,0.22)"
                        : "rgba(180,160,255,0.18)";
        const lineColor = stroke.color === "speed"  ? "rgba(80,220,255,0.95)"
                        : stroke.color === "bounce" ? "rgba(80,255,160,0.95)"
                        : "rgba(220,230,255,0.88)";
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
      }

      // Ink tokens
      for (const chunk of state.chunks) {
        for (const token of (chunk.inkTokens || [])) {
          if (token.collected) continue;
          const tx = token.x - camX, ty = token.y;
          if (tx < -40 || tx > WW + 40) continue;
          const pulse = 0.7 + 0.3 * Math.sin(t * 3 + token.x);
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.arc(tx, ty, INK_TOKEN_R, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(180,140,255,0.25)";
          ctx.fill();
          ctx.strokeStyle = "rgba(180,140,255,0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
          // ink drop icon
          ctx.fillStyle = "rgba(220,200,255,0.9)";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("ink", tx, ty);
          ctx.restore();
        }
      }

      // Pings — world-space markers sent by painter
      for (const ping of pingsRef.current) {
        const age   = (ts - ping.born) / 3000;
        const alpha = 1 - age;
        const px    = ping.wx - camX;
        const py    = ping.wy;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, 16 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,220,80,0.9)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,220,80,0.9)";
        ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "rgba(255,220,80,0.9)";
        ctx.textAlign = "center";
        ctx.fillText("painter", px, py - 24);
        ctx.restore();
      }

      // Wall
      const grad   = ctx.createLinearGradient(wallSX - 40, 0, wallSX, 0);
      grad.addColorStop(0, "rgba(120,60,200,0)");
      grad.addColorStop(1, "rgba(120,60,200,0.85)");
      ctx.fillStyle = grad; ctx.fillRect(wallSX - 40, 0, 40, WORLD_H);
      ctx.fillStyle = "rgba(160,80,255,0.9)"; ctx.fillRect(wallSX, 0, 4, WORLD_H);

      // Runner
      const rx = state.rx - camX, ry = state.ry;
      const blink = state.invincible > 0 && Math.floor(t * 8) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.beginPath(); ctx.arc(rx, ry, RUNNER_R + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,140,255,0.15)"; ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ry, RUNNER_R, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,170,255,0.95)"; ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // end world scale

      // Hit flash
      if (state.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = state.hitFlash * 0.35;
        ctx.fillStyle   = "#ff3333";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // HUD
      ctx.save();
      ctx.font = "500 20px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(`${Math.floor(state.distance)}m`, 18, 34);
      for (let i = 0; i < MAX_HP; i++) {
        ctx.beginPath(); ctx.arc(18 + i * 18, 54, 6, 0, Math.PI * 2);
        ctx.fillStyle = i < state.hp ? "rgba(180,140,255,0.9)" : "rgba(255,255,255,0.12)";
        ctx.fill();
      }
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,100,100,0.7)";
      ctx.fillText(`${state.kills} kills`, 18, 74);
      // Speed boost indicator
      if (state.speedBoost > 0) {
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "rgba(80,220,255,0.9)";
        ctx.textAlign = "left";
        ctx.fillText(`⚡ ${state.speedBoost.toFixed(1)}s`, 18, 90);
      }
      // Grace period countdown
      if (state.wallGrace > 0) {
        const secs = Math.ceil(state.wallGrace);
        ctx.textAlign = "center";
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "rgba(160,80,255,0.9)";
        ctx.fillText(`wall moves in ${secs}s`, W / 2, 26);
        // Pulse ring around wall position
        const wallSXhud = state.wallX - state.camX;
        if (wallSXhud > -80 && wallSXhud < W + 80) {
          ctx.strokeStyle = `rgba(160,80,255,${0.3 + 0.3 * Math.sin(t * 4)})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(Math.max(0, wallSXhud * scale), 0);
          ctx.lineTo(Math.max(0, wallSXhud * scale), H);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.textAlign = "right";
      ctx.fillText("runner", W - 18, 28);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0a0f", position: "relative", userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
      {/* Touch hint */}
      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, color: "rgba(255,255,255,0.15)", pointerEvents: "none",
        letterSpacing: "0.06em", whiteSpace: "nowrap",
      }}>
        ◀ left · tap middle to jump (double-tap = ping) · right ▶  ·  [P] to ping
      </div>
    </div>
  );
}