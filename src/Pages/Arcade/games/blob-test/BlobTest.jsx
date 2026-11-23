// src/Pages/Arcade/games/blob-test/BlobTest.jsx
//
// The "two blobs" test. Proves, on your real devices:
//   • the room + socket work          → you see each other move
//   • how laggy it feels              → live round-trip "lag" readout
//   • account saves follow you        → your colour + high-five count
//                                        load on any device you sign in on
//
// Controls: joystick (touch) or arrows/WASD. "use" button / space = wave.
// Bump into each other for a high five.
//
// Network events this game uses (all relayed by the generic arcade socket):
//   move     { x, y, face, c }   ~15/s, volatile (colour rides along, so a
//                                 late-mounting partner still gets it)
//   wave     {}
//   lag_ping { t } → lag_pong { t }

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MobileControls } from "@/Pages/Homestead/MobileControls";
import { useArcadeEvent } from "../../net/useArcadeRoom";
import { useArcadeSave } from "../../net/useArcadeSave";
import { C } from "../../ui";

const WORLD_W = 800;
const WORLD_H = 450;
const R       = 26;
const SPEED   = 230;               // world px / second
const SEND_EVERY_MS   = 66;        // ~15 position updates per second
const HEARTBEAT_MS    = 500;       // resend position at least this often when idle
const PING_EVERY_MS   = 2000;
const COLORS = ["#7ee081", "#7ee0ff", "#ffcc4d", "#ff7ac8", "#b48cff", "#ff8a4d"];

const KEYMAP = {
  ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
  w: "ArrowUp", a: "ArrowLeft", s: "ArrowDown", d: "ArrowRight",
  W: "ArrowUp", A: "ArrowLeft", S: "ArrowDown", D: "ArrowRight",
};

const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;

