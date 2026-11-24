// src/Pages/Arcade/games/blob-volley/BlobVolley.jsx
//
// Blob Volleyball — two half-circle blobs, a net, one ball. First to 7.
// p1 (host) plays on the left, p2 on the right. Solo = you vs the CPU.
//
// Netcode: "whoever's side the ball is on, runs the ball"
//   • Both devices simulate the ball every frame with the same physics.
//   • The ball can only touch your blob on YOUR side of the net, so while it's
//     on your side YOUR device is in charge of it: your hits happen instantly,
//     with no waiting on the internet. You send the ball ~30/s (and right away on a hit).
//   • The other device keeps simulating too (so it looks smooth) and gently
//     corrects toward what you sent, pushed forward by the measured delay.
//   • When the ball crosses the net, the other device takes over.
//   • The ball landing is decided by the device whose side it lands on.
//     The host keeps the score, serves and phases and shares them.
//
// Messages
//   slime  { x, y, vx, vy, c }               ~30/s volatile   (your blob)
//   ball   { x, y, vx, vy, q, rl }           ~30/s volatile   (only while it's on your side)
//   vland  { rl, scorer }                    guest → host     (it landed on the guest's side)
//   vgame  { ph, s, sv, w, rl, t }           host → guest     (phase, score, server, winner, rally number)
//   vping / vpong { t }                      measures the delay between devices
//   rematch {}                               guest → host
//
// Controls: ← → / A D to move, ↑ / W / space to jump. Touch: on-screen buttons.
// No emojis: everything is drawn in code.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../net/useArcadeRoom";
import { useArcadeSave } from "../../net/useArcadeSave";
import { C } from "../../ui";
import { sfx, unlockSfx, isMuted, setMuted } from "../walk-3d/sfx";

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
const SEND_MS     = 33;         // ~30 updates a second
const SERVE_PAUSE = 1.0;
const POINT_PAUSE = 1.4;
const SUBSTEPS    = 6;          // stops a fast ball tunnelling through blobs or the net
const LEFT = 0, RIGHT = 1;
const HOME_X = [200, 600];
const COLORS = ["#7ee081", "#7ee0ff", "#ffcc4d", "#ff7ac8", "#b48cff", "#ff8a4d"];
const CPU_AIM_ERROR = 90;       // bigger = easier CPU

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;
const sideOf = (x) => (x < NET_X ? LEFT : RIGHT);

const KEYMAP = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowUp: "jump", w: "jump", W: "jump", " ": "jump",
};

// ── State helpers ─────────────────────────────────────────────────────────────
function mkSlime(side) {
  return { x: HOME_X[side], y: GROUND, vx: 0, vy: 0, color: COLORS[side], seen: false,
           rx: HOME_X[side], ry: GROUND, rvx: 0, rvy: 0, rAt: 0, squash: 0, blinkAt: 2 + Math.random() * 3 };
}
function serveBall(side) {
  return { x: HOME_X[side], y: 170, vx: 0, vy: 0, ox: 0, oy: 0, rot: 0, frozen: false, frozeAt: 0 };
}
function newMatch(server = LEFT) {
  return {
    slimes: [mkSlime(LEFT), mkSlime(RIGHT)],
    ball: serveBall(server),
    phase: "serve", timer: SERVE_PAUSE, server, rally: 1,
    score: [0, 0], winner: null, flash: null, scoreBump: [0, 0],
    fx: [], trail: [], shake: 0,
  };
}

