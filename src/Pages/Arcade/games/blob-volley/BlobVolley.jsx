// src/Pages/Arcade/games/blob-volley/BlobVolley.jsx
//
// Blob Volleyball — two half-circle blobs, a net, one ball. First to 7.
// p1 (host) plays on the left, p2 on the right. Solo = you vs the CPU.
//
// Netcode (host-authoritative, like ForestRun):
//   • Each player moves their OWN blob locally (instant controls) and sends
//       slime { x, y, vx, vy, c }        ~20/s, volatile
//   • The host runs the ball: physics, hits, scoring, serves. It sends
//       ball  { x, y, vx, vy, ph, s, w, sv }  ~20/s, volatile
//     ph = phase (serve | play | point | over), s = [left, right] score,
//     w = winner side when over, sv = serving side.
//     Score rides along in every snapshot, so a dropped packet can't desync it.
//   • The guest predicts the ball between snapshots (gravity, walls, net) and
//     smooths corrections so it doesn't pop.
//   • The host predicts the guest's blob forward from its last velocity so
//     hits line up with what the guest saw.
//   • rematch {}  guest → host, reliable.
//
// Controls: ← → / A D to move, ↑ / W / space to jump. Touch: on-screen buttons.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../net/useArcadeRoom";
import { useArcadeSave } from "../../net/useArcadeSave";
import { C } from "../../ui";

// ── Court ─────────────────────────────────────────────────────────────────────
const W = 800, H = 450, GROUND = 400;
const NET_X = 400, NET_W = 10, NET_TOP = 330;
const SR = 42;                  // blob radius
const BR = 11;                  // ball radius
const SLIME_SPEED = 340;
const JUMP_V      = 760;
const SLIME_G     = 2000;
const BALL_G      = 950;
const BALL_MAX    = 920;
const WIN_SCORE   = 7;
const SEND_MS     = 50;
const SERVE_PAUSE = 1.0;
const POINT_PAUSE = 1.3;
const SUBSTEPS    = 4;          // stops a fast ball tunnelling through the net
const LEFT = 0, RIGHT = 1;
const HOME_X = [200, 600];
const COLORS = ["#7ee081", "#7ee0ff", "#ffcc4d", "#ff7ac8", "#b48cff", "#ff8a4d"];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;

const KEYMAP = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowUp: "jump", w: "jump", W: "jump", " ": "jump",
};

// ── State helpers ─────────────────────────────────────────────────────────────
function mkSlime(side) {
  return { x: HOME_X[side], y: GROUND, vx: 0, vy: 0, color: COLORS[side],
           seen: false, rx: HOME_X[side], ry: GROUND, rvx: 0, rvy: 0, rAt: 0 };
}
function serveBall(side) {
  return { x: HOME_X[side], y: 170, vx: 0, vy: 0, ox: 0, oy: 0 }; // ox/oy = visual smoothing offset
}
function newMatch(server = LEFT) {
  return {
    slimes: [mkSlime(LEFT), mkSlime(RIGHT)],
    ball: serveBall(server),
    phase: "serve", timer: SERVE_PAUSE, server,
    score: [0, 0], winner: null, flash: null,
  };
}

function clampSlimeX(side, x) {
  return side === LEFT
    ? clamp(x, SR, NET_X - NET_W / 2 - SR)
    : clamp(x, NET_X + NET_W / 2 + SR, W - SR);
}

function stepSlime(s, side, dt) {
  s.vy += SLIME_G * dt;
  s.x = clampSlimeX(side, s.x + s.vx * dt);
  s.y += s.vy * dt;
  if (s.y >= GROUND) { s.y = GROUND; s.vy = 0; }
}

function capSpeed(b) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > BALL_MAX) { b.vx *= BALL_MAX / sp; b.vy *= BALL_MAX / sp; }
}