export default function BlobTest({ net, role, solo, onLeave }) {
  const { data: save, update, syncState } = useArcadeSave("blob-test", {
    color: role === "p2" ? COLORS[1] : COLORS[0],
    highFives: 0,
  });

  const canvasRef = useRef(null);
  const keysRef   = useRef({});
  const netRef    = useRef(net);
  const colorRef  = useRef(save.color);
  const soloRef   = useRef(solo);
  useEffect(() => { netRef.current = net; },        [net]);
  useEffect(() => { colorRef.current = save.color; }, [save.color]);
  useEffect(() => { soloRef.current = solo; },      [solo]);

  const stateRef = useRef(null);
  if (!stateRef.current) {
    const startX = role === "p2" ? 600 : 200;
    stateRef.current = {
      me:      { x: startX, y: WORLD_H / 2, face: role === "p2" ? -1 : 1, moving: false, wave: 0 },
      partner: { x: 0, y: 0, tx: 0, ty: 0, face: 1, moving: false, wave: 0, color: COLORS[1], seen: false },
      fx: [],
      fiveArmed: true,
      lastSentX: null, lastSentY: null,
    };
  }

  const [ping,     setPing]     = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Network in ─────────────────────────────────────────────────────────────
  useArcadeEvent(net, "move", (m) => {
    const p = stateRef.current.partner;
    if (!p.seen) { p.x = m.x; p.y = m.y; p.seen = true; }   // snap on first sight
    p.tx = m.x; p.ty = m.y;
    if (m.face) p.face = m.face;
    if (m.c) p.color = m.c;
  });
  useArcadeEvent(net, "wave",     () => { stateRef.current.partner.wave = 1.2; });
  useArcadeEvent(net, "lag_ping", (m) => { net.send("lag_pong", { t: m.t }, { volatile: true }); });
  useArcadeEvent(net, "lag_pong", (m) => { setPing(Math.round(performance.now() - m.t)); });
  useArcadeEvent(net, "partner_disconnected", () => { stateRef.current.partner.seen = false; setPing(null); });

  // ── Actions ────────────────────────────────────────────────────────────────
  const doWave = useCallback(() => {
    stateRef.current.me.wave = 1.2;
    if (!soloRef.current) netRef.current.send("wave", {}, { volatile: true });
  }, []);

  const onHighFiveRef = useRef(null);
  onHighFiveRef.current = () => update(prev => ({ highFives: (prev.highFives || 0) + 1 }));

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Escape") { setMenuOpen(o => !o); return; }
      if (e.key === " ") { e.preventDefault(); if (!e.repeat) doWave(); return; }
      const k = KEYMAP[e.key];
      if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
    const up = (e) => {
      const k = KEYMAP[e.key];
      if (k) delete keysRef.current[k];
    };
    const blur = () => { keysRef.current = {}; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [doWave]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let last = performance.now();
    let lastSend = 0;
    let lastPing = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width  = Math.round(canvas.clientWidth  * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      const me = st.me;
      const p  = st.partner;
      const k  = keysRef.current;
      const isSolo = soloRef.current;

      // Move me
      let dx = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0);
      let dy = (k.ArrowDown  ? 1 : 0) - (k.ArrowUp   ? 1 : 0);
      const len = Math.hypot(dx, dy);
      me.moving = len > 0;
      if (len) {
        dx /= len; dy /= len;
        me.x = Math.max(R, Math.min(WORLD_W - R, me.x + dx * SPEED * dt));
        me.y = Math.max(R, Math.min(WORLD_H - R, me.y + dy * SPEED * dt));
        if (dx) me.face = Math.sign(dx);
      }
      me.wave = Math.max(0, me.wave - dt);
      p.wave  = Math.max(0, p.wave - dt);

      // Smooth the partner toward their last reported spot
      if (p.seen) {
        const a = 1 - Math.exp(-dt * 14);
        p.moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 1.5;
        p.x += (p.tx - p.x) * a;
        p.y += (p.ty - p.y) * a;
      }

      // Send my position (throttled, plus an idle heartbeat)
      if (!isSolo) {
        const moved = me.x !== st.lastSentX || me.y !== st.lastSentY;
        const since = now - lastSend;
        if (since > SEND_EVERY_MS && (moved || since > HEARTBEAT_MS)) {
          netRef.current.send("move", {
            x: Math.round(me.x), y: Math.round(me.y), face: me.face, c: colorRef.current,
          }, { volatile: true });
          lastSend = now;
          st.lastSentX = me.x; st.lastSentY = me.y;
        }
        if (p.seen && now - lastPing > PING_EVERY_MS) {
          netRef.current.send("lag_ping", { t: now }, { volatile: true });
          lastPing = now;
        }
      }

      // High five on bump (re-arms once you've moved apart)
      if (p.seen) {
        const dist = Math.hypot(me.x - p.x, me.y - p.y);
        if (st.fiveArmed && dist < R * 2) {
          st.fiveArmed = false;
          burst(st.fx, (me.x + p.x) / 2, (me.y + p.y) / 2, [colorRef.current, p.color, "#ffffff"]);
          onHighFiveRef.current?.();
        } else if (dist > R * 2.6) {
          st.fiveArmed = true;
        }
      }

      // Particles
      for (const f of st.fx) {
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.vx *= 0.92; f.vy *= 0.92;
        f.life -= dt;
      }
      st.fx = st.fx.filter(f => f.life > 0);

      // ── Draw ──────────────────────────────────────────────────────────────
      const W = canvas.width, H = canvas.height;
      const scale = Math.min(W / WORLD_W, H / WORLD_H);
      const ox = (W - WORLD_W * scale) / 2;
      const oy = (H - WORLD_H * scale) / 2;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);

      ctx.fillStyle = "#17142b";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 50; x < WORLD_W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
      for (let y = 50; y < WORLD_H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }

      const t = now / 1000;
      if (p.seen && !isSolo) drawBlob(ctx, p, p.color, "partner", t);
      drawBlob(ctx, me, colorRef.current, "you", t);

      for (const f of st.fx) {
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── HUD ────────────────────────────────────────────────────────────────────
  const pingColor = ping == null ? C.dim : ping < 90 ? C.good : ping < 180 ? C.accent : C.bad;
  const saveLabel = { idle: "", saving: "saving…", saved: "saved ✓", offline: "offline, will retry" }[syncState];

  return (
    <div style={{ position: "relative", height: "100svh", overflow: "hidden", touchAction: "none", background: C.bg }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Top HUD */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 25, display: "flex", gap: 8,
        fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700, pointerEvents: "none",
        ...(isTouch() ? { top: 56 } : {}),
      }}>
        {!solo && (
          <Chip color={pingColor}>lag {ping == null ? "–" : `${ping}ms`}</Chip>
        )}
        <Chip color={C.accent}>🙌 {save.highFives || 0}</Chip>
        {saveLabel && <Chip color={syncState === "offline" ? C.bad : C.dim}>{saveLabel}</Chip>}
      </div>

      {/* Desktop menu button (touch devices get MobileControls' ≡) */}
      {!isTouch() && (
        <button onClick={() => setMenuOpen(true)} style={{
          position: "absolute", top: 12, left: 12, zIndex: 25, width: 38, height: 38, borderRadius: 10,
          background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontSize: 18, cursor: "pointer",
        }}>≡</button>
      )}

      {!isTouch() && (
        <div style={{
          position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", zIndex: 5,
          color: C.faint, fontSize: 13, fontFamily: "system-ui, sans-serif", pointerEvents: "none",
        }}>
          arrows / WASD to move · space to wave · bump for a high five · esc for menu
        </div>
      )}

      <MobileControls keysRef={keysRef} onUse={doWave} onPause={() => setMenuOpen(true)} />

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "absolute", inset: 0, zIndex: 60, background: "rgba(5,4,12,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 320, background: "#1a1630", border: `1px solid ${C.border}`,
            borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 16, color: C.text,
          }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Your blob</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {COLORS.map(col => (
                <button
                  key={col}
                  aria-label={`colour ${col}`}
                  onClick={() => update({ color: col })}
                  style={{
                    width: 40, height: 40, borderRadius: "50%", background: col, cursor: "pointer",
                    border: save.color === col ? "3px solid #fff" : "3px solid transparent",
                  }}
                />
              ))}
            </div>
            <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.5 }}>
              Your colour and 🙌 {save.highFives || 0} high fives are saved to your account.
              Sign in on another device and they’ll be there.
            </div>
            <button onClick={() => setMenuOpen(false)} style={menuBtn(true)}>Back to blobbing</button>
            <button onClick={onLeave} style={menuBtn(false)}>Leave room</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Chip({ color, children }) {
  return (
    <span style={{
      padding: "5px 10px", borderRadius: 999, background: "rgba(0,0,0,0.35)",
      border: `1px solid ${color}`, color,
    }}>{children}</span>
  );
}

