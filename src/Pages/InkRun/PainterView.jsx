// src/Pages/InkRun/PainterView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useInkRunRoom } from "./useInkRunRoom";
import {
  WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R, WALL_GRACE_S, INK_TOKEN_R,
  generateChunk, updateEnemies, updatePlatforms, groundYatX,
  surfaceUnder, strokeYatX, settleStroke,
} from "./gameEngine";

const MAX_INK         = 1800;
const CHUNKS_AHEAD    = 6;
const ENEMY_R         = 14;
const INK_EATER_R     = 18;
const INK_EATER_RESPAWN_S = 30;
// How much ink the eater chews per second when touching a stroke
const INK_EATER_MUNCH_RATE = 60; // world-units of stroke length per second

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

// ─── ground rendering — height-aware (mirrors RunnerView) ─────────────────────
function drawGround(ctx, chunks, camX, WW) {
  ctx.fillStyle = "#1c1c32";
  ctx.strokeStyle = "#4a4a7a";
  ctx.lineWidth = 2;

  for (const chunk of chunks) {
    const gy      = chunk.groundY ?? GROUND_Y;
    const chunkSX = chunk.offsetX - camX;
    const chunkEX = chunkSX + CHUNK_W;
    if (chunkEX < 0 || chunkSX > WW) continue;

    const chunkGaps = chunk.gaps.map(g => ({
      sx: g.x - camX,
      ex: g.x + g.w - camX,
    }));
    chunkGaps.sort((a, b) => a.sx - b.sx);

    let cursor = Math.max(0, chunkSX);
    const end  = Math.min(WW, chunkEX);
    for (const g of chunkGaps) {
      const gStart = Math.max(cursor, g.sx);
      const gEnd   = Math.min(end, g.ex);
      if (gStart > cursor && cursor < end) {
        ctx.fillRect(cursor, gy, Math.min(gStart, end) - cursor, WORLD_H - gy);
      }
      cursor = Math.max(cursor, gEnd);
    }
    if (cursor < end) ctx.fillRect(cursor, gy, end - cursor, WORLD_H - gy);

    ctx.beginPath();
    cursor = Math.max(0, chunkSX);
    ctx.moveTo(cursor, gy);
    for (const g of chunkGaps) {
      const gStart = Math.max(cursor, g.sx);
      const gEnd   = Math.min(end, g.ex);
      if (gStart > cursor) ctx.lineTo(Math.min(gStart, end), gy);
      ctx.moveTo(Math.min(gEnd, end), gy);
      cursor = Math.max(cursor, gEnd);
    }
    if (cursor < end) ctx.lineTo(end, gy);
    ctx.stroke();

    // Step wall between chunks of different heights
    const nextChunk = chunks.find(c => c.chunkIndex === chunk.chunkIndex + 1);
    if (nextChunk) {
      const ngy = nextChunk.groundY ?? GROUND_Y;
      const joinX = chunkEX;
      if (joinX > 0 && joinX < WW && Math.abs(gy - ngy) > 4) {
        ctx.fillRect(joinX - 1, Math.min(gy, ngy), 2, Math.abs(gy - ngy));
      }
    }
  }
}

