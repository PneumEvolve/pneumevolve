// src/Pages/InkRun/PainterView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useInkRunRoom } from "./useInkRunRoom";
import { WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R, WALL_GRACE_S, generateChunk, updateEnemies } from "./gameEngine";

const MAX_INK      = 1800;
const CHUNKS_AHEAD = 6;
const ENEMY_R      = 14;

function maxChunkIndex(chunks) {
  let m = 0;
  for (let i = 0; i < chunks.length; i++) if (chunks[i].chunkIndex > m) m = chunks[i].chunkIndex;
  return m;
}
function strokeLen(stroke) {
  let len = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    len += Math.hypot(stroke.points[i].x - stroke.points[i-1].x, stroke.points[i].y - stroke.points[i-1].y);
  }
  return len;
}

// ─── ground rendering (same fixed helper as RunnerView) ───────────────────────
function drawGround(ctx, chunks, camX, WW) {
  const gaps = [];
  for (const chunk of chunks) {
    for (const g of chunk.gaps) {
      const sx = g.x - camX, ex = sx + g.w;
      if (ex > 0 && sx < WW) gaps.push({ sx, ex });
    }
  }
  gaps.sort((a, b) => a.sx - b.sx);

  ctx.fillStyle = "#1c1c32";
  let cursor = 0;
  for (const g of gaps) {
    const start = Math.max(0, g.sx), end = Math.min(WW, g.ex);
    if (start > cursor) ctx.fillRect(cursor, GROUND_Y, start - cursor, WORLD_H - GROUND_Y);
    cursor = end;
  }
  if (cursor < WW) ctx.fillRect(cursor, GROUND_Y, WW - cursor, WORLD_H - GROUND_Y);

  ctx.strokeStyle = "#4a4a7a"; ctx.lineWidth = 2;
  cursor = 0;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
  for (const g of gaps) {
    const start = Math.max(0, g.sx), end = Math.min(WW, g.ex);
    if (start > cursor) ctx.lineTo(start, GROUND_Y);
    ctx.moveTo(end, GROUND_Y);
    cursor = end;
  }
  if (cursor < WW) ctx.lineTo(WW, GROUND_Y);
  ctx.stroke();
}

