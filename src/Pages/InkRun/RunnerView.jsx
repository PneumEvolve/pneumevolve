// src/Pages/InkRun/RunnerView.jsx
import React, { useEffect, useRef } from "react";
import { useInkRunRoom } from "./useInkRunRoom";
import {
  WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R, WALL_GRACE_S,
  generateChunk, surfaceUnder, touchesRedStroke, updateEnemies,
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
function maxPointX(pts) {
  let m = -Infinity;
  for (let i = 0; i < pts.length; i++) if (pts[i].x > m) m = pts[i].x;
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

  const handlers = useRef({
    onStrokeAdded:    ({ stroke })   => { strokesRef.current = [...strokesRef.current, stroke]; },
    onStrokeReclaimed:({ strokeId }) => { strokesRef.current = strokesRef.current.filter(s => s.id !== strokeId); },
  }).current;

  const { sendRunnerMove, sendGameOver } = useInkRunRoom(room?.id ?? null, handlers, ":game");

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
      camX: 0,
      chunks,
      nextChunk: CHUNKS_AHEAD,
      distance: 0,
      kills: 0,
      over: false,
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

    // ── input ────────────────────────────────────────────────────────────────
    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") && stateRef.current?.onGround) {
        stateRef.current.vy = JUMP_VY;
        stateRef.current.onGround = false;
        soundRef.current?.jump();
      }
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };

    const onTouchStart = (e) => {
      soundRef.current?.unlock();
      e.preventDefault();
      const touch = e.touches[0];
      const halfW = canvas.offsetWidth / 2;
      if (touch.clientX < halfW * 0.4) {
        keysRef.current["ArrowLeft"] = true;
      } else if (touch.clientX > halfW * 1.6) {
        keysRef.current["ArrowRight"] = true;
      } else {
        if (stateRef.current?.onGround) {
          stateRef.current.vy = JUMP_VY;
          stateRef.current.onGround = false;
          soundRef.current?.jump();
        }
      }
    };
    const onTouchEnd = (e) => {
      e.preventDefault();
      delete keysRef.current["ArrowLeft"];
      delete keysRef.current["ArrowRight"];
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
      } else {
        state.wallVx += WALL_ACCEL * dt;
        state.wallX  += state.wallVx * dt;
      }
      if (state.rx - RUNNER_R < state.wallX) state.rx = state.wallX + RUNNER_R + 2;

      // Movement
      let moveX = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) moveX -= 1;
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) moveX += 1;
      state.rx += moveX * MOVE_SPEED * dt;
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
        if (!state.wasOnGround) soundRef.current?.land();
      } else {
        state.onGround = false;
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
          if (state.rx + RUNNER_R > s.x && state.rx - RUNNER_R < s.x + s.w &&
              state.ry + RUNNER_R > s.y && state.ry - RUNNER_R < s.y + s.h) { dmg("spike"); break; }
        }
      }

      if (state.invincible > 0) state.invincible = Math.max(0, state.invincible - dt);
      if (state.hitFlash  > 0) state.hitFlash   = Math.max(0, state.hitFlash   - dt * 3);

      if (state.hp <= 0) {
        state.over = true;
        onGameOver({ distance: Math.floor(state.distance), kills: state.kills, strokes: strokesRef.current.length }, strokesRef.current);
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

      // Cull old strokes
      strokesRef.current = strokesRef.current.filter(s => maxPointX(s.points) > state.wallX - 20);

      // Broadcast — include wallX so the painter mirrors the exact same wall position
      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunnerMove(state.rx, state.ry, state.vy, state.onGround ? "ground" : "air", state.wallX);
        lastMoveRef.current = ts;
      }

      // ── DRAW ────────────────────────────────────────────────────────────────
      const camX = state.camX;

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
        ctx.strokeStyle = stroke.color === "red" ? "rgba(255,80,80,0.18)" : "rgba(180,160,255,0.18)";
        ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = stroke.color === "red" ? "rgba(255,80,80,0.9)" : "rgba(220,230,255,0.88)";
        ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
      }

      // Wall
      const wallSX = state.wallX - camX;
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
        ← left · tap middle to jump · right →
      </div>
    </div>
  );
}