export default function PainterView({ room, onGameOver }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const strokesRef = useRef([]);
  const strokeHistoryRef = useRef([]);
  const strokeIdRef = useRef(0);
  const colorRef   = useRef("black");
  const pingsRef   = useRef([]);
  const gameOverFiredRef = useRef(false);
  const runnerTargetRef = useRef({ x: 160, y: GROUND_Y - RUNNER_R, vy: 0, state: "ground" });
  const runnerDispRef   = useRef({ x: 160, y: GROUND_Y - RUNNER_R });

  // Ink Eater — singleton on painter's side
  // Painter cursor world position is used as target
  const inkEaterRef    = useRef(null);
  const cursorWorldRef = useRef({ x: 200, y: GROUND_Y - 40 }); // last known painter cursor in world coords
  const lastEaterBroadcastRef = useRef(0);

  const [color,    setColor]    = useState("black");
  const [inkUsed,  setInkUsed]  = useState(0);
  const [inkBonus, setInkBonus] = useState(0);

  const inkBonusRef     = useRef(0);
  const lastWallXRef    = useRef(-Infinity);
  const inkUsedRef      = useRef(0);
  const inkDirtyRef     = useRef(false);
  const lastInkFlushRef = useRef(0);

  function recomputeInk() {
    inkUsedRef.current = strokesRef.current.reduce((s, st) => s + strokeLen(st), 0);
    inkDirtyRef.current = true;
  }
  const totalInk = () => inkUsedRef.current;
  const inkCap   = () => MAX_INK + inkBonusRef.current;

  const handlers = useRef({
    onRunnerMove: ({ x, y, vy, state: rs, wallX }) => {
      runnerTargetRef.current = { x, y, vy, state: rs };
      if (wallX !== undefined && stateRef.current) {
        stateRef.current.wallX = wallX;
      }
    },
    onWallTime: ({ startedAt }) => {
      if (!stateRef.current) return;
      stateRef.current.wallGrace     = 0;
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
    onInkRefill: ({ tokenId, amount }) => {
      if (stateRef.current) {
        for (const chunk of stateRef.current.chunks) {
          const token = (chunk.inkTokens || []).find(t => t.id === tokenId);
          if (token) { token.collected = true; break; }
        }
      }
      inkBonusRef.current += amount;
      setInkBonus(prev => prev + amount);
    },
    // Runner broadcasts this when it stomps the ink eater
    onEnemyKilled: ({ enemyId }) => {
      if (enemyId === "inkEater" && inkEaterRef.current) {
        inkEaterRef.current.alive = false;
        inkEaterRef.current.respawnAt = performance.now() + INK_EATER_RESPAWN_S * 1000;
      }
    },
  }).current;

  const { sendStrokeAdded, sendStrokeReclaimed, sendPing, sendInkEaterPos } =
    useInkRunRoom(room?.id ?? null, handlers, ":game");

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
      wallStartedAt: null,
      lastTime: performance.now(),
    };
  }

  function canvasToWorld(cx, cy) {
    const canvas = canvasRef.current;
    const scale = canvas ? canvas.height / WORLD_H : 1;
    return { wx: cx / scale + stateRef.current.camX, wy: cy / scale };
  }

  // ── Stroke physics helpers ────────────────────────────────────────────────────
  // Called when a stroke is committed. Settles it to the nearest solid surface
  // if it's floating. Returns the (possibly translated) stroke.
  function settleAndAddStroke(rawStroke) {
    const state = stateRef.current;
    if (!state) return rawStroke;

    const allPlatforms = state.chunks.flatMap(c => c.platforms);
    const allGaps      = state.chunks.flatMap(c => c.gaps);

    const settled = settleStroke(
      rawStroke,
      allGaps,
      allPlatforms,
      strokesRef.current,
      state.chunks,
    );

    return settled;
  }

  function onPointerDown(e) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const { wx, wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    cursorWorldRef.current = { x: wx, y: wy };
    beginStroke(e.clientX, e.clientY);
  }
  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const { wx, wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    cursorWorldRef.current = { x: wx, y: wy };
    continueStroke(e.clientX, e.clientY);
  }
  function onPointerUp(e) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    finishStroke();
  }

  const touchCountRef = useRef(0);
  const keysRef       = useRef({});

  function beginStroke(clientX, clientY) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const cy = clientY - rect.top;
    if (cy < 44) return;
    if (colorRef.current !== "eraser" && totalInk() >= inkCap()) return;
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
    if (colorRef.current !== "eraser") {
      const tentLen  = strokeLen({ points: [...pts, { x: wx, y: wy }] });
      const otherInk = strokesRef.current.reduce((s, st) => s + strokeLen(st), 0);
      if (otherInk + tentLen > inkCap()) return;
    }
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
      if (stroke.points.length >= 1) {
        const { x: wx, y: wy } = stroke.points[0];
        pingsRef.current = [...pingsRef.current, { wx, wy, from: "painter", born: performance.now() }];
        sendPing(Math.round(wx), Math.round(wy), "painter");
      }
      return;
    }

    if (colorRef.current === "eraser") {
      const ERASE_R = 18;
      const eraserPts = stroke.points;
      strokesRef.current = strokesRef.current.flatMap(s => {
        const kept = s.points.filter(p => {
          for (let i = 0; i < eraserPts.length - 1; i++) {
            const a = eraserPts[i], b = eraserPts[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y, len2 = dx*dx + dy*dy || 1;
            const t2 = Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy) / len2));
            if (Math.hypot(p.x - (a.x + t2*dx), p.y - (a.y + t2*dy)) < ERASE_R) return false;
          }
          return true;
        });
        if (kept.length < 2) { sendStrokeReclaimed(s.id); return []; }
        return [{ ...s, points: kept }];
      });
      recomputeInk();
      setInkUsed(inkUsedRef.current);
      return;
    }

    // ── Gravity settling ──────────────────────────────────────────────────
    // Red strokes skip settling (they're dangerous wisps that float)
    const settled = stroke.color === "red" ? { ...stroke, yOffset: 0 } : settleAndAddStroke(stroke);

    strokesRef.current = [...strokesRef.current, settled];
    strokeHistoryRef.current = [...strokeHistoryRef.current, { ...settled, points: [...settled.points] }];
    recomputeInk();
    setInkUsed(inkUsedRef.current);
    sendStrokeAdded(settled); // broadcast includes settled points (already translated)
  }

  function onTouchStart(e) {
    touchCountRef.current = e.touches.length;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const state = stateRef.current; if (!state) return;
      if (state.drawing) { state.drawing = false; state.currentStroke = null; }
      state.dragging = true; state.following = false;
      state.dragStartMX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      state.dragStartCX = state.camX;
    } else {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const { wx, wy } = canvasToWorld(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      cursorWorldRef.current = { x: wx, y: wy };
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
      const rect = canvasRef.current.getBoundingClientRect();
      const { wx, wy } = canvasToWorld(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      cursorWorldRef.current = { x: wx, y: wy };
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
    stateRef.current.following  = true;
    stateRef.current.camTargetX = runnerTargetRef.current.x - WW * 0.32;
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
    inkBonusRef.current  = 0;
    inkUsedRef.current   = 0;
    inkDirtyRef.current  = false;
    lastWallXRef.current = -Infinity;
    lastInkFlushRef.current = 0;
    inkEaterRef.current  = null;
    setInkBonus(0);
    setInkUsed(0);
    gameOverFiredRef.current = false;

    const TOOL_CYCLE = ["black", "speed", "bounce", "eraser"];
    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      if (e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
        const dir = (e.key === "e" || e.key === "E") ? 1 : -1;
        const cur = TOOL_CYCLE.indexOf(colorRef.current);
        const next = TOOL_CYCLE[(cur + dir + TOOL_CYCLE.length) % TOOL_CYCLE.length];
        colorRef.current = next;
        setColor(next);
      }
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

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

      // ── Wall ─────────────────────────────────────────────────────────────
      if (state.wallGrace > 0) {
        state.wallGrace = Math.max(0, state.wallGrace - dt);
      } else if (!state.wallStartedAt && runnerTargetRef.current.wallX === undefined) {
        state.wallVx += 2.5 * dt;
        state.wallX  += state.wallVx * dt;
      }

      // Reclaim strokes eaten by wall
      const wallX = state.wallX;
      if (wallX > lastWallXRef.current + 1) {
        lastWallXRef.current = wallX;
        let changed = false;
        const next = [];
        for (const s of strokesRef.current) {
          if (s.points[0].x >= wallX - 8) { next.push(s); continue; }
          const live = s.points.filter(p => p.x >= wallX - 8);
          if (live.length === 0) { sendStrokeReclaimed(s.id); changed = true; continue; }
          if (live.length < s.points.length) { next.push({ ...s, points: live }); changed = true; continue; }
          next.push(s);
        }
        if (changed) { strokesRef.current = next; recomputeInk(); }
      }

      // Flush ink bar ≤4/s
      if (inkDirtyRef.current && ts - lastInkFlushRef.current > 250) {
        setInkUsed(inkUsedRef.current);
        inkDirtyRef.current = false;
        lastInkFlushRef.current = ts;
      }

      // Runner position interpolation
      const target = runnerTargetRef.current;
      const disp   = runnerDispRef.current;
      const lerpK  = Math.min(1, 12 * dt);
      disp.x += (target.x - disp.x) * lerpK;
      disp.y += (target.y - disp.y) * lerpK;

      // WASD camera pan
      const PAN_SPEED = 400;
      let panDX = 0;
      if (keysRef.current["a"] || keysRef.current["A"] || keysRef.current["ArrowLeft"])  panDX -= 1;
      if (keysRef.current["d"] || keysRef.current["D"] || keysRef.current["ArrowRight"]) panDX += 1;
      if (panDX !== 0) { state.camTargetX += panDX * PAN_SPEED * dt; state.following = false; }

      if (state.following) state.camTargetX = target.x - WW * 0.32;
      if (!state.dragging) {
        state.camX += (state.camTargetX - state.camX) * Math.min(1, 8 * dt);
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

      // Moving platform tick
      for (const chunk of state.chunks) updatePlatforms(chunk.platforms, dt);

      // Enemy AI update
      const allPlatforms = state.chunks.flatMap(c => c.platforms);
      const allGaps      = state.chunks.flatMap(c => c.gaps);
      state.chunks.forEach(chunk =>
        updateEnemies(chunk.enemies, dt, t, strokesRef.current, allGaps, allPlatforms, state.chunks)
      );

      // ── Ink Eater spawn / respawn ─────────────────────────────────────────
      const maxChunk = maxChunkIndex(state.chunks);
      if (maxChunk >= 3 && inkEaterRef.current === null) {
        const spawnX = target.x + 300;
        const spawnY = (groundYatX(spawnX, state.chunks) ?? GROUND_Y) - 40;
        inkEaterRef.current = {
          x: spawnX, y: spawnY,
          alive: true, respawnAt: null,
          difficulty: Math.min(1, maxChunk * 0.07),
        };
      }
      if (inkEaterRef.current && !inkEaterRef.current.alive && inkEaterRef.current.respawnAt) {
        if (ts >= inkEaterRef.current.respawnAt) {
          const spawnX = target.x + 400;
          const spawnY = (groundYatX(spawnX, state.chunks) ?? GROUND_Y) - 40;
          inkEaterRef.current.x = spawnX;
          inkEaterRef.current.y = spawnY;
          inkEaterRef.current.alive = true;
          inkEaterRef.current.respawnAt = null;
        }
      }

      // ── Ink Eater AI ──────────────────────────────────────────────────────
      if (inkEaterRef.current?.alive) {
        const ie = inkEaterRef.current;
        const spd = 90 + ie.difficulty * 40;

        // Priority target: nearest stroke point, or painter cursor if no strokes nearby
        let bestDist = Infinity, bestTX = cursorWorldRef.current.x, bestTY = cursorWorldRef.current.y;
        for (const stroke of strokesRef.current) {
          if (stroke.color === "red") continue; // doesn't eat red
          for (const p of stroke.points) {
            const d = Math.hypot(p.x - ie.x, p.y - ie.y);
            if (d < bestDist) { bestDist = d; bestTX = p.x; bestTY = p.y; }
          }
        }
        // If no stroke within 600px, chase cursor instead
        const cursorDist = Math.hypot(cursorWorldRef.current.x - ie.x, cursorWorldRef.current.y - ie.y);
        if (bestDist > 600 || strokesRef.current.length === 0) {
          bestTX = cursorWorldRef.current.x;
          bestTY = cursorWorldRef.current.y;
        }

        const dx = bestTX - ie.x, dy = bestTY - ie.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          ie.x += (dx / dist) * spd * dt;
          ie.y += (dy / dist) * spd * dt;
        }

        // Clamp Y to world
        const gy = groundYatX(ie.x, state.chunks) ?? GROUND_Y;
        if (ie.y > gy - 10) ie.y = gy - 10;
        if (ie.y < 60) ie.y = 60;

        // ── Ink eating — chew through nearby stroke points ────────────────
        // Remove points within eat-radius of the eater, progressively consuming ink
        const EAT_R = INK_EATER_R + 8;
        const maxMunch = INK_EATER_MUNCH_RATE * dt; // world-length budget per frame
        let munched = 0;
        let inkChanged = false;

        strokesRef.current = strokesRef.current.flatMap(s => {
          if (s.color === "red") return [s];
          if (munched >= maxMunch) return [s];

          const kept = [];
          for (const p of s.points) {
            if (munched < maxMunch && Math.hypot(p.x - ie.x, p.y - ie.y) < EAT_R) {
              munched += 1; // approximate: 1 world unit per eaten point
              inkChanged = true;
            } else {
              kept.push(p);
            }
          }
          if (kept.length < 2) {
            sendStrokeReclaimed(s.id);
            inkChanged = true;
            return [];
          }
          if (kept.length < s.points.length) {
            inkChanged = true;
            return [{ ...s, points: kept }];
          }
          return [s];
        });

        if (inkChanged) recomputeInk();

        // Broadcast ink eater position to runner view (so runner can see it)
        if (ts - lastEaterBroadcastRef.current > 80) {
          sendInkEaterPos(Math.round(ie.x), Math.round(ie.y));
          lastEaterBroadcastRef.current = ts;
        }
      }

      // ── DRAW ─────────────────────────────────────────────────────────────
      const camX   = state.camX;
      const strokes = strokesRef.current;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.scale(scale, scale);

      // Ground (height-aware)
      drawGround(ctx, state.chunks, camX, WW);

      // Platforms + spikes + enemies
      state.chunks.forEach(chunk => {
        chunk.platforms.forEach(p => {
          const sx = p.x - camX;
          if (sx > WW + 20 || sx + p.w < -20) return;
          ctx.fillStyle   = p.moving ? "#2a3a5a" : "#2a2a4a";
          ctx.fillRect(sx, p.y, p.w, p.h);
          ctx.strokeStyle = p.moving ? "#5a8aaa" : "#4a4a7a";
          ctx.lineWidth = 1; ctx.strokeRect(sx, p.y, p.w, p.h);
          if (p.moving) {
            ctx.fillStyle = "rgba(80,180,255,0.5)";
            ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(p.dir > 0 ? "▶" : "◀", sx + p.w / 2, p.y + p.h / 2);
          }
        });

        (chunk.walls || []).forEach(w => {
          const sx = w.x - camX;
          if (sx > WW + 20 || sx + w.w < -20) return;
          ctx.fillStyle = "#2a1a4a"; ctx.fillRect(sx, w.y, w.w, w.h);
          ctx.strokeStyle = "#7a4aaa"; ctx.lineWidth = 1.5; ctx.strokeRect(sx, w.y, w.w, w.h);
          ctx.save();
          ctx.beginPath(); ctx.rect(sx, w.y, w.w, 8); ctx.clip();
          ctx.fillStyle = "rgba(180,80,255,0.5)"; ctx.fillRect(sx, w.y, w.w, 8);
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
        const glowColor = stroke.color === "speed"  ? "rgba(80,220,255,0.22)"
                        : stroke.color === "bounce" ? "rgba(80,255,160,0.22)"
                        : "rgba(180,160,255,0.18)";
        const lineColor = stroke.color === "speed"  ? "rgba(80,220,255,0.95)"
                        : stroke.color === "bounce" ? "rgba(80,255,160,0.95)"
                        : "rgba(220,230,255,0.88)";
        ctx.strokeStyle = glowColor; ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = lineColor; ctx.lineWidth = 5;  ctx.stroke();
        ctx.restore();
      }

      // Live stroke preview — also shows gravity indicator if stroke would fall
      if (state.currentStroke?.points?.length >= 1) {
        const s = state.currentStroke;
        const last = s.points[s.points.length - 1];
        if (s.color === "eraser") {
          ctx.save();
          ctx.beginPath(); ctx.arc(last.x - camX, last.y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.restore();
        } else if (s.points.length > 1) {
          // Quick anchor preview: flash red outline if stroke appears unanchored
          const allPlatforms2 = state.chunks.flatMap(c => c.platforms);
          const allGaps2      = state.chunks.flatMap(c => c.gaps);
          const previewSettled = s.color === "red" ? { ...s, yOffset: 0 } :
            settleStroke(s, allGaps2, allPlatforms2, strokesRef.current, state.chunks);
          const isFloating = (previewSettled.yOffset ?? 0) > 8;

          ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([8, 4]);
          const previewColor = isFloating
            ? "rgba(255,160,80,0.7)"  // orange = will fall
            : s.color === "speed"  ? "rgba(80,220,255,0.7)"
            : s.color === "bounce" ? "rgba(80,255,160,0.7)"
            : "rgba(220,230,255,0.6)";
          ctx.strokeStyle = previewColor; ctx.lineWidth = 5;
          ctx.beginPath();
          for (let i = 0; i < s.points.length; i++) {
            const p = s.points[i], sx = p.x - camX;
            i === 0 ? ctx.moveTo(sx, p.y) : ctx.lineTo(sx, p.y);
          }
          ctx.stroke();
          // Show where it will land if floating
          if (isFloating && previewSettled.points?.length > 1) {
            ctx.setLineDash([3, 6]);
            ctx.strokeStyle = "rgba(255,160,80,0.35)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = 0; i < previewSettled.points.length; i++) {
              const p = previewSettled.points[i], sx = p.x - camX;
              i === 0 ? ctx.moveTo(sx, p.y) : ctx.lineTo(sx, p.y);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]); ctx.restore();
        }
      }

      // Ink tokens
      for (const chunk of state.chunks) {
        for (const token of (chunk.inkTokens || [])) {
          if (token.collected) continue;
          const tx = token.x - camX, ty = token.y;
          if (tx < -40 || tx > WW + 40) continue;
          const pulse = 0.7 + 0.3 * Math.sin(t * 3 + token.x);
          ctx.save(); ctx.globalAlpha = pulse;
          ctx.beginPath(); ctx.arc(tx, ty, INK_TOKEN_R, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(180,140,255,0.25)"; ctx.fill();
          ctx.strokeStyle = "rgba(180,140,255,0.9)"; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = "rgba(220,200,255,0.9)";
          ctx.font = "bold 11px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("ink", tx, ty);
          ctx.restore();
        }
      }

      // Expire old pings
      pingsRef.current = pingsRef.current.filter(p => ts - p.born < 3000);

      // Pings
      for (const ping of pingsRef.current) {
        const age = (ts - ping.born) / 3000, alpha = 1 - age;
        const px = ping.wx - camX, py = ping.wy;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(px, py, 16 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.fill();
        ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = ping.from === "runner" ? "rgba(255,220,80,0.9)" : "rgba(80,220,255,0.9)";
        ctx.fillText(ping.from === "runner" ? "runner" : "here!", px, py - 24);
        ctx.restore();
      }

      // Ink Eater
      if (inkEaterRef.current?.alive) {
        const ie = inkEaterRef.current;
        const isx = ie.x - camX;
        if (isx > -60 && isx < WW + 60) {
          ctx.save();
          const pulse = 0.6 + 0.4 * Math.sin(t * 5);
          ctx.globalAlpha = pulse;
          ctx.beginPath(); ctx.arc(isx, ie.y, INK_EATER_R + 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,40,120,0.2)"; ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + t * 2;
            const r = i % 2 === 0 ? INK_EATER_R : INK_EATER_R * 0.55;
            const px2 = isx + Math.cos(angle) * r;
            const py2 = ie.y + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(255,30,100,0.92)"; ctx.fill();
          ctx.strokeStyle = "rgba(255,180,200,0.8)"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(isx, ie.y - 3, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff"; ctx.fill();
          ctx.beginPath(); ctx.arc(isx + 2, ie.y - 3, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#0a0a0f"; ctx.fill();
          ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,150,180,0.9)";
          ctx.fillText("ink eater", isx, ie.y - INK_EATER_R - 8);
          // "Runner must stomp!" hint, fades in after 3s
          if (ts > 3000) {
            ctx.font = "9px monospace";
            ctx.fillStyle = "rgba(255,200,220,0.6)";
            ctx.fillText("stomp to kill", isx, ie.y + INK_EATER_R + 16);
          }
          ctx.restore();
        }
      }
      // Respawn countdown
      if (inkEaterRef.current && !inkEaterRef.current.alive && inkEaterRef.current.respawnAt) {
        const secsLeft = Math.ceil((inkEaterRef.current.respawnAt - ts) / 1000);
        if (secsLeft > 0) {
          ctx.save();
          ctx.font = "11px monospace"; ctx.fillStyle = "rgba(255,100,150,0.5)";
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.fillText(`ink eater respawns in ${secsLeft}s`, 18, WORLD_H - 20);
          ctx.restore();
        }
      }

      // Wall
      const wallSX = state.wallX - camX;
      const grad   = ctx.createLinearGradient(wallSX-40, 0, wallSX, 0);
      grad.addColorStop(0, "rgba(120,60,200,0)");
      grad.addColorStop(1, "rgba(120,60,200,0.7)");
      ctx.fillStyle = grad; ctx.fillRect(wallSX-40, 0, 40, WORLD_H);
      ctx.fillStyle = "rgba(160,80,255,0.8)"; ctx.fillRect(wallSX, 0, 3, WORLD_H);

      // Runner dot
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
      const inkPct = Math.min(1, totalInk() / inkCap());
      const inkRemaining = 1 - inkPct;
      const barW = W - 36;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(18, 10, barW, 7, 4); ctx.fill();
      ctx.fillStyle = inkPct > 0.8 ? "rgba(255,80,80,0.8)" : inkPct > 0.5 ? "rgba(255,200,80,0.8)" : "rgba(180,140,255,0.8)";
      ctx.beginPath(); ctx.roundRect(18, 10, barW * inkRemaining, 7, 4); ctx.fill();
      ctx.save();
      ctx.font = "11px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(`ink ${Math.floor(inkRemaining * 100)}%`, 18, 38);
      if (state.wallGrace > 0) {
        const secs = Math.ceil(state.wallGrace);
        ctx.textAlign = "center"; ctx.font = "bold 13px monospace";
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const inkPct   = Math.min(1, inkUsed / (MAX_INK + inkBonus));
  const inkLeft  = Math.floor((1 - inkPct) * 100);
  const outOfInk = inkLeft === 0;

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0a0f", position: "relative", overflow: "hidden", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: color === "eraser" ? "none" : outOfInk ? "not-allowed" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Tool buttons */}
      <div style={{ position: "absolute", bottom: 24, right: 14, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <button onClick={handleRecenter} style={{
          background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.15)",
          borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 11, padding: "5px 10px", cursor: "pointer",
        }}>re-center</button>
        <button onClick={() => { setColor("black"); colorRef.current = "black"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "black" ? "rgba(220,230,255,0.9)" : "rgba(220,230,255,0.25)",
          boxShadow: color === "black" ? "0 0 0 2px rgba(180,140,255,0.7)" : "none",
        }} title="Bridge (platform)" />
        <button onClick={() => { setColor("speed"); colorRef.current = "speed"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "speed" ? "rgba(80,220,255,0.9)" : "rgba(80,220,255,0.25)",
          boxShadow: color === "speed" ? "0 0 0 2px rgba(80,220,255,0.8)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }} title="Speed boost">⚡</button>
        <button onClick={() => { setColor("bounce"); colorRef.current = "bounce"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "bounce" ? "rgba(80,255,160,0.9)" : "rgba(80,255,160,0.25)",
          boxShadow: color === "bounce" ? "0 0 0 2px rgba(80,255,160,0.8)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }} title="Bounce">↑</button>
        <button onClick={() => { setColor("eraser"); colorRef.current = "eraser"; }} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.15s",
          background: color === "eraser" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
          boxShadow: color === "eraser" ? "0 0 0 2px rgba(255,255,255,0.5)" : "0 0 0 1px rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: color === "eraser" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
        }} title="Eraser">✕</button>
      </div>

      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, color: "rgba(255,255,255,0.15)", pointerEvents: "none",
        letterSpacing: "0.06em", whiteSpace: "nowrap",
      }}>
        {outOfInk && color !== "eraser"
          ? "out of ink — erase old lines or collect ink tokens"
          : "⬜ bridge · ⚡ speed · ↑ bounce · ✕ erase · tap = ping · Q/E swap · lines must touch solid ground"}
      </div>
    </div>
  );
}