function clampSlimeX(side, x) {
  return side === LEFT ? clamp(x, SR, NET_X - NET_W / 2 - SR) : clamp(x, NET_X + NET_W / 2 + SR, W - SR);
}
function stepSlime(s, side, dt) {
  const wasAir = s.y < GROUND;
  s.vy += SLIME_G * dt;
  s.x = clampSlimeX(side, s.x + s.vx * dt);
  s.y += s.vy * dt;
  if (s.y >= GROUND) { if (wasAir && s.vy > 300) s.squash = 1; s.y = GROUND; s.vy = 0; }
  s.squash = Math.max(0, s.squash - dt * 5);
}
function capSpeed(b) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > BALL_MAX) { b.vx *= BALL_MAX / sp; b.vy *= BALL_MAX / sp; }
}
function collideNet(b) {
  const nl = NET_X - NET_W / 2, nr = NET_X + NET_W / 2;
  const cx = clamp(b.x, nl, nr), cy = clamp(b.y, NET_TOP, GROUND);
  const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
  if (d >= BR) return;
  let nx, ny;
  if (d === 0) { nx = b.x < NET_X ? -1 : 1; ny = 0; } else { nx = dx / d; ny = dy / d; }
  b.x = cx + nx * BR; b.y = cy + ny * BR;
  const dot = b.vx * nx + b.vy * ny;
  if (dot < 0) { b.vx -= 1.9 * dot * nx; b.vy -= 1.9 * dot * ny; }
  if (ny < -0.7 && Math.abs(b.vx) < 30) b.vx = (b.x < NET_X ? -1 : 1) * 90;   // don't balance on the net
}
function collideSlime(b, s) {
  const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy);
  if (d >= SR + BR || d === 0 || b.y > s.y + 2) return false;
  const nx = dx / d, ny = dy / d;
  b.x = s.x + nx * (SR + BR); b.y = s.y + ny * (SR + BR);
  let rvx = b.vx - s.vx, rvy = b.vy - s.vy;
  const dot = rvx * nx + rvy * ny;
  if (dot < 0) { rvx -= 2 * dot * nx; rvy -= 2 * dot * ny; b.vx = rvx + s.vx; b.vy = rvy + s.vy; }
  capSpeed(b);
  return dot < 0;
}
// One substep. Returns { ground, hit: side|null }.
function stepBall(b, h, slimes) {
  b.vy += BALL_G * h;
  b.x += b.vx * h; b.y += b.vy * h;
  if (b.x < BR)     { b.x = BR;     b.vx =  Math.abs(b.vx); }
  if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
  collideNet(b);
  let hit = null;
  if (slimes) slimes.forEach((s, side) => { if (s && collideSlime(b, s)) hit = side; });
  if (b.y + BR >= GROUND) { b.y = GROUND - BR; return { ground: true, hit }; }
  return { ground: false, hit };
}
// Push a ball forward in time (used to catch up on network delay).
function extrapolate(b, secs, slimes) {
  const steps = Math.min(30, Math.ceil(secs / (1 / 240)));
  if (steps <= 0) return false;
  const h = secs / steps;
  for (let i = 0; i < steps; i++) if (stepBall(b, h, slimes).ground) return true;
  return false;
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
function cpuThink(s, b, side, phase) {
  const mine = side === RIGHT ? b.x > NET_X - 10 : b.x < NET_X + 10;
  const coming = side === RIGHT ? b.vx > 0 : b.vx < 0;
  const incoming = phase === "play" && (mine || coming);
  if (incoming && !s.cpuTracking) s.cpuErr = (Math.random() - 0.5) * CPU_AIM_ERROR;
  s.cpuTracking = incoming;
  let target = HOME_X[side];
  if (incoming) target = predictLandingX(b) + (side === RIGHT ? 16 : -16) + (s.cpuErr || 0);
  if (phase === "serve" && mine) target = b.x + (side === RIGHT ? 10 : -10);
  const dx = target - s.x;
  s.vx = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * SLIME_SPEED * 0.82;
  if (phase === "play" && mine && s.y >= GROUND && Math.abs(b.x - s.x) < 70 &&
      b.y > GROUND - 200 && b.y < GROUND - 70 && b.vy > -40) s.vy = -JUMP_V * 0.95;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BlobVolley({ net, role, isHost, solo, onLeave }) {
  const mySide    = solo ? LEFT : (role === "p2" ? RIGHT : LEFT);
  const otherSide = 1 - mySide;
  const authority = !!isHost;   // RoomGate passes isHost || solo — the host keeps score

  const { data: save, update, syncState } = useArcadeSave("blob-volley", {
    color: COLORS[mySide], vsFriend: { wins: 0, played: 0 }, vsCpu: { wins: 0, played: 0 },
  });

  const canvasRef = useRef(null);
  const keysRef   = useRef({});
  const stateRef  = useRef(null);
  if (!stateRef.current) stateRef.current = newMatch();
  const netRef = useRef({ lat: 0.06, lastQ: 0, sendQ: 0, myHitAt: -1, forceSend: false, landSent: 0 });

  const live = useRef({});
  live.current = { net, mySide, otherSide, authority, solo, color: save.color };

  const [phase,    setPhase]    = useState("serve");
  const [score,    setScore]    = useState([0, 0]);
  const [winner,   setWinner]   = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [muted,    setMutedUi]  = useState(isMuted());
  const [pingMs,   setPingMs]   = useState(null);

  // Fresh match whenever solo ↔ co-op flips (sides change).
  const recordedRef = useRef(false);
  const prevSolo = useRef(solo);
  useEffect(() => {
    if (prevSolo.current !== solo) { stateRef.current = newMatch(); recordedRef.current = false; prevSolo.current = solo; }
  }, [solo]);

  // ── Scoring (host) ─────────────────────────────────────────────────────────
  const scorePoint = useCallback((scorer) => {
    const st = stateRef.current;
    if (st.phase !== "play") return;
    st.score[scorer] += 1;
    st.server = scorer;
    st.flash = { side: scorer, t: 1 }; st.scoreBump[scorer] = 1;
    if (st.score[scorer] >= WIN_SCORE) { st.phase = "over"; st.winner = scorer; sfx.fanfare(); }
    else { st.phase = "point"; st.timer = POINT_PAUSE; sfx.pop(); }
    netRef.current.forceGame = true;
  }, []);

  // ── Network in ─────────────────────────────────────────────────────────────
  useArcadeEvent(net, "slime", (m) => {
    const s = stateRef.current.slimes[live.current.otherSide];
    s.rx = m.x; s.ry = m.y; s.rvx = m.vx || 0; s.rvy = m.vy || 0; s.rAt = performance.now();
    if (!s.seen) { s.x = m.x; s.y = m.y; s.seen = true; }
    if (m.c) s.color = m.c;
  });

  // The other device is in charge of the ball (it's on their side): catch up and smooth.
  useArcadeEvent(net, "ball", (m) => {
    const L = live.current, N = netRef.current, st = stateRef.current;
    if (L.solo || m.rl !== st.rally || st.phase !== "play") return;
    if (m.q <= N.lastQ) return;                                   // old / out of order
    N.lastQ = m.q;
    const b = st.ball;
    // I just hit it on my side — my version wins; theirs is out of date.
    if (performance.now() - N.myHitAt < 300 && sideOf(b.x) === L.mySide) return;
    const e = { x: m.x, y: m.y, vx: m.vx, vy: m.vy };
    const me = st.slimes[L.mySide];
    const slimes = L.mySide === LEFT ? [me, null] : [null, me];
    const landed = extrapolate(e, N.lat, slimes);                 // where it is NOW on their screen
    b.ox += b.x - e.x; b.oy += b.y - e.y;
    if (Math.hypot(b.ox, b.oy) > 140) { b.ox = 0; b.oy = 0; }
    b.x = e.x; b.y = e.y; b.vx = e.vx; b.vy = e.vy;
    b.frozen = landed; if (landed) b.frozeAt = performance.now();
  });

  useArcadeEvent(net, "vland", (m) => {
    if (!live.current.authority) return;
    if (m.rl === stateRef.current.rally) scorePoint(m.scorer);
  });

  useArcadeEvent(net, "vgame", (m) => {
    if (live.current.authority) return;
    const st = stateRef.current, N = netRef.current;
    if (m.rl !== st.rally) {                                       // new rally: ball back to the server
      st.rally = m.rl; st.ball = serveBall(m.sv); N.lastQ = 0; N.landSent = 0; st.trail = [];
    }
    for (const side of [LEFT, RIGHT]) if (m.s[side] > st.score[side]) { st.flash = { side, t: 1 }; st.scoreBump[side] = 1; sfx.pop(); }
    if (m.ph === "over" && st.phase !== "over") sfx.fanfare();
    if (m.ph === "play" && st.phase === "serve") sfx.beep(true);
    st.score = m.s; st.phase = m.ph; st.server = m.sv; st.winner = m.w ?? null;
  });

  useArcadeEvent(net, "vping", (m) => live.current.net.send("vpong", { t: m.t }));
  useArcadeEvent(net, "vpong", (m) => {
    const rtt = (performance.now() - m.t) / 1000;
    const N = netRef.current;
    N.lat = clamp(N.lat * 0.7 + (rtt / 2) * 0.3, 0, 0.25);
    setPingMs(Math.round(rtt * 1000));
  });

  useArcadeEvent(net, "partner_disconnected", () => { stateRef.current.slimes[live.current.otherSide].seen = false; });

  const restart = useCallback(() => {
    const L = live.current;
    if (L.authority) {
      const st = stateRef.current;
      const rally = st.rally + 1;
      stateRef.current = newMatch(st.winner === LEFT ? RIGHT : LEFT);   // loser serves
      stateRef.current.rally = rally;
      recordedRef.current = false;
      netRef.current.forceGame = true;
    } else L.net.send("rematch");
  }, []);
  useArcadeEvent(net, "rematch", () => { if (live.current.authority && stateRef.current.phase === "over") restart(); });

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      unlockSfx();
      if (e.key === "Escape") { setMenuOpen(o => !o); return; }
      const k = KEYMAP[e.key];
      if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
    const up = (e) => { const k = KEYMAP[e.key]; if (k) delete keysRef.current[k]; };
    const blur = () => { keysRef.current = {}; };
    const tap = () => unlockSfx();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    window.addEventListener("pointerdown", tap);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur);
      window.removeEventListener("pointerdown", tap);
    };
  }, []);

  useEffect(() => {
    const check = () => setPortrait(isTouch() && window.innerHeight > window.innerWidth);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), lastSend = 0, lastGame = 0, lastPing = 0, lastPhase = "";
    let uiPhase = null, uiScore = "", uiWinner = undefined;
    if (window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.volley = { state: stateRef, net: netRef };

    function resize() {
      const dpr = Math.min(3, window.devicePixelRatio || 1);     // crisp on phones
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const sparks = (st, x, y, n, color) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
        st.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.45, color });
      }
    };

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current, N = netRef.current, st = stateRef.current;
      const me = st.slimes[L.mySide], other = st.slimes[L.otherSide];
      const k = keysRef.current;
      const over = st.phase === "over";

      // ── my blob: instant
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      me.vx = over ? 0 : dir * SLIME_SPEED;
      if (!over && k.jump && me.y >= GROUND) me.vy = -JUMP_V;
      stepSlime(me, L.mySide, dt);
      me.color = L.color; me.seen = true;

      // ── other blob: CPU, or where the partner is NOW (their last report pushed forward by the delay)
      if (L.solo) {
        if (!over) cpuThink(other, st.ball, L.otherSide, st.phase); else other.vx = 0;
        stepSlime(other, L.otherSide, dt);
        other.seen = true;
        other.color = L.color === COLORS[1] ? COLORS[0] : COLORS[1];
      } else if (other.rAt) {
        const age = Math.min(0.2, (now - other.rAt) / 1000 + N.lat);
        const tx = clampSlimeX(L.otherSide, other.rx + other.rvx * age);
        let ty = other.ry + other.rvy * age + 0.5 * SLIME_G * age * age;
        if (ty > GROUND) ty = GROUND;
        const a = 1 - Math.exp(-dt * 30);
        const wasAir = other.y < GROUND - 1;
        other.x += (tx - other.x) * a; other.y += (ty - other.y) * a;
        if (wasAir && other.y >= GROUND - 1 && other.rvy > 300) other.squash = 1;
        other.squash = Math.max(0, other.squash - dt * 5);
        other.vx = other.rvx; other.vy = other.rvy;
      }
      for (const s of st.slimes) { s.blinkAt -= dt; if (s.blinkAt < -0.12) s.blinkAt = 2 + Math.random() * 4; }

      // ── phases (host / solo)
      if (L.authority) {
        if (st.phase === "serve") { st.timer -= dt; if (st.timer <= 0) { st.phase = "play"; N.forceGame = true; sfx.beep(true); } }
        else if (st.phase === "point") {
          st.timer -= dt;
          if (st.timer <= 0) { st.rally += 1; st.ball = serveBall(st.server); st.phase = "serve"; st.timer = SERVE_PAUSE; st.trail = []; N.lastQ = 0; N.forceGame = true; }
        }
      }

      // ── ball: everyone simulates; whoever's side it's on is in charge
      const b = st.ball;
      if (st.phase === "play" && !b.frozen) {
        const h = dt / SUBSTEPS;
        for (let i = 0; i < SUBSTEPS; i++) {
          const res = stepBall(b, h, st.slimes);
          if (res.hit != null) {
            const strength = Math.hypot(b.vx, b.vy) / 600;
            if (res.hit === L.mySide || L.solo) { N.myHitAt = res.hit === L.mySide ? now : N.myHitAt; N.forceSend = true; }
            sfx.boing(strength);
            sparks(st, b.x, b.y, 8, "#fff6c8");
            if (strength > 1.3) st.shake = 0.25;
          }
          if (res.ground) {
            const landSide = sideOf(b.x);
            sparks(st, b.x, GROUND, 10, "#f2d49b");
            b.vx = 0; b.vy = 0; b.frozen = true; b.frozeAt = now;
            const scorer = 1 - landSide;
            if (L.solo || L.authority && landSide === L.mySide) scorePoint(scorer);       // landed on my side — I call it
            else if (!L.authority && landSide === L.mySide && N.landSent !== st.rally) {  // guest calls its own side
              N.landSent = st.rally;
              L.net.send("vland", { rl: st.rally, scorer });
            }
            break;
          }
        }
      }
      // host safety net: it landed on the guest's side on my screen but the guest never said so
      if (L.authority && !L.solo && st.phase === "play" && b.frozen && now - b.frozeAt > 1500) scorePoint(1 - sideOf(b.x));
      if (st.phase === "serve") { const s = serveBall(st.server); b.x = s.x; b.y = s.y; b.vx = 0; b.vy = 0; b.frozen = false; }

      // ── effects
      const fade = Math.exp(-dt * 14);
      b.ox *= fade; b.oy *= fade;
      b.rot += (b.vx / BR) * dt;
      if (st.phase === "play" && !b.frozen && Math.hypot(b.vx, b.vy) > 450) st.trail.push({ x: b.x + b.ox, y: b.y + b.oy, life: 0.18 });
      st.trail = st.trail.filter(p => (p.life -= dt) > 0);
      st.fx = st.fx.filter(p => { p.life -= dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
      st.shake = Math.max(0, st.shake - dt);
      if (st.flash) { st.flash.t -= dt * 0.9; if (st.flash.t <= 0) st.flash = null; }
      st.scoreBump = st.scoreBump.map(v => Math.max(0, v - dt * 3));
      if (st.phase !== lastPhase) { if (st.phase === "point" && !L.authority) { /* sound came with vgame */ } lastPhase = st.phase; }

      // ── send
      if (!L.solo) {
        if (now - lastSend > SEND_MS || N.forceSend) {
          L.net.send("slime", { x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), c: L.color }, { volatile: true });
          if (st.phase === "play" && !b.frozen && sideOf(b.x) === L.mySide) {
            N.sendQ += 1;
            L.net.send("ball", { x: +b.x.toFixed(1), y: +b.y.toFixed(1), vx: +b.vx.toFixed(1), vy: +b.vy.toFixed(1), q: N.sendQ, rl: st.rally }, { volatile: !N.forceSend });
          }
          lastSend = now; N.forceSend = false;
        }
        if (L.authority && (now - lastGame > 150 || N.forceGame)) {
          L.net.send("vgame", { ph: st.phase, s: st.score, sv: st.server, w: st.winner, rl: st.rally }, { volatile: !N.forceGame });
          lastGame = now; N.forceGame = false;
        }
        if (now - lastPing > 1500) { L.net.send("vping", { t: now }, { volatile: true }); lastPing = now; }
      }

      // ── DOM updates only when they change
      const sc = st.score.join("-");
      if (st.phase !== uiPhase)   { uiPhase = st.phase;   setPhase(st.phase); }
      if (sc !== uiScore)         { uiScore = sc;         setScore([...st.score]); }
      if (st.winner !== uiWinner) { uiWinner = st.winner; setWinner(st.winner); }

      draw(ctx, canvas, st, L, now / 1000);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [scorePoint]);

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
  const vc = save.vsCpu || { wins: 0, played: 0 };
  const toggleMute = () => { const m = !muted; setMuted(m); setMutedUi(m); };

  return (
    <div style={{ position: "relative", height: "100svh", overflow: "hidden", touchAction: "none", background: "#2a1a3a", userSelect: "none", WebkitUserSelect: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      <button onClick={() => setMenuOpen(true)} style={{ ...chipBtn, position: "absolute", top: 12, left: 12, zIndex: 25 }}>menu</button>
      <button onClick={toggleMute} style={{ ...chipBtn, position: "absolute", top: 12, right: 12, zIndex: 25 }}>{muted ? "sound off" : "sound on"}</button>
      {!solo && pingMs != null && (
        <div style={{ position: "absolute", top: 54, right: 14, zIndex: 25, fontSize: 11, fontWeight: 700, fontFamily: "system-ui, sans-serif", color: pingMs < 120 ? "rgba(40,90,40,0.8)" : pingMs < 250 ? "rgba(140,90,0,0.9)" : "rgba(170,40,40,0.9)" }}>
          delay {pingMs}ms
        </div>
      )}
      {saveLabel && <div style={{ position: "absolute", top: 54, left: 14, zIndex: 25, color: C.bad, fontSize: 12, fontFamily: "system-ui, sans-serif" }}>{saveLabel}</div>}
      {portrait && (
        <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", zIndex: 20, pointerEvents: "none", color: "#4a2a10", fontSize: 14, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>
          turn sideways for a bigger court
        </div>
      )}
      {!isTouch() && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", zIndex: 5, pointerEvents: "none", color: "rgba(80,50,20,0.6)", fontSize: 13, fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>
          ← → move · ↑ / space jump · first to {WIN_SCORE} · esc for menu
        </div>
      )}

      <TouchPad keysRef={keysRef} />

      {phase === "over" && !menuOpen && (
        <Overlay>
          <Trophy won={iWon} />
          <div style={{ fontWeight: 800, fontSize: 26 }}>{iWon ? "You win!" : `${otherName} wins!`}</div>
          <div style={{ color: C.dim, fontSize: 18, fontFamily: "monospace" }}>{score[mySide]} – {score[otherSide]}</div>
          <button onClick={restart} style={menuBtn(true)}>Play again</button>
          {!authority && <div style={{ color: C.faint, fontSize: 12, textAlign: "center" }}>starts a new match for both of you</div>}
          <button onClick={onLeave} style={menuBtn(false)}>Back to room list</button>
        </Overlay>
      )}

      {menuOpen && (
        <Overlay onClose={() => setMenuOpen(false)}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Your blob</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
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
  // on touch screens keep the bottom strip free for the buttons, so they never cover the blobs
  const dpr = canvas.clientWidth ? cw / canvas.clientWidth : 1;
  const reserve = isTouch() ? 118 * dpr : 0;
  const scale = Math.min(cw / W, (ch - reserve) / H);
  let ox = (cw - W * scale) / 2, oy = Math.max(0, (ch - reserve - H * scale) / 2);
  if (st.shake > 0) { ox += (Math.random() - 0.5) * 8 * st.shake * scale; oy += (Math.random() - 0.5) * 8 * st.shake * scale; }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  // letterbox: extend the sky and sand past the court edges so it never looks boxed in
  const lb = ctx.createLinearGradient(0, 0, 0, ch);
  const gFrac = clamp((oy + GROUND * scale) / ch, 0.01, 0.98);       // where the sand starts on screen
  lb.addColorStop(0, "#ff9a62"); lb.addColorStop(gFrac, "#ffd9a0");
  lb.addColorStop(gFrac + 0.001, "#f2d49b"); lb.addColorStop(1, "#e8c588");
  ctx.fillStyle = lb; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#ff9a62"); sky.addColorStop(0.6, "#ffc88a"); sky.addColorStop(1, "#ffe2ad");
  ctx.fillStyle = sky; ctx.fillRect(-400, 0, W + 800, GROUND);
  // sun
  ctx.fillStyle = "rgba(255,240,190,0.9)";
  ctx.beginPath(); ctx.arc(610, 250, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,240,190,0.25)";
  ctx.beginPath(); ctx.arc(610, 250, 85, 0, Math.PI * 2); ctx.fill();
  // drifting clouds
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 4; i++) {
    const cx = ((t * (8 + i * 3) + i * 230) % (W + 300)) - 150, cy = 50 + i * 28;
    ctx.beginPath(); ctx.ellipse(cx, cy, 46, 13, 0, 0, Math.PI * 2); ctx.ellipse(cx + 28, cy - 8, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  // sea
  ctx.fillStyle = "#4fb3d9"; ctx.fillRect(-400, GROUND - 46, W + 800, 46);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 14; i++) { const x = ((i * 67 + t * 14) % (W + 200)) - 100; ctx.fillRect(x, GROUND - 40 + (i % 3) * 12, 26, 2); }
  // sand
  ctx.fillStyle = "#f2d49b"; ctx.fillRect(-400, GROUND, W + 800, H - GROUND + 200);
  ctx.fillStyle = "rgba(160,110,50,0.18)";
  for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = GROUND + 6 + ((i * 37) % 44); ctx.fillRect(x, y, 3, 2); }
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(-400, GROUND, W + 800, 2);

  // score (big, on the sky)
  ctx.textAlign = "center";
  for (const side of [LEFT, RIGHT]) {
    const x = side === LEFT ? NET_X - 90 : NET_X + 90;
    const bump = st.scoreBump[side];
    ctx.save();
    ctx.translate(x, 122); ctx.scale(1 + bump * 0.4, 1 + bump * 0.4);
    ctx.font = "900 56px system-ui, sans-serif";
    ctx.fillStyle = "rgba(120,50,20,0.25)"; ctx.fillText(String(st.score[side]), 3, 4);
    ctx.fillStyle = st.flash && st.flash.side === side ? "#ffffff" : st.slimes[side].color;
    ctx.fillText(String(st.score[side]), 0, 0);
    ctx.restore();
  }
  if (st.score[0] + st.score[1] === 0 && st.phase === "serve") {
    ctx.font = "800 15px system-ui, sans-serif"; ctx.fillStyle = "rgba(120,60,20,0.55)";
    ctx.fillText(`first to ${WIN_SCORE}`, NET_X, 156);
  }

  // net: posts, mesh, tape
  ctx.fillStyle = "#8a5a34"; ctx.fillRect(NET_X - 3, NET_TOP - 8, 6, GROUND - NET_TOP + 8);
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(NET_X - NET_W / 2, NET_TOP, NET_W, GROUND - NET_TOP);
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = NET_TOP + 8; y < GROUND; y += 8) { ctx.moveTo(NET_X - NET_W / 2, y); ctx.lineTo(NET_X + NET_W / 2, y); }
  ctx.moveTo(NET_X - NET_W / 2, NET_TOP); ctx.lineTo(NET_X - NET_W / 2, GROUND); ctx.moveTo(NET_X + NET_W / 2, NET_TOP); ctx.lineTo(NET_X + NET_W / 2, GROUND);
  ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(NET_X - NET_W / 2 - 2, NET_TOP - 4, NET_W + 4, 6);

  const b = st.ball;
  const bx = b.x + b.ox, by = b.y + b.oy;

  // shadows (blobs + ball)
  for (const s of st.slimes) {
    const hgt = clamp((GROUND - s.y) / 200, 0, 1);
    ctx.fillStyle = `rgba(90,50,10,${0.28 - hgt * 0.18})`;
    ctx.beginPath(); ctx.ellipse(s.x, GROUND + 4, SR * (1 - hgt * 0.4), 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  const bh = clamp((GROUND - by) / GROUND, 0, 1);
  ctx.fillStyle = `rgba(90,50,10,${0.32 - bh * 0.22})`;
  ctx.beginPath(); ctx.ellipse(bx, GROUND + 4, BR * (1.4 - bh * 0.7), 4, 0, 0, Math.PI * 2); ctx.fill();

  // blobs
  for (const side of [LEFT, RIGHT]) {
    const s = st.slimes[side];
    const isMe = side === L.mySide;
    ctx.globalAlpha = !s.seen && !isMe ? 0.3 : 1;
    drawSlime(ctx, s, side, bx, by);
    ctx.globalAlpha = 1;
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(110,60,20,0.65)";
    ctx.fillText(isMe ? "you" : (L.solo ? "cpu" : "partner"), s.x, GROUND + 28);
  }

  // ball trail
  for (const p of st.trail) {
    ctx.fillStyle = `rgba(255,255,255,${p.life * 2.2})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, BR * (0.4 + p.life * 3), 0, Math.PI * 2); ctx.fill();
  }
  drawBall(ctx, bx, by, b.rot);

  // sparks
  for (const p of st.fx) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // serve hint: bouncing arrow over the ball
  if (st.phase === "serve") {
    const yy = by - BR - 14 - Math.abs(Math.sin(t * 6)) * 6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(bx - 7, yy - 8); ctx.lineTo(bx + 7, yy - 8); ctx.lineTo(bx, yy); ctx.closePath(); ctx.fill();
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), bl = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${bl})`;
}

function drawSlime(ctx, s, side, ballX, ballY) {
  const sq = s.squash;                                   // landing squish
  const air = s.y < GROUND - 2;
  const sx = 1 + sq * 0.18 - (air ? 0.04 : 0), sy = 1 - sq * 0.2 + (air ? 0.06 : 0);
  ctx.save();
  ctx.translate(s.x, s.y); ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(-SR * 0.35, -SR * 0.6, SR * 0.1, 0, -SR * 0.2, SR * 1.1);
  g.addColorStop(0, shade(s.color, 45)); g.addColorStop(0.6, s.color); g.addColorStop(1, shade(s.color, -45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, SR, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(s.color, -70); ctx.lineWidth = 2; ctx.stroke();
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-SR * 0.38, -SR * 0.62, SR * 0.16, SR * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
  // cheek
  const fx = side === LEFT ? 1 : -1;
  ctx.fillStyle = "rgba(255,120,150,0.35)";
  ctx.beginPath(); ctx.ellipse(fx * SR * 0.62, -SR * 0.22, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // eye faces the net and follows the ball (blinks now and then)
  const ex = s.x + fx * SR * 0.45, ey = s.y - SR * 0.58 * sy;
  if (s.blinkAt < 0) {
    ctx.strokeStyle = "#1a1300"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ex - 8, ey); ctx.lineTo(ex + 8, ey); ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
    const a = Math.atan2(ballY - ey, ballX - ex);
    ctx.fillStyle = "#1a1300";
    ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 4.5, ey + Math.sin(a) * 4.5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 4.5 - 1.5, ey + Math.sin(a) * 4.5 - 1.8, 1.6, 0, Math.PI * 2); ctx.fill();
  }
}

// a proper volleyball: white with curved seams, spins as it flies
function drawBall(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(-BR * 0.4, -BR * 0.4, 1, 0, 0, BR);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e7e2d6");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, BR, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, BR, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = "#3d7be0"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(-BR * 0.9, 0, BR, -0.9, 0.9); ctx.stroke();
  ctx.strokeStyle = "#ffcc4d";
  ctx.beginPath(); ctx.arc(BR * 0.9, 0, BR, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.strokeStyle = "#3d7be0";
  ctx.beginPath(); ctx.arc(0, -BR * 1.2, BR, 0.5, Math.PI - 0.5); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, BR, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── UI bits ───────────────────────────────────────────────────────────────────
function Trophy({ won }) {
  // drawn with shapes, no emoji
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ alignSelf: "center" }} aria-hidden>
      {won ? (
        <>
          <path d="M18 10h28v10c0 10-6 18-14 18s-14-8-14-18z" fill="#ffcc4d" />
          <path d="M18 14h-8c0 8 4 12 10 12M46 14h8c0 8-4 12-10 12" fill="none" stroke="#ffcc4d" strokeWidth="4" />
          <rect x="28" y="38" width="8" height="10" fill="#e0a82e" />
          <rect x="20" y="48" width="24" height="7" rx="2" fill="#c9922a" />
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="20" fill="#fff" stroke="#c9c2b0" strokeWidth="2" />
          <path d="M14 26a20 20 0 0 1 26-10M50 38a20 20 0 0 1-26 10" fill="none" stroke="#3d7be0" strokeWidth="3" />
          <path d="M22 50a20 20 0 0 1 2-32" fill="none" stroke="#ffcc4d" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}

function TouchPad({ keysRef }) {
  const [held, setHeld] = useState({});
  if (!isTouch()) return null;
  const bind = (key) => {
    const release = () => { delete keysRef.current[key]; setHeld(h => ({ ...h, [key]: false })); };
    return {
      onPointerDown: (e) => { e.preventDefault(); unlockSfx(); e.currentTarget.setPointerCapture?.(e.pointerId); keysRef.current[key] = true; setHeld(h => ({ ...h, [key]: true })); },
      onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
      onContextMenu: (e) => e.preventDefault(),
    };
  };
  const pad = (size, key, tint) => ({
    width: size, height: size, borderRadius: "50%", touchAction: "none", userSelect: "none",
    WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: held[key] ? `rgba(${tint},0.55)` : `rgba(${tint},0.25)`,
    border: `2px solid rgba(${tint},0.7)`, transform: held[key] ? "scale(0.94)" : "none",
    color: "#fff", fontWeight: 900, fontFamily: "system-ui, sans-serif",
  });
  const tri = (dir) => (
    <span style={{ width: 0, height: 0, borderTop: "13px solid transparent", borderBottom: "13px solid transparent", [dir === "left" ? "borderRight" : "borderLeft"]: "20px solid #fff" }} />
  );
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20, pointerEvents: "none",
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      padding: "0 18px calc(18px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{ display: "flex", gap: 14, pointerEvents: "auto" }}>
        <div {...bind("left")} style={pad(76, "left", "90,50,20")}>{tri("left")}</div>
        <div {...bind("right")} style={pad(76, "right", "90,50,20")}>{tri("right")}</div>
      </div>
      <div style={{ pointerEvents: "auto" }}>
        <div {...bind("jump")} style={{ ...pad(92, "jump", "230,90,60"), fontSize: 16 }}>JUMP</div>
      </div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 60, background: "rgba(40,20,10,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 320, maxHeight: "calc(100svh - 32px)", overflowY: "auto", boxSizing: "border-box",
        background: "#1a1630", border: `1px solid ${C.border}`, borderRadius: 18, padding: 20,
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14, color: C.text, textAlign: "center",
      }}>
        {children}
      </div>
    </div>
  );
}

const chipBtn = {
  padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 800,
  background: "rgba(60,30,10,0.35)", border: "1px solid rgba(255,255,255,0.35)", color: "#fff",
};
function menuBtn(primary) {
  return {
    padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    ...(primary ? { background: C.accent, color: "#1a1300", border: "none" } : { background: "transparent", color: C.dim, border: `1px solid ${C.border}` }),
  };
}