export default function PainterView({ room, onGameOver }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const strokesRef = useRef([]);
  const strokeHistoryRef = useRef([]); // append-only — never trimmed; used for end-of-game timelapse
  const strokeIdRef = useRef(0);
  const colorRef   = useRef("black");
  const pingsRef   = useRef([]);         // { wx, wy, from, born }
  const gameOverFiredRef = useRef(false); // guard against double-fire
  // runnerTargetRef: last received broadcast position (raw, may be snappy)
  // runnerDispRef:   smoothly interpolated display position
  const runnerTargetRef = useRef({ x: 160, y: GROUND_Y - RUNNER_R, vy: 0, state: "ground" });
  const runnerDispRef   = useRef({ x: 160, y: GROUND_Y - RUNNER_R });

  const [color,    setColor]    = useState("black");
  const [inkUsed,  setInkUsed]  = useState(0);

  const totalInk = () => strokesRef.current.reduce((s, st) => s + strokeLen(st), 0);

  const handlers = useRef({
    onRunnerMove: ({ x, y, vy, state: rs, wallX }) => {
      runnerTargetRef.current = { x, y, vy, state: rs };
      // Mirror the runner's authoritative wall position directly — no local simulation
      if (wallX !== undefined && stateRef.current) {
        stateRef.current.wallX = wallX;
      }
    },
    // Runner broadcasts exact timestamp when grace expires — sync wall timer to it
    onWallTime: ({ startedAt }) => {
      if (!stateRef.current) return;
      stateRef.current.wallGrace    = 0;
      stateRef.current.wallStartedAt = startedAt;
    },
    onGameOver: (stats) => {
      if (gameOverFiredRef.current) return;
      gameOverFiredRef.current = true;
      onGameOver(stats, strokeHistoryRef.current);
    },
    onPing: ({ wx, wy, from }) => {
      pingsRef.current = [...pingsRef.current, { wx, wy, from, born: performance.now() }];
    },
  }).current;

  const { sendStrokeAdded, sendStrokeReclaimed, sendEnemyKilled, sendPing } =
    useInkRunRoom(room?.id ?? null, handlers, ":game");

  // Send player_ready on the bare channel (no suffix) — that's what WaitingForPlayer2
  // on the runner's screen subscribes to. The root hook has activeRoomId=null by the
  // time p2 reaches "playing" phase, so it can never send this itself.
  const bareHandlers = useRef({}).current;
  const { sendPlayerReady } = useInkRunRoom(room?.id ?? null, bareHandlers);
  useEffect(() => {
    sendPlayerReady();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function initState() {
    const chunks = [];
    for (let i = 0; i < CHUNKS_AHEAD; i++) chunks.push(generateChunk(i, room.map_seed));
    return {
      camX: 0, camTargetX: 0, following: true,
      dragging: false, dragStartMX: 0, dragStartCX: 0,
      chunks, nextChunk: CHUNKS_AHEAD,
      drawing: false, currentStroke: null, didDrag: false,
      wallX: -80, wallVx: 60, wallGrace: WALL_GRACE_S,
      wallStartedAt: null,  // set when runner broadcasts wall_time
      lastTime: performance.now(),
    };
  }

  function canvasToWorld(cx, cy) {
    const canvas = canvasRef.current;
    const scale = canvas ? canvas.height / WORLD_H : 1;
    return { wx: cx / scale + stateRef.current.camX, wy: cy / scale };
  }

  // pointer drawing — mouse/stylus only; touch is handled by onTouch* imperatively
  function onPointerDown(e) {
    if (e.pointerType === "touch") return; // handled by touchstart
    e.preventDefault();
    beginStroke(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    continueStroke(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    finishStroke();
  }

  const touchCountRef = useRef(0);

  // Shared draw-start logic used by both pointer and touch paths
  function beginStroke(clientX, clientY) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const cy = clientY - rect.top;
    if (cy < 44) return; // HUD guard
    if (totalInk() >= MAX_INK) return;
    const { wx, wy } = canvasToWorld(clientX - rect.left, cy);
    const id = `s${++strokeIdRef.current}_${Date.now()}`;
    stateRef.current.drawing = true;
    stateRef.current.didDrag = false;
    stateRef.current.currentStroke = { id, color: colorRef.current, points: [{ x: wx, y: wy }] };
  }

  function continueStroke(clientX, clientY) {
    const state = stateRef.current;
    if (!state?.drawing || !state.currentStroke) return;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const { wx, wy } = canvasToWorld(clientX - rect.left, clientY - rect.top);
    const pts  = state.currentStroke.points;
    const last = pts[pts.length - 1];
    if (Math.hypot(wx - last.x, wy - last.y) < 4) return;
    const tentLen  = strokeLen({ points: [...pts, { x: wx, y: wy }] });
    const otherInk = strokesRef.current.reduce((s, st) => s + strokeLen(st), 0);
    if (otherInk + tentLen > MAX_INK) return;
    pts.push({ x: wx, y: wy });
    state.didDrag = true;
  }

  function finishStroke() {
    const state = stateRef.current;
    if (!state?.drawing || !state.currentStroke) return;
    state.drawing = false;
    const stroke = state.currentStroke;
    state.currentStroke = null;
    if (!state.didDrag || stroke.points.length < 2) {
      // Single tap with no drag = ping at that location
      if (stroke.points.length >= 1) {
        const { x: wx, y: wy } = stroke.points[0];
        pingsRef.current = [...pingsRef.current, { wx, wy, from: "painter", born: performance.now() }];
        sendPing(Math.round(wx), Math.round(wy), "painter");
      }
      return;
    }
    strokesRef.current = [...strokesRef.current, stroke];
    strokeHistoryRef.current = [...strokeHistoryRef.current, { ...stroke, points: [...stroke.points] }];
    setInkUsed(totalInk());
    sendStrokeAdded(stroke);
  }

  function onTouchStart(e) {
    touchCountRef.current = e.touches.length;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const state = stateRef.current; if (!state) return;
      // Cancel any in-progress stroke before switching to drag
      if (state.drawing) { state.drawing = false; state.currentStroke = null; }
      state.dragging = true; state.following = false;
      state.dragStartMX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      state.dragStartCX = state.camX;
    } else {
      e.preventDefault();
      beginStroke(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length >= 2) {
      const state = stateRef.current; if (!state?.dragging) return;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      state.camX = state.dragStartCX - (mx - state.dragStartMX);
    } else {
      continueStroke(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  function onTouchEnd(e) {
    e.preventDefault();
    touchCountRef.current = e.touches.length;
    if (stateRef.current?.dragging) { stateRef.current.dragging = false; }
    else { finishStroke(); }
  }

  function handleRecenter() {
    if (!stateRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const WW = canvas.width / (canvas.height / WORLD_H);
    stateRef.current.following   = true;
    stateRef.current.camTargetX  = runnerTargetRef.current.x - WW * 0.32;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current   = initState();
    strokesRef.current = [];
    strokeHistoryRef.current = [];
    gameOverFiredRef.current = false;

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const scale = H / WORLD_H;
      const WW    = W / scale;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      // Wall position is authoritative from the runner via onRunnerMove broadcast.
      // Grace is authoritative via onWallTime. Only use local simulation before first sync arrives.
      if (state.wallGrace > 0) {
        state.wallGrace = Math.max(0, state.wallGrace - dt);
        // Note: if wallGrace hits 0 here locally, we wait for runner's onWallTime
        // to actually set wallStartedAt before advancing wall locally.
      } else if (!state.wallStartedAt && runnerTargetRef.current.wallX === undefined) {
        // Fallback: runner hasn't broadcast yet at all, simulate locally
        state.wallVx += 2.5 * dt;
        state.wallX  += state.wallVx * dt;
      }
      // Once wallX arrives via onRunnerMove, stateRef.wallX is set there directly

      // Reclaim / trim strokes eaten by wall
      const beforeCount = strokesRef.current.length;
      const beforeInk   = totalInk();
      strokesRef.current = strokesRef.current.flatMap(s => {
        // Trim all points behind the wall
        const live = s.points.filter(p => p.x >= state.wallX - 8);
        if (live.length === 0) { sendStrokeReclaimed(s.id); return []; }
        if (live.length < s.points.length) {
          return [{ ...s, points: live }];
        }
        return [s];
      });
      // Update ink bar whenever strokes change (either removed or trimmed)
      if (strokesRef.current.length !== beforeCount || Math.abs(totalInk() - beforeInk) > 5) {
        setInkUsed(totalInk());
      }

      // Ink regenerates slowly over time (15 units/s) — encourages strategic redrawing
      // We implement this by slightly shortening the oldest strokes from their start
      const INK_REGEN_RATE = 15; // world-units per second
      const regenAmount = INK_REGEN_RATE * dt;
      let toRegen = regenAmount;
      if (toRegen > 0 && strokesRef.current.length > 0) {
        strokesRef.current = strokesRef.current.flatMap(s => {
          if (toRegen <= 0) return [s];
          // Trim from the beginning of the oldest stroke
          const pts = s.points;
          let trimmed = [...pts];
          while (trimmed.length >= 2 && toRegen > 0) {
            const segLen = Math.hypot(trimmed[1].x - trimmed[0].x, trimmed[1].y - trimmed[0].y);
            if (segLen <= toRegen) {
              toRegen -= segLen;
              trimmed = trimmed.slice(1);
            } else {
              // Partial trim — move start point along the segment
              const ratio = toRegen / segLen;
              trimmed[0] = {
                x: trimmed[0].x + (trimmed[1].x - trimmed[0].x) * ratio,
                y: trimmed[0].y + (trimmed[1].y - trimmed[0].y) * ratio,
              };
              toRegen = 0;
            }
          }
          if (trimmed.length < 2) return [];
          return [{ ...s, points: trimmed }];
        });
        setInkUsed(totalInk());
      }

      // Interpolate displayed runner position toward broadcast target (fixes jitter)
      const target = runnerTargetRef.current;
      const disp   = runnerDispRef.current;
      const lerpK  = Math.min(1, 12 * dt); // ~12 Hz smoothing — fast enough to feel live
      disp.x += (target.x - disp.x) * lerpK;
      disp.y += (target.y - disp.y) * lerpK;

      // Camera follow runner
      if (state.following) state.camTargetX = target.x - WW * 0.32;
      if (!state.dragging) {
        const alpha = Math.min(1, 8 * dt);
        state.camX += (state.camTargetX - state.camX) * alpha;
      } else {
        state.camTargetX = state.camX;
      }

      // Chunk management
      const rightmost = maxChunkIndex(state.chunks);
      if ((rightmost + 1) * CHUNK_W - state.camX < WW * 3) {
        state.chunks.push(generateChunk(state.nextChunk, room.map_seed));
        state.nextChunk++;
      }
      state.chunks = state.chunks.filter(c => (c.chunkIndex + 1) * CHUNK_W > state.camX - 200);

      // Enemy AI + red-stroke kills
      state.chunks.forEach(chunk => updateEnemies(chunk.enemies, dt, t));
      state.chunks.forEach(chunk => {
        chunk.enemies.forEach(e => {
          if (!e.alive) return;
          for (const stroke of strokesRef.current) {
            if (stroke.color !== "red") continue;
            for (let i = 0; i < stroke.points.length - 1; i++) {
              const a = stroke.points[i], b = stroke.points[i+1];
              const dx = b.x-a.x, dy = b.y-a.y, len2 = dx*dx+dy*dy||1;
              const t2  = Math.max(0, Math.min(1, ((e.x-a.x)*dx+(e.y-a.y)*dy)/len2));
              if (Math.hypot(e.x-(a.x+t2*dx), e.y-(a.y+t2*dy)) < ENEMY_R+6) {
                e.alive = false; sendEnemyKilled(e.id);
              }
            }
          }
        });
      });

      // ── DRAW ────────────────────────────────────────────────────────────────
      const camX   = state.camX;
      const strokes = strokesRef.current;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.scale(scale, scale);

      // Ground (fixed helper)
      drawGround(ctx, state.chunks, camX, WW);

      // Platforms + spikes + enemies
      state.chunks.forEach(chunk => {
        chunk.platforms.forEach(p => {
          const sx = p.x - camX;
          if (sx > WW + 20 || sx + p.w < -20) return;
          ctx.fillStyle = "#2a2a4a"; ctx.fillRect(sx, p.y, p.w, p.h);
          ctx.strokeStyle = "#4a4a7a"; ctx.lineWidth = 1; ctx.strokeRect(sx, p.y, p.w, p.h);
        });

        // Terrain walls
        (chunk.walls || []).forEach(w => {
          const sx = w.x - camX;
          if (sx > WW + 20 || sx + w.w < -20) return;
          ctx.fillStyle = "#2a1a4a";
          ctx.fillRect(sx, w.y, w.w, w.h);
          ctx.strokeStyle = "#7a4aaa";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, w.y, w.w, w.h);
          ctx.save();
          ctx.beginPath(); ctx.rect(sx, w.y, w.w, 8); ctx.clip();
          ctx.fillStyle = "rgba(180,80,255,0.5)";
          ctx.fillRect(sx, w.y, w.w, 8);
          ctx.restore();
        });

        chunk.spikes.forEach(s => {
          const sx = s.x - camX;
          if (sx < -30 || sx > WW + 30) return;
          ctx.save(); ctx.translate(sx, s.y);
          const pulse = 0.65 + 0.35 * Math.sin(t * 2.5 + s.x);
          ctx.globalAlpha = pulse;
          const count = Math.max(2, Math.round(s.w / 10));
          const sw = s.w / count;
          ctx.fillStyle = "#cc3333";
          for (let i = 0; i < count; i++) {
            ctx.beginPath();
            ctx.moveTo(i * sw, s.h); ctx.lineTo(i * sw + sw/2, 0); ctx.lineTo((i+1)*sw, s.h);
            ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        });

        chunk.enemies.forEach(e => {
          if (!e.alive) return;
          const sx = e.x - camX, sy = e.y;
          if (sx < -30 || sx > WW + 30) return;
          const pulse = 0.7 + 0.3 * Math.sin(t * 3 + e.x);
          ctx.save(); ctx.globalAlpha = pulse;
          if (e.type === "walker") {
            ctx.beginPath(); ctx.arc(sx, sy, ENEMY_R, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,140,60,0.9)"; ctx.fill();
            ctx.fillStyle = "#0a0a0f";
            ctx.beginPath(); ctx.arc(sx + e.dir*4, sy-3, 3, 0, Math.PI*2); ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(sx, sy-ENEMY_R*1.2); ctx.lineTo(sx+ENEMY_R, sy);
            ctx.lineTo(sx, sy+ENEMY_R*0.8); ctx.lineTo(sx-ENEMY_R, sy);
            ctx.closePath(); ctx.fillStyle = "rgba(255,80,180,0.9)"; ctx.fill();
          }
          ctx.restore();
        });
      });

      // Committed strokes
      for (const stroke of strokes) {
        if (!stroke.points || stroke.points.length < 2) continue;
        ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
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

      // Live stroke preview
      if (state.currentStroke?.points?.length > 1) {
        const s = state.currentStroke;
        ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([8, 4]);
        ctx.strokeStyle = s.color === "red" ? "rgba(255,80,80,0.6)" : "rgba(220,230,255,0.6)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let i = 0; i < s.points.length; i++) {
          const p = s.points[i], sx = p.x - camX;
          i === 0 ? ctx.moveTo(sx, p.y) : ctx.lineTo(sx, p.y);
        }
        ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }

      // Expire old pings (3s lifetime)
      pingsRef.current = pingsRef.current.filter(p => ts - p.born < 3000);

      // Pings — world-space markers sent by runner (yellow) or painter (cyan)
      for (const ping of pingsRef.current) {
        const age   = (ts - ping.born) / 3000;
        const alpha = 1 - age;
        const px    = ping.wx - camX;
        const py    = ping.wy;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, 16 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.textAlign = "center";
        ctx.fillText(ping.from === "runner" ? "runner" : "here!", px, py - 24);
        ctx.restore();
      }

      // Wall
      const wallSX = state.wallX - camX;
      const grad   = ctx.createLinearGradient(wallSX-40, 0, wallSX, 0);
      grad.addColorStop(0, "rgba(120,60,200,0)");
      grad.addColorStop(1, "rgba(120,60,200,0.7)");
      ctx.fillStyle = grad; ctx.fillRect(wallSX-40, 0, 40, WORLD_H);
      ctx.fillStyle = "rgba(160,80,255,0.8)"; ctx.fillRect(wallSX, 0, 3, WORLD_H);

      // Runner dot (smoothly interpolated)
      const rx = runnerDispRef.current.x - camX, ry = runnerDispRef.current.y;
      ctx.save();
      ctx.beginPath(); ctx.arc(rx, ry, RUNNER_R+6, 0, Math.PI*2);
      ctx.fillStyle = "rgba(180,140,255,0.15)"; ctx.fill();
      ctx.beginPath(); ctx.arc(rx, ry, RUNNER_R, 0, Math.PI*2);
      ctx.fillStyle = "rgba(200,170,255,0.9)"; ctx.fill();
      ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
      ctx.restore();

      ctx.restore(); // end world scale

      // HUD — ink bar
      const inkPct = Math.min(1, totalInk() / MAX_INK);
      const inkRemaining = 1 - inkPct;
      const barW = W - 36;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(18, 10, barW, 7, 4); ctx.fill();
      ctx.fillStyle = inkPct > 0.8 ? "rgba(255,80,80,0.8)" : inkPct > 0.5 ? "rgba(255,200,80,0.8)" : "rgba(180,140,255,0.8)";
      ctx.beginPath(); ctx.roundRect(18, 10, barW * inkRemaining, 7, 4); ctx.fill();
      ctx.save();
      ctx.font = "11px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(`ink ${Math.floor(inkRemaining * 100)}%`, 18, 38);
      // Grace countdown
      if (state.wallGrace > 0) {
        const secs = Math.ceil(state.wallGrace);
        ctx.textAlign = "center";
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "rgba(160,80,255,0.85)";
        ctx.fillText(`wall moves in ${secs}s`, W / 2, 26);
      }
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.textAlign = "right";
      ctx.fillText("painter", W - 18, 38);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const inkPct   = Math.min(1, inkUsed / MAX_INK);
  const inkLeft  = Math.floor((1 - inkPct) * 100);
  const outOfInk = inkLeft === 0;

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0a0f", position: "relative", overflow: "hidden", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: outOfInk ? "not-allowed" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Color buttons */}
      <div style={{ position: "absolute", bottom: 24, right: 14, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <button onClick={handleRecenter} style={{
          background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.15)",
          borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 11, padding: "5px 10px", cursor: "pointer",
        }}>re-center</button>
        <button onClick={() => { setColor("black"); colorRef.current = "black"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "black" ? "rgba(220,230,255,0.9)" : "rgba(220,230,255,0.25)",
          boxShadow: color === "black" ? "0 0 0 2px rgba(180,140,255,0.7)" : "none",
        }} />
        <button onClick={() => { setColor("red"); colorRef.current = "red"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "red" ? "rgba(255,80,80,0.9)" : "rgba(255,80,80,0.25)",
          boxShadow: color === "red" ? "0 0 0 2px rgba(255,80,80,0.7)" : "none",
        }} />
      </div>

      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, color: "rgba(255,255,255,0.15)", pointerEvents: "none",
        letterSpacing: "0.06em", whiteSpace: "nowrap",
      }}>
        {outOfInk ? "out of ink — wall will reclaim soon" : "draw to help · tap to ping · 2-finger drag to scroll"}
      </div>
    </div>
  );
}