function collideNet(b) {
  const nl = NET_X - NET_W / 2, nr = NET_X + NET_W / 2;
  const cx = clamp(b.x, nl, nr), cy = clamp(b.y, NET_TOP, GROUND);
  const dx = b.x - cx, dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= BR) return;
  let nx, ny;
  if (d === 0) { nx = b.x < NET_X ? -1 : 1; ny = 0; }
  else { nx = dx / d; ny = dy / d; }
  b.x = cx + nx * BR; b.y = cy + ny * BR;
  const dot = b.vx * nx + b.vy * ny;
  if (dot < 0) { b.vx -= 1.9 * dot * nx; b.vy -= 1.9 * dot * ny; }
  // Don't let it balance on top of the net forever
  if (ny < -0.7 && Math.abs(b.vx) < 30) b.vx = (b.x < NET_X ? -1 : 1) * 90;
}

function collideSlime(b, s) {
  const dx = b.x - s.x, dy = b.y - s.y;
  const d = Math.hypot(dx, dy);
  if (d >= SR + BR || d === 0 || b.y > s.y + 2) return false;
  const nx = dx / d, ny = dy / d;
  b.x = s.x + nx * (SR + BR);
  b.y = s.y + ny * (SR + BR);
  let rvx = b.vx - s.vx, rvy = b.vy - s.vy;
  const dot = rvx * nx + rvy * ny;
  if (dot < 0) {
    rvx -= 2 * dot * nx; rvy -= 2 * dot * ny;
    b.vx = rvx + s.vx; b.vy = rvy + s.vy;
  }
  capSpeed(b);
  return true;
}

// One physics substep. Returns true if the ball touched the ground.
function stepBall(b, h, slimes) {
  b.vy += BALL_G * h;
  b.x += b.vx * h;
  b.y += b.vy * h;
  if (b.x < BR)     { b.x = BR;     b.vx =  Math.abs(b.vx); }
  if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
  collideNet(b);
  if (slimes) for (const s of slimes) collideSlime(b, s);
  if (b.y + BR >= GROUND) { b.y = GROUND - BR; return true; }
  return false;
}

// Host: run phases, physics and scoring.
function stepAuthority(st, dt) {
  if (st.phase === "over") return;
  if (st.phase === "serve") { st.timer -= dt; if (st.timer <= 0) st.phase = "play"; return; }
  if (st.phase === "point") {
    st.timer -= dt;
    if (st.timer <= 0) { st.ball = serveBall(st.server); st.phase = "serve"; st.timer = SERVE_PAUSE; }
    return;
  }
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    if (stepBall(st.ball, h, st.slimes)) {
      const scorer = st.ball.x < NET_X ? RIGHT : LEFT;
      st.score[scorer] += 1;
      st.server = scorer;
      st.flash = { side: scorer, t: 1 };
      if (st.score[scorer] >= WIN_SCORE) { st.phase = "over"; st.winner = scorer; }
      else { st.phase = "point"; st.timer = POINT_PAUSE; }
      return;
    }
  }
}

// Guest: predict the ball between host snapshots (no blob hits — host decides those).
function stepGuestBall(b, dt) {
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) if (stepBall(b, h, null)) { b.vx = 0; b.vy = 0; break; }
}

// CPU for solo. Beatable on purpose.
function predictLandingX(b) {
  const p = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
  for (let i = 0; i < 150; i++) {
    stepBall(p, 1 / 60, null);
    if (p.vy > 0 && p.y > GROUND - SR - 10) break;
  }
  return p.x;
}
const CPU_AIM_ERROR = 90;   // bigger = easier CPU

