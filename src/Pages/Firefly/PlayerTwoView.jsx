// src/Pages/Firefly/PlayerTwoView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useFireflyRoom } from "./useFireflyRoom";
import { generateMap, updateFireflies } from "./gameEngine";

const WORLD         = 2400;
const PING_DURATION = 3000;
const CHAT_MAX      = 20;

export default function PlayerTwoView({ room, onGameOver }) {
  const canvasRef = useRef(null);

  const stateRef = useRef({
    playerPos:  { x: WORLD / 2, y: WORLD / 2 },
    zombiePos:  null,
    fireflies:  [],
    mushrooms:  [],
    holes:      [],
    score:      0,
    timeLeft:   180,
    pings:      [],
    chatMessages: [],
    cam:        { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },
    dragging:   false,
    dragStart:  { mx: 0, my: 0, cx: 0, cy: 0 },
    following:  true,
  });

  const rafRef       = useRef(null);
  const lastTimeRef  = useRef(performance.now());
  const mapRef       = useRef(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLog,   setChatLog]   = useState([]);
  const [score,     setScore]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(180);

  // ── Camera helpers ─────────────────────────────────────────────────────────
  function worldToCanvas(wx, wy) {
    const { cam } = stateRef.current;
    return { cx: wx - cam.x, cy: wy - cam.y };
  }

  function canvasToWorld(cx, cy) {
    const { cam } = stateRef.current;
    return { wx: cx + cam.x, wy: cy + cam.y };
  }

  function centerOn(wx, wy) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stateRef.current.cam = {
      x: wx - canvas.width  / 2,
      y: wy - canvas.height / 2,
    };
  }

  // ── Realtime handlers ──────────────────────────────────────────────────────
  const handlers = useRef({
    onPlayerMove: ({ x, y }) => {
      stateRef.current.playerPos = { x, y };
      if (stateRef.current.following) centerOn(x, y);
    },
    onFireflySync: ({ fireflies }) => {
      // Gently correct local positions rather than snapping — keeps motion smooth
      const local = stateRef.current.fireflies;
      fireflies.forEach(incoming => {
        const f = local.find(l => l.id === incoming.id);
        if (!f) return;
        f.collected = incoming.collected;
        // Lerp toward the authoritative position (0.3 = soft correction)
        f.x = f.x + (incoming.x - f.x) * 0.3;
        f.y = f.y + (incoming.y - f.y) * 0.3;
      });
    },
    onZombieUpdate: ({ x, y }) => {
      stateRef.current.zombiePos = { x, y };
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

  const { sendPing, sendChat } = useFireflyRoom(room?.id ?? null, handlers);

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

    // Holes — dark circles, clearly visible to P2
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

    // Mushrooms — glowing purple, P2 only
    (state.mushrooms || []).forEach(m => {
      const { cx, cy } = worldToCanvas(m.x, m.y);
      if (cx < -30 || cx > W+30 || cy < -30 || cy > H+30) return;
      const pulsed = 0.6 + 0.4 * Math.sin(t * 1.8 + (m.pulse ?? 0));
      const cap = m.capSize ?? 10;
      ctx.save();
      // Glow
      ctx.globalAlpha = 0.18 * pulsed;
      ctx.beginPath(); ctx.arc(cx, cy, cap * 2.5, 0, Math.PI*2);
      ctx.fillStyle = "rgba(160,0,255,1)"; ctx.fill();
      // Stem
      ctx.globalAlpha = 0.7 * pulsed;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + cap * 0.4);
      ctx.lineTo(cx + 2, cy + cap * 0.4);
      ctx.lineTo(cx + 2, cy + cap);
      ctx.lineTo(cx - 2, cy + cap);
      ctx.closePath();
      ctx.fillStyle = "rgba(200,160,255,0.8)"; ctx.fill();
      // Cap
      ctx.globalAlpha = 0.9 * pulsed;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cap, cap * 0.65, 0, Math.PI, 0);
      ctx.fillStyle = `rgba(160,0,255,${0.85 * pulsed})`; ctx.fill();
      // Spots
      ctx.globalAlpha = 0.8 * pulsed;
      ctx.fillStyle = "rgba(220,180,255,0.9)";
      [[-cap*0.35, -cap*0.2], [cap*0.3, -cap*0.3], [0, -cap*0.45]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, 1.5, 0, Math.PI*2); ctx.fill();
      });
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

    // Zombie
    if (state.zombiePos) {
      const { cx, cy } = worldToCanvas(state.zombiePos.x, state.zombiePos.y);
      if (cx > -20 && cx < W + 20 && cy > -20 && cy < H + 20) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,60,60,0.2)"; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444"; ctx.fill();
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

    // Player 1 dot — white, always on top
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

    // Run firefly simulation locally — same logic as P1, keeps motion smooth
    // Sync packets from P1 gently correct any drift
    if (stateRef.current.fireflies.length > 0) {
      updateFireflies(stateRef.current.fireflies, { x: -9999, y: -9999 }, dt, 0);
      // pass unreachable player pos so nothing gets collected on P2's side
    }

    stateRef.current.timeLeft = Math.max(0, stateRef.current.timeLeft - dt);
    setTimeLeft(Math.ceil(stateRef.current.timeLeft));

    draw(ctx, W, H, ts / 1000);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room?.map_seed) return;

    // Generate map here so it's ready before the first frame
    const map = generateMap(room.map_seed);
    mapRef.current = map;
    stateRef.current.fireflies  = map.fireflies.map(f => ({ ...f }));
    stateRef.current.mushrooms  = map.mushrooms;
    stateRef.current.holes      = map.holes;

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    centerOn(WORLD / 2, WORLD / 2);
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Click to ping ──────────────────────────────────────────────────────────
  function handleCanvasClick(e) {
    if (stateRef.current.didDrag) return; // don't ping at end of a drag
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { wx, wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    sendPing(wx, wy);
    stateRef.current.pings.push({ x: wx, y: wy, expiresAt: Date.now() + PING_DURATION });
  }

  // ── Drag to scroll ─────────────────────────────────────────────────────────
  function handleMouseDown(e) {
    stateRef.current.dragging  = true;
    stateRef.current.didDrag   = false;
    stateRef.current.following = false;
    stateRef.current.dragStart = { mx: e.clientX, my: e.clientY, cx: stateRef.current.cam.x, cy: stateRef.current.cam.y };
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
    stateRef.current.dragStart = { mx: e.touches[0].clientX, my: e.touches[0].clientY, cx: stateRef.current.cam.x, cy: stateRef.current.cam.y };
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
      const { wx, wy } = canvasToWorld(
        e.changedTouches[0].clientX - rect.left,
        e.changedTouches[0].clientY - rect.top,
      );
      sendPing(wx, wy);
      stateRef.current.pings.push({ x: wx, y: wy, expiresAt: Date.now() + PING_DURATION });
    }
  }

  function handleRecenter() {
    stateRef.current.following = true;
    centerOn(stateRef.current.playerPos.x, stateRef.current.playerPos.y);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  function handleChatSend() {
    const text = chatInput.trim();
    if (!text) return;
    sendChat(text, "P2");
    const msg = { text, from: "P2", ts: Date.now() };
    stateRef.current.chatMessages.unshift(msg);
    setChatLog(prev => [msg, ...prev].slice(0, CHAT_MAX));
    setChatInput("");
  }

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <div style={{ width: "100%", height: "100svh", background: "#080c14", position: "relative", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* HUD */}
      <div style={{ position: "absolute", top: 14, left: 18, pointerEvents: "none", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{score} ✦</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{fmt(timeLeft)}</div>
      </div>

      <div style={{
        position: "absolute", top: 14, right: 18, fontSize: 11,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.2)", pointerEvents: "none",
      }}>
        navigator
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
        click to ping · drag to explore
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