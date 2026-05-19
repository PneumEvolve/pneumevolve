// src/Pages/Firefly/PlayerTwoView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useFireflyRoom } from "./useFireflyRoom";
import { generateMap, updateFireflies } from "./gameEngine";

const WORLD         = 2400;
const PING_DURATION = 3000;
const PING_COOLDOWN = 5000;
const CHAT_MAX      = 20;

// How fast things lerp — higher = snappier, lower = smoother/laggier
// At 60fps, a factor of 12 means ~80% of the gap closes per second
const CAM_LERP    = 12;   // camera follow speed
const PLAYER_LERP = 18;   // player dot (slightly snappier than camera)
const ZOMBIE_LERP = 10;   // zombie (a bit lazier feels more menacing)

function lerp(a, b, t) { return a + (b - a) * t; }

export default function PlayerTwoView({ room, onGameOver }) {
  const canvasRef = useRef(null);

  const stateRef = useRef({
    // Rendered positions — updated every frame via lerp
    playerPos:   { x: WORLD / 2, y: WORLD / 2 },
    zombiePos:   null,
    cam:         { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },

    // Target positions — updated instantly when a packet arrives
    playerTarget: { x: WORLD / 2, y: WORLD / 2 },
    zombieTarget: null,
    camTarget:    { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },

    fireflies:    [],
    mushrooms:    [],
    holes:        [],
    spikes:       [],
    score:        0,
    timeLeft:     180,
    pings:        [],
    chatMessages: [],
    dragging:     false,
    dragStart:    { mx: 0, my: 0, cx: 0, cy: 0 },
    following:    true,
    lastPingAt:   0,
    pingsSent:    0,
    messagesSent: 0,
    zombieKillBurst: null, // { x, y, startedAt } — short-lived visual after kill
  });

  const rafRef      = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const mapRef      = useRef(null);

  const [chatInput,    setChatInput]    = useState("");
  const [chatLog,      setChatLog]      = useState([]);
  const [score,        setScore]        = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(180);
  const [pingCooldown, setPingCooldown] = useState(0);
  const [pingsSent,    setPingsSent]    = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);

  // ── Camera helpers ─────────────────────────────────────────────────────────
  function worldToCanvas(wx, wy) {
    const { cam } = stateRef.current;
    return { cx: wx - cam.x, cy: wy - cam.y };
  }

  function canvasToWorld(cx, cy) {
    const { cam } = stateRef.current;
    return { wx: cx + cam.x, wy: cy + cam.y };
  }

  // Sets the camera TARGET — the rendered cam lerps toward this each frame
  function setCamTarget(wx, wy) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stateRef.current.camTarget = {
      x: wx - canvas.width  / 2,
      y: wy - canvas.height / 2,
    };
  }

  // Hard-snap camera (used on first load only)
  function snapCamTo(wx, wy) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = { x: wx - canvas.width / 2, y: wy - canvas.height / 2 };
    stateRef.current.cam       = { ...pos };
    stateRef.current.camTarget = { ...pos };
  }

  // ── Realtime handlers ──────────────────────────────────────────────────────
  const handlers = useRef({
    onPlayerMove: ({ x, y }) => {
      // Only update the TARGET — the rendered position lerps toward it
      stateRef.current.playerTarget = { x, y };
      if (stateRef.current.following) setCamTarget(x, y);
    },
    onFireflySync: ({ fireflies }) => {
      const local = stateRef.current.fireflies;
      fireflies.forEach(incoming => {
        const f = local.find(l => l.id === incoming.id);
        if (!f) return;
        f.collected = incoming.collected;
        // Soft lerp — already smooth since fireflies are simulated locally
        f.x = f.x + (incoming.x - f.x) * 0.3;
        f.y = f.y + (incoming.y - f.y) * 0.3;
      });
    },
    onZombieUpdate: ({ x, y }) => {
      // Update target; rendered position lerps each frame
      if (!stateRef.current.zombieTarget) {
        // First packet — snap immediately so zombie doesn't slide in from 0,0
        stateRef.current.zombiePos    = { x, y };
        stateRef.current.zombieTarget = { x, y };
      } else {
        stateRef.current.zombieTarget = { x, y };
      }
    },
    onScoreUpdate: ({ score }) => {
      stateRef.current.score = score;
      setScore(score);
    },
    onGameOver: ({ final_score }) => {
      onGameOver(final_score);
    },
    onChat: ({ text, from }) => {
      const msg = { text, from, ts: Date.now() };
      stateRef.current.chatMessages.unshift(msg);
      if (stateRef.current.chatMessages.length > CHAT_MAX) stateRef.current.chatMessages.pop();
      setChatLog(prev => [msg, ...prev].slice(0, CHAT_MAX));
    },
  }).current;

  const { sendPing, sendChat, sendZombieKill } = useFireflyRoom(room?.id ?? null, handlers);

  // ── Drawing ────────────────────────────────────────────────────────────────
  function draw(ctx, W, H, t) {
    const state = stateRef.current;
    const map   = mapRef.current;

    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, W, H);

    if (!map) return;

    // Walls
    map.walls.forEach(w => {
      const { cx, cy } = worldToCanvas(w.x, w.y);
      if (cx + w.w < 0 || cy + w.h < 0 || cx > W || cy > H) return;
      ctx.fillStyle = "#1a2235";
      ctx.fillRect(cx, cy, w.w, w.h);
      ctx.strokeStyle = "#2e4060";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, w.w, w.h);
    });

    // Holes
    (state.holes || []).forEach(h => {
      const { cx, cy } = worldToCanvas(h.x, h.y);
      if (cx < -40 || cx > W+40 || cy < -40 || cy > H+40) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, h.radius, 0, Math.PI*2);
      ctx.fillStyle = "#000"; ctx.fill();
      ctx.strokeStyle = "rgba(80,80,120,0.6)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, h.radius * 0.55, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(40,40,80,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    });

    // Mushrooms
    (state.mushrooms || []).forEach(m => {
      const { cx, cy } = worldToCanvas(m.x, m.y);
      if (cx < -30 || cx > W+30 || cy < -30 || cy > H+30) return;
      const pulsed = 0.6 + 0.4 * Math.sin(t * 1.8 + (m.pulse ?? 0));
      const cap = m.capSize ?? 10;
      ctx.save();
      ctx.globalAlpha = 0.18 * pulsed;
      ctx.beginPath(); ctx.arc(cx, cy, cap * 2.5, 0, Math.PI*2);
      ctx.fillStyle = "rgba(160,0,255,1)"; ctx.fill();
      ctx.globalAlpha = 0.7 * pulsed;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + cap * 0.4);
      ctx.lineTo(cx + 2, cy + cap * 0.4);
      ctx.lineTo(cx + 2, cy + cap);
      ctx.lineTo(cx - 2, cy + cap);
      ctx.closePath();
      ctx.fillStyle = "rgba(200,160,255,0.8)"; ctx.fill();
      ctx.globalAlpha = 0.9 * pulsed;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cap, cap * 0.65, 0, Math.PI, 0);
      ctx.fillStyle = `rgba(160,0,255,${0.85 * pulsed})`; ctx.fill();
      ctx.globalAlpha = 0.8 * pulsed;
      ctx.fillStyle = "rgba(220,180,255,0.9)";
      [[-cap*0.35, -cap*0.2], [cap*0.3, -cap*0.3], [0, -cap*0.45]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, 1.5, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    });

    // Spike traps
    (state.spikes || []).forEach(s => {
      const { cx, cy } = worldToCanvas(s.x, s.y);
      if (cx < -30 || cx > W+30 || cy < -30 || cy > H+30) return;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + s.id);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.12 * pulse;
      ctx.beginPath(); ctx.arc(0, 0, s.radius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,60,60,1)"; ctx.fill();
      ctx.globalAlpha = 0.75 * pulse;
      ctx.strokeStyle = "#cc4444";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * s.radius * 1.1, Math.sin(angle) * s.radius * 1.1);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.9 * pulse;
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5555"; ctx.fill();
      ctx.restore();
    });

    // Fireflies
    state.fireflies.forEach(f => {
      if (f.collected) return;
      const { cx, cy } = worldToCanvas(f.x, f.y);
      if (cx < -10 || cx > W + 10 || cy < -10 || cy > H + 10) return;
      const pulsed = 0.55 + 0.45 * Math.sin(t * 2.5 + (f.pulse ?? 0));
      ctx.save();
      ctx.globalAlpha = 0.22 * pulsed;
      ctx.beginPath(); ctx.arc(cx, cy, f.size + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(180,255,100,1)"; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.85 * pulsed;
      ctx.beginPath(); ctx.arc(cx, cy, f.size ?? 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(210,255,150,1)"; ctx.fill();
      ctx.restore();
    });

    // Zombie — draw from lerped zombiePos
    if (state.zombiePos) {
      const { cx, cy } = worldToCanvas(state.zombiePos.x, state.zombiePos.y);
      if (cx > -20 && cx < W + 20 && cy > -20 && cy < H + 20) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,60,60,0.2)"; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444"; ctx.fill();
        // Tap-to-kill hint ring — subtle glow to indicate it's tappable
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,120,120,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
    }

    // Zombie kill burst animation
    if (state.zombieKillBurst) {
      const age = (Date.now() - state.zombieKillBurst.startedAt) / 500; // 0→1 over 500ms
      if (age >= 1) {
        state.zombieKillBurst = null;
      } else {
        const { cx, cy } = worldToCanvas(state.zombieKillBurst.x, state.zombieKillBurst.y);
        const eased = 1 - Math.pow(1 - age, 2); // ease-out
        ctx.save();
        // Expanding ring
        ctx.globalAlpha = (1 - age) * 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, 8 + eased * 40, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,80,80,1)"; ctx.lineWidth = 2.5; ctx.stroke();
        // Second ring, slightly delayed
        if (age > 0.1) {
          const age2 = (age - 0.1) / 0.9;
          ctx.globalAlpha = (1 - age2) * 0.6;
          ctx.beginPath(); ctx.arc(cx, cy, 6 + age2 * 55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,160,80,1)"; ctx.lineWidth = 1.5; ctx.stroke();
        }
        // Spokes
        ctx.globalAlpha = (1 - age) * 0.8;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r1 = eased * 18, r2 = eased * 34;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.strokeStyle = "rgba(255,100,60,0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Pings
    const now = Date.now();
    state.pings = state.pings.filter(p => p.expiresAt > now);
    state.pings.forEach(p => {
      const { cx, cy } = worldToCanvas(p.x, p.y);
      const age    = 1 - (p.expiresAt - now) / PING_DURATION;
      const radius = 12 + age * 20;
      ctx.save();
      ctx.globalAlpha = (1 - age) * 0.9;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,220,80,0.9)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,220,80,0.9)"; ctx.fill();
      ctx.restore();
    });

    // Player 1 dot — drawn from lerped playerPos
    const { cx: px, cy: py } = worldToCanvas(state.playerPos.x, state.playerPos.y);
    const ppulse = 0.8 + 0.2 * Math.sin(t * 3);
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, 12 * ppulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
    ctx.restore();

    // World boundary
    const { cx: bx, cy: by } = worldToCanvas(0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, WORLD, WORLD);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  function loop(ts) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;

    const state = stateRef.current;

    // ── Lerp camera toward target (skip lerp while dragging) ──────────────
    if (!state.dragging && state.following) {
      const alpha = 1 - Math.pow(1 - Math.min(CAM_LERP * dt, 1), 1);
      state.cam.x = lerp(state.cam.x, state.camTarget.x, alpha);
      state.cam.y = lerp(state.cam.y, state.camTarget.y, alpha);
    } else if (state.dragging) {
      // While dragging, camera is already being set directly — keep target in sync
      state.camTarget.x = state.cam.x;
      state.camTarget.y = state.cam.y;
    }

    // ── Lerp player dot toward target ─────────────────────────────────────
    const pa = 1 - Math.pow(1 - Math.min(PLAYER_LERP * dt, 1), 1);
    state.playerPos.x = lerp(state.playerPos.x, state.playerTarget.x, pa);
    state.playerPos.y = lerp(state.playerPos.y, state.playerTarget.y, pa);

    // ── Lerp zombie toward target ─────────────────────────────────────────
    if (state.zombieTarget && state.zombiePos) {
      const za = 1 - Math.pow(1 - Math.min(ZOMBIE_LERP * dt, 1), 1);
      state.zombiePos.x = lerp(state.zombiePos.x, state.zombieTarget.x, za);
      state.zombiePos.y = lerp(state.zombiePos.y, state.zombieTarget.y, za);
    }

    // ── Fireflies simulated locally (same as P1) ─────────────────────────
    if (state.fireflies.length > 0) {
      updateFireflies(state.fireflies, { x: -9999, y: -9999 }, dt, 0);
    }

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    setTimeLeft(Math.ceil(state.timeLeft));

    const cooldownRemaining = Math.max(0, state.lastPingAt + PING_COOLDOWN - Date.now());
    setPingCooldown(Math.ceil(cooldownRemaining / 1000));

    draw(ctx, W, H, ts / 1000);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room?.map_seed) return;

    const map = generateMap(room.map_seed);
    mapRef.current = map;
    stateRef.current.fireflies = map.fireflies.map(f => ({ ...f }));
    stateRef.current.mushrooms = map.mushrooms;
    stateRef.current.holes     = map.holes;
    stateRef.current.spikes    = map.spikes;

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    snapCamTo(WORLD / 2, WORLD / 2);
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Tap: zombie kill takes priority over ping ──────────────────────────────
  const ZOMBIE_TAP_RADIUS = 28; // generous tap target in canvas pixels

  function tryZombieKill(canvasX, canvasY) {
    const state = stateRef.current;
    if (!state.zombiePos) return false;
    const { cx, cy } = worldToCanvas(state.zombiePos.x, state.zombiePos.y);
    const dist = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
    if (dist > ZOMBIE_TAP_RADIUS) return false;
    // Check cooldown (shared with ping)
    const now = Date.now();
    if (now - state.lastPingAt < PING_COOLDOWN) return false;
    // Kill it
    sendZombieKill();
    state.zombieKillBurst = { x: state.zombiePos.x, y: state.zombiePos.y, startedAt: now };
    state.zombiePos   = null;
    state.zombieTarget = null;
    state.lastPingAt  = now; // share cooldown
    return true;
  }

  // ── Ping with cooldown ─────────────────────────────────────────────────────
  function firePing(wx, wy) {
    const now = Date.now();
    if (now - stateRef.current.lastPingAt < PING_COOLDOWN) return;
    sendPing(wx, wy);
    stateRef.current.pings.push({ x: wx, y: wy, expiresAt: now + PING_DURATION });
    stateRef.current.lastPingAt = now;
    stateRef.current.pingsSent += 1;
    setPingsSent(s => s + 1);
  }

  // ── Click to ping (or kill zombie) ────────────────────────────────────────
  function handleCanvasClick(e) {
    if (stateRef.current.didDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    if (tryZombieKill(cx, cy)) return;
    const { wx, wy } = canvasToWorld(cx, cy);
    firePing(wx, wy);
  }

  // ── Drag to scroll ─────────────────────────────────────────────────────────
  function handleMouseDown(e) {
    stateRef.current.dragging  = true;
    stateRef.current.didDrag   = false;
    stateRef.current.following = false;
    stateRef.current.dragStart = {
      mx: e.clientX, my: e.clientY,
      cx: stateRef.current.cam.x, cy: stateRef.current.cam.y,
    };
  }
  function handleMouseMove(e) {
    const s = stateRef.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.dragStart.mx;
    const dy = e.clientY - s.dragStart.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) s.didDrag = true;
    s.cam = { x: s.dragStart.cx - dx, y: s.dragStart.cy - dy };
  }
  function handleMouseUp() { stateRef.current.dragging = false; }

  // Touch
  const touchStartRef = useRef(null);
  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartRef.current = { mx: e.touches[0].clientX, my: e.touches[0].clientY };
    stateRef.current.dragging  = true;
    stateRef.current.didDrag   = false;
    stateRef.current.following = false;
    stateRef.current.dragStart = {
      mx: e.touches[0].clientX, my: e.touches[0].clientY,
      cx: stateRef.current.cam.x, cy: stateRef.current.cam.y,
    };
  }
  function handleTouchMove(e) {
    e.preventDefault();
    const s = stateRef.current;
    if (!s.dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - s.dragStart.mx;
    const dy = e.touches[0].clientY - s.dragStart.my;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) s.didDrag = true;
    s.cam = { x: s.dragStart.cx - dx, y: s.dragStart.cy - dy };
  }
  function handleTouchEnd(e) {
    stateRef.current.dragging = false;
    if (!stateRef.current.didDrag && e.changedTouches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.changedTouches[0].clientX - rect.left;
      const cy = e.changedTouches[0].clientY - rect.top;
      if (tryZombieKill(cx, cy)) return;
      const { wx, wy } = canvasToWorld(cx, cy);
      firePing(wx, wy);
    }
  }

  function handleRecenter() {
    stateRef.current.following = true;
    setCamTarget(stateRef.current.playerTarget.x, stateRef.current.playerTarget.y);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  function handleChatSend() {
    const text = chatInput.trim();
    if (!text) return;
    sendChat(text, "P2");
    const msg = { text, from: "P2", ts: Date.now() };
    stateRef.current.chatMessages.unshift(msg);
    stateRef.current.messagesSent += 1;
    setChatLog(prev => [msg, ...prev].slice(0, CHAT_MAX));
    setMessagesSent(n => n + 1);
    setChatInput("");
  }

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const onCooldown = pingCooldown > 0;

  return (
    <div style={{ width: "100%", height: "100svh", background: "#080c14", position: "relative", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: onCooldown ? "not-allowed" : "crosshair" }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Score + timer */}
      <div style={{ position: "absolute", top: 14, left: 18, pointerEvents: "none", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{score} ✦</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{fmt(timeLeft)}</div>
      </div>

      {/* Navigator label */}
      <div style={{
        position: "absolute", top: 14, right: 18, fontSize: 11,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.2)", pointerEvents: "none",
      }}>
        navigator
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 20, pointerEvents: "none", fontFamily: "sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,220,80,0.85)" }}>{pingsSent}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginTop: 1 }}>PINGS</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(200,255,150,0.75)" }}>{messagesSent}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginTop: 1 }}>MSGS</div>
        </div>
      </div>

      {/* Re-center */}
      <button onClick={handleRecenter} style={{
        position: "absolute", bottom: 120, right: 18,
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.15)",
        borderRadius: 8, color: "rgba(255,255,255,0.5)",
        fontSize: 11, padding: "6px 12px", cursor: "pointer",
      }}>
        re-center
      </button>

      <div style={{
        position: "absolute", bottom: 150, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, color: "rgba(255,255,255,0.15)", pointerEvents: "none",
        letterSpacing: "0.06em", whiteSpace: "nowrap",
      }}>
        {onCooldown ? `ping cooldown — ${pingCooldown}s` : "tap zombie to kill · click to ping · drag to explore"}
      </div>

      {/* Chat */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "8px 12px 12px",
        background: "rgba(8,12,20,0.88)",
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ marginBottom: 6, minHeight: 32 }}>
          {chatLog.slice(0, 2).map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              <span style={{ color: "rgba(200,255,150,0.6)" }}>{m.from}: </span>{m.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleChatSend()}
            placeholder="message player 1…"
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 10px",
              color: "rgba(255,255,255,0.8)", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={handleChatSend} style={{
            background: "rgba(200,255,150,0.1)",
            border: "0.5px solid rgba(200,255,150,0.2)",
            borderRadius: 8, color: "rgba(200,255,150,0.8)",
            fontSize: 13, padding: "6px 14px", cursor: "pointer",
          }}>
            send
          </button>
        </div>
      </div>
    </div>
  );
}