function cpuThink(s, b, side, phase) {
  const mine = side === RIGHT ? b.x > NET_X - 10 : b.x < NET_X + 10;
  const coming = side === RIGHT ? b.vx > 0 : b.vx < 0;
  // Re-roll a misjudgement each time the ball heads its way, so it can miss.
  const incoming = phase === "play" && (mine || coming);
  if (incoming && !s.cpuTracking) s.cpuErr = (Math.random() - 0.5) * CPU_AIM_ERROR;
  s.cpuTracking = incoming;
  let target = HOME_X[side];
  if (incoming) target = predictLandingX(b) + (side === RIGHT ? 16 : -16) + (s.cpuErr || 0);
  if (phase === "serve" && mine) target = b.x + (side === RIGHT ? 10 : -10);
  const dx = target - s.x;
  s.vx = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * SLIME_SPEED * 0.82;
  if (phase === "play" && mine && s.y >= GROUND && Math.abs(b.x - s.x) < 70 &&
      b.y > GROUND - 200 && b.y < GROUND - 70 && b.vy > -40) {
    s.vy = -JUMP_V * 0.95;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BlobVolley({ net, role, isHost, solo, onLeave }) {
  const mySide    = solo ? LEFT : (role === "p2" ? RIGHT : LEFT);
  const otherSide = 1 - mySide;
  const authority = !!isHost;   // RoomGate passes isHost || solo

  const { data: save, update, syncState } = useArcadeSave("blob-volley", {
    color: COLORS[mySide],
    vsFriend: { wins: 0, played: 0 },
    vsCpu:    { wins: 0, played: 0 },
  });

  const canvasRef = useRef(null);
  const keysRef   = useRef({});
  const stateRef  = useRef(null);
  if (!stateRef.current) stateRef.current = newMatch();

  // Live values for the loop / handlers
  const live = useRef({});
  live.current = { net, mySide, otherSide, authority, solo, color: save.color };

  const [phase,    setPhase]    = useState("serve");
  const [score,    setScore]    = useState([0, 0]);
  const [winner,   setWinner]   = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portrait, setPortrait] = useState(false);

  // Fresh match whenever solo ↔ co-op flips (sides change).
  const recordedRef = useRef(false);
  const prevSolo = useRef(solo);
  useEffect(() => {
    if (prevSolo.current !== solo) {
      stateRef.current = newMatch();
      recordedRef.current = false;
      prevSolo.current = solo;
    }
  }, [solo]);

  // ── Network in ─────────────────────────────────────────────────────────────
  useArcadeEvent(net, "slime", (m) => {
    const s = stateRef.current.slimes[live.current.otherSide];
    s.rx = m.x; s.ry = m.y; s.rvx = m.vx || 0; s.rvy = m.vy || 0; s.rAt = performance.now();
    if (!s.seen) { s.x = m.x; s.y = m.y; s.seen = true; }
    if (m.c) s.color = m.c;
  });

  useArcadeEvent(net, "ball", (m) => {
    if (live.current.authority) return;
    const st = stateRef.current;
    const b  = st.ball;
    // Keep drawing it where it was, as an offset that fades out (no popping).
    b.ox += b.x - m.x;
    b.oy += b.y - m.y;
    if (Math.hypot(b.ox, b.oy) > 120) { b.ox = 0; b.oy = 0; }   // big jump (new serve) — just snap
    b.x = m.x; b.y = m.y; b.vx = m.vx; b.vy = m.vy;
    const prevTotal = st.score[0] + st.score[1];
    if (m.s && m.s[0] + m.s[1] > prevTotal) st.flash = { side: m.s[0] > st.score[0] ? LEFT : RIGHT, t: 1 };
    if (m.s) st.score = m.s;
    st.phase  = m.ph;
    st.winner = m.w ?? null;
    st.server = m.sv ?? st.server;
  });

  useArcadeEvent(net, "partner_disconnected", () => {
    stateRef.current.slimes[live.current.otherSide].seen = false;
  });

  const restart = useCallback(() => {
    const L = live.current;
    if (L.authority) {
      stateRef.current = newMatch(stateRef.current.winner === LEFT ? RIGHT : LEFT); // loser serves
      recordedRef.current = false;
    } else {
      L.net.send("rematch");
    }
  }, []);
  useArcadeEvent(net, "rematch", () => {
    if (live.current.authority && stateRef.current.phase === "over") restart();
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Escape") { setMenuOpen(o => !o); return; }
      const k = KEYMAP[e.key];
      if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
    const up = (e) => { const k = KEYMAP[e.key]; if (k) delete keysRef.current[k]; };
    const blur = () => { keysRef.current = {}; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Portrait hint for phones
  useEffect(() => {
    const check = () => setPortrait(isTouch() && window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), lastSend = 0;
    let uiPhase = null, uiScore = "", uiWinner = undefined;

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
      const L  = live.current;
      const st = stateRef.current;
      const me = st.slimes[L.mySide];
      const other = st.slimes[L.otherSide];
      const k = keysRef.current;
      const over = st.phase === "over";

      // My blob
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      me.vx = over ? 0 : dir * SLIME_SPEED;
      if (!over && k.jump && me.y >= GROUND) me.vy = -JUMP_V;
      stepSlime(me, L.mySide, dt);
      me.color = L.color;
      me.seen = true;

      // Other blob: CPU in solo, otherwise extrapolate from the partner's last report
      if (L.solo) {
        if (!over) cpuThink(other, st.ball, L.otherSide, st.phase); else other.vx = 0;
        stepSlime(other, L.otherSide, dt);
        other.seen = true;
        other.color = L.color === COLORS[1] ? COLORS[0] : COLORS[1];
      } else if (other.rAt) {
        const age = Math.min(0.15, (now - other.rAt) / 1000);
        const tx = clampSlimeX(L.otherSide, other.rx + other.rvx * age);
        const ty = Math.min(GROUND, other.ry + other.rvy * age + 0.5 * SLIME_G * age * age);
        const a = 1 - Math.exp(-dt * 25);
        other.x += (tx - other.x) * a;
        other.y += (ty - other.y) * a;
        other.vx = other.rvx; other.vy = other.rvy;
      }

      // Ball
      if (L.authority) stepAuthority(st, dt);
      else if (st.phase === "play") stepGuestBall(st.ball, dt);
      const fade = Math.exp(-dt * 12);
      st.ball.ox *= fade; st.ball.oy *= fade;
      if (st.flash) { st.flash.t -= dt * 0.9; if (st.flash.t <= 0) st.flash = null; }

      // Send
      if (!L.solo && now - lastSend > SEND_MS) {
        L.net.send("slime", {
          x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), c: L.color,
        }, { volatile: true });
        if (L.authority) {
          const b = st.ball;
          L.net.send("ball", {
            x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy),
            ph: st.phase, s: st.score, w: st.winner, sv: st.server,
          }, { volatile: true });
        }
        lastSend = now;
      }

      // Push the few things the DOM needs, only when they change
      const sc = st.score.join("-");
      if (st.phase !== uiPhase)  { uiPhase = st.phase;   setPhase(st.phase); }
      if (sc !== uiScore)        { uiScore = sc;         setScore([...st.score]); }
      if (st.winner !== uiWinner){ uiWinner = st.winner; setWinner(st.winner); }

      draw(ctx, canvas, st, L, now / 1000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  // ── Record the result once per match ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "over") { recordedRef.current = false; return; }
    if (recordedRef.current || winner == null) return;
    recordedRef.current = true;
    const key = solo ? "vsCpu" : "vsFriend";
    const won = winner === mySide;
    update(prev => {
      const cur = prev[key] || { wins: 0, played: 0 };
      return { [key]: { wins: cur.wins + (won ? 1 : 0), played: cur.played + 1 } };
    });
  }, [phase, winner, solo, mySide, update]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const otherName = solo ? "CPU" : "Partner";
  const iWon = winner === mySide;
  const saveLabel = { idle: "", saving: "saving…", saved: "", offline: "offline, will retry" }[syncState];
  const vf = save.vsFriend || { wins: 0, played: 0 };
  const vc = save.vsCpu    || { wins: 0, played: 0 };

  return (
    <div style={{ position: "relative", height: "100svh", overflow: "hidden", touchAction: "none", background: C.bg, userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      <button onClick={() => setMenuOpen(true)} style={{
        position: "absolute", top: 12, left: 12, zIndex: 25, width: 40, height: 40, borderRadius: 10,
        background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, color: C.dim, fontSize: 18, cursor: "pointer",
      }}>≡</button>

      {saveLabel && (
        <div style={{ position: "absolute", top: 18, right: 14, zIndex: 25, color: C.bad, fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
          {saveLabel}
        </div>
      )}

      {portrait && (
        <div style={{
          position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", zIndex: 20, pointerEvents: "none",
          color: C.accent2, fontSize: 14, fontWeight: 700, fontFamily: "system-ui, sans-serif",
        }}>↻ turn sideways for a bigger court</div>
      )}

      {!isTouch() && (
        <div style={{
          position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", zIndex: 5, pointerEvents: "none",
          color: C.faint, fontSize: 13, fontFamily: "system-ui, sans-serif",
        }}>← → move · ↑ / space jump · first to {WIN_SCORE} · esc for menu</div>
      )}

      <TouchPad keysRef={keysRef} />

      {phase === "over" && !menuOpen && (
        <Overlay>
          <div style={{ fontSize: 48 }}>{iWon ? "🏆" : "🏐"}</div>
          <div style={{ fontWeight: 800, fontSize: 26 }}>{iWon ? "You win!" : `${otherName} wins!`}</div>
          <div style={{ color: C.dim, fontSize: 18, fontFamily: "monospace" }}>
            {score[mySide]} – {score[otherSide]}
          </div>
          <button onClick={restart} style={menuBtn(true)}>Play again</button>
          {!authority && <div style={{ color: C.faint, fontSize: 12, textAlign: "center" }}>starts a new match for both of you</div>}
          <button onClick={onLeave} style={menuBtn(false)}>Back to room list</button>
        </Overlay>
      )}

      {menuOpen && (
        <Overlay onClose={() => setMenuOpen(false)}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Your blob</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COLORS.map(col => (
              <button key={col} aria-label={`colour ${col}`} onClick={() => update({ color: col })} style={{
                width: 40, height: 40, borderRadius: "50%", background: col, cursor: "pointer",
                border: save.color === col ? "3px solid #fff" : "3px solid transparent",
              }} />
            ))}
          </div>
          <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
            vs friend: <b style={{ color: C.text }}>{vf.wins}</b> wins of {vf.played}<br />
            vs CPU: <b style={{ color: C.text }}>{vc.wins}</b> wins of {vc.played}
          </div>
          <button onClick={() => setMenuOpen(false)} style={menuBtn(true)}>Back to the game</button>
          <button onClick={onLeave} style={menuBtn(false)}>Back to room list</button>
        </Overlay>
      )}
    </div>
  );
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw(ctx, canvas, st, L, t) {
  const cw = canvas.width, ch = canvas.height;
  const scale = Math.min(cw / W, ch / H);
  const ox = (cw - W * scale) / 2, oy = (ch - H * scale) / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  // Sky + ground
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#1b1440");
  sky.addColorStop(1, "#33287a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);
  ctx.fillStyle = "#4a3d8f";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, GROUND, W, 3);

  // Score
  ctx.textAlign = "center";
  ctx.font = "bold 46px system-ui, sans-serif";
  for (const side of [LEFT, RIGHT]) {
    const x = side === LEFT ? NET_X - 80 : NET_X + 80;
    const flashing = st.flash && st.flash.side === side;
    ctx.fillStyle = flashing ? C.accent : "rgba(243,236,255,0.55)";
    ctx.fillText(String(st.score[side]), x, 100);
  }
  if (st.score[0] + st.score[1] === 0 && st.phase === "serve") {
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = "rgba(243,236,255,0.35)";
    ctx.fillText(`first to ${WIN_SCORE}`, NET_X, 130);
  }

  // Net
  ctx.fillStyle = "#e8e0ff";
  ctx.fillRect(NET_X - NET_W / 2, NET_TOP, NET_W, GROUND - NET_TOP);

  const b = st.ball;
  const bx = b.x + b.ox, by = b.y + b.oy;

  // Ball shadow
  const hgt = clamp((GROUND - by) / GROUND, 0, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.35 - hgt * 0.25})`;
  ctx.beginPath(); ctx.ellipse(bx, GROUND + 3, BR * (1.3 - hgt * 0.6), 4, 0, 0, Math.PI * 2); ctx.fill();

  // Blobs
  for (const side of [LEFT, RIGHT]) {
    const s = st.slimes[side];
    const isMe = side === L.mySide;
    if (!s.seen && !isMe) ctx.globalAlpha = 0.25;
    drawSlime(ctx, s, side, bx, by);
    ctx.globalAlpha = 1;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(243,236,255,0.5)";
    ctx.fillText(isMe ? "you" : (L.solo ? "cpu" : "partner"), s.x, GROUND + 26);
  }

  // Ball
  ctx.fillStyle = C.accent;
  ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Serve hint
  if (st.phase === "serve") {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(bx, by - BR - 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSlime(ctx, s, side, ballX, ballY) {
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, SR, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.arc(s.x - SR * 0.35, s.y - SR * 0.6, SR * 0.18, 0, Math.PI * 2); ctx.fill();

  // Eye faces the net and follows the ball
  const ex = s.x + (side === LEFT ? 1 : -1) * SR * 0.45;
  const ey = s.y - SR * 0.55;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
  const a = Math.atan2(ballY - ey, ballX - ex);
  ctx.fillStyle = "#1a1300";
  ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 4, ey + Math.sin(a) * 4, 4.5, 0, Math.PI * 2); ctx.fill();
}

// ── UI bits ───────────────────────────────────────────────────────────────────
function TouchPad({ keysRef }) {
  if (!isTouch()) return null;
  const bind = (key) => {
    const release = () => { delete keysRef.current[key]; };
    return {
      onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); keysRef.current[key] = true; },
      onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
      onContextMenu: (e) => e.preventDefault(),
    };
  };
  const pad = (size) => ({
    width: size, height: size, borderRadius: "50%", touchAction: "none", userSelect: "none",
    WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(245,230,200,0.12)", border: "1.5px solid rgba(245,230,200,0.25)",
    color: "rgba(245,230,200,0.75)", fontWeight: 800, fontFamily: "system-ui, sans-serif",
  });
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20, pointerEvents: "none",
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      padding: "0 18px calc(18px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{ display: "flex", gap: 14, pointerEvents: "auto" }}>
        <div {...bind("left")}  style={{ ...pad(70), fontSize: 26 }}>◀</div>
        <div {...bind("right")} style={{ ...pad(70), fontSize: 26 }}>▶</div>
      </div>
      <div style={{ pointerEvents: "auto" }}>
        <div {...bind("jump")} style={{ ...pad(86), fontSize: 15, background: "rgba(255,204,77,0.16)", borderColor: "rgba(255,204,77,0.45)", color: C.accent }}>
          JUMP
        </div>
      </div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 60, background: "rgba(5,4,12,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "system-ui, sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 320, background: "#1a1630", border: `1px solid ${C.border}`,
        borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", alignItems: "stretch",
        gap: 14, color: C.text, textAlign: "center",
      }}>
        {children}
      </div>
    </div>
  );
}

function menuBtn(primary) {
  return {
    padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    ...(primary
      ? { background: C.accent, color: "#1a1300", border: "none" }
      : { background: "transparent", color: C.dim, border: `1px solid ${C.border}` }),
  };
}