function menuBtn(primary) {
  return {
    padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit",
    ...(primary
      ? { background: C.accent, color: "#1a1300", border: "none" }
      : { background: "transparent", color: C.dim, border: `1px solid ${C.border}` }),
  };
}

function burst(fx, x, y, colors) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 120 + Math.random() * 220;
    const max = 0.5 + Math.random() * 0.5;
    fx.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: max, max, size: 2 + Math.random() * 4,
      color: colors[i % colors.length],
    });
  }
}

function drawBlob(ctx, b, color, label, t) {
  const squish = b.moving ? Math.sin(t * 14) * 0.07 : Math.sin(t * 2.5) * 0.025;
  const sx = 1 - squish, sy = 1 + squish;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(b.x, b.y + R * 0.95, R * 0.85, R * 0.25, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(sx, sy);

  // body
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.arc(-R * 0.35, -R * 0.4, R * 0.28, 0, Math.PI * 2); ctx.fill();

  // eyes look the way you're facing
  const ex = b.face * R * 0.22;
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex + side * R * 0.3, -R * 0.1, R * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1300";
    ctx.beginPath(); ctx.arc(ex + side * R * 0.3 + b.face * R * 0.07, -R * 0.08, R * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // name tag
  ctx.fillStyle = "rgba(243,236,255,0.6)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, b.x, b.y + R + 22);

  // wave emote
  if (b.wave > 0) {
    ctx.globalAlpha = Math.min(1, b.wave * 2);
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("👋", b.x + Math.sin(t * 18) * 4, b.y - R - 12);
    ctx.globalAlpha = 1;
  }
}
