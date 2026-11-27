// Drawing for Hill Climb Rally (canvas, everything in code).
import { drawCreature } from "../drawFarm";
import { MAPS, groundY, slopeAt, wheelCenters, WHEEL_R, cartParts, npcX } from "./hillSim";
import { mulberry } from "../minis/rng";

const TAU = Math.PI * 2;

// Camera keeps the cart a bit left of centre, looking ahead as it speeds up.
export function makeCamera() { return { x: 0, y: 0, z: 1, init: false }; }
export function moveCamera(cam, c, W, H, dt) {
  cam.z = Math.max(0.55, Math.min(1.5, H / 430));
  const tx = c.x + Math.max(-60, Math.min(160, c.vx * 0.35)) - (W * 0.36) / cam.z;
  const ty = c.y - (H * 0.42) / cam.z;
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
  const k = 1 - Math.exp(-dt * 6);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

// Scenery bits along the track (trees, bushes, flowers), the same every time.
const decorCache = {};
function decorFor(T) {
  if (decorCache[T.map]) return decorCache[T.map];
  const r = mulberry(99 + T.map), out = [];
  for (let x = -300; x < T.len + 900; x += 60 + r() * 140) {
    const roll = r();
    out.push({ x, kind: roll < 0.22 ? "tree" : roll < 0.5 ? "bush" : roll < 0.8 ? "flower" : "rock", s: 0.7 + r() * 0.6, hue: Math.floor(r() * 360) });
  }
  return (decorCache[T.map] = out);
}

export function drawHill(cv, view) {
  if (!cv) return;
  const { T, cam, me, meStats, myC, others, npcs, coins, t, phase, color } = view;
  const M = MAPS[T.map];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const z = cam.z;
  const SX = (x) => (x - cam.x) * z, SY = (y) => H - (y - cam.y) * z;
  const x0 = cam.x - 40, x1 = cam.x + W / z + 40;

  // sky, sun, clouds
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, M.sky[0]); g.addColorStop(1, M.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,240,170,0.9)"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.16, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 520 - cam.x * 0.15) % (W + 400) + W + 400) % (W + 400) - 200, cy = 40 + (i % 3) * 38;
    for (const [dx, dy, rr] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [24, 8, 18]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, rr, 0, TAU); ctx.fill(); }
  }
  // far hills (parallax)
  for (const [k, col, amp, base] of [[0.2, "rgba(120,180,120,0.55)", 70, 0.55], [0.4, "rgba(95,160,90,0.7)", 55, 0.66]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) { const wx = x + cam.x * k; ctx.lineTo(x, H * base - amp * (Math.sin(wx * 0.006) * 0.6 + Math.sin(wx * 0.0021 + 2) * 0.4)); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  // ground: dirt, then a thick grass edge
  ctx.beginPath(); ctx.moveTo(SX(x0), H + 10);
  for (let x = x0; x <= x1; x += 10) ctx.lineTo(SX(x), SY(groundY(T, x)));
  ctx.lineTo(SX(x1), H + 10); ctx.closePath();
  ctx.fillStyle = M.dirt; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) { const gy = groundY(T, x); ctx.beginPath(); ctx.ellipse(SX(x + 20), SY(gy - 40), 14 * z, 6 * z, 0, 0, TAU); ctx.ellipse(SX(x + 60), SY(gy - 80), 10 * z, 5 * z, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.lineJoin = "round";
  ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const X = SX(x), Y = SY(groundY(T, x)); if (x === x0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
  ctx.strokeStyle = M.grass; ctx.lineWidth = 12 * z; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 3 * z; ctx.stroke();

  // scenery behind the track
  for (const d of decorFor(T)) {
    if (d.x < x0 - 60 || d.x > x1 + 60) continue;
    const X = SX(d.x), Y = SY(groundY(T, d.x) - 4), s = d.s * z;
    if (d.kind === "tree") {
      ctx.fillStyle = "#7a5230"; ctx.fillRect(X - 4 * s, Y - 40 * s, 8 * s, 40 * s);
      ctx.fillStyle = "#3f8f3a"; for (const [dx, dy, rr] of [[0, -58, 22], [-14, -46, 16], [14, -46, 16]]) { ctx.beginPath(); ctx.arc(X + dx * s, Y + dy * s, rr * s, 0, TAU); ctx.fill(); }
    } else if (d.kind === "bush") { ctx.fillStyle = "#4f9f45"; for (const [dx, rr] of [[-8, 10], [6, 12], [16, 8]]) { ctx.beginPath(); ctx.arc(X + dx * s, Y - rr * s * 0.7, rr * s, 0, TAU); ctx.fill(); } }
    else if (d.kind === "flower") { ctx.strokeStyle = "#3f8f3a"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 12 * s); ctx.stroke(); ctx.fillStyle = `hsl(${d.hue},80%,70%)`; ctx.beginPath(); ctx.arc(X, Y - 13 * s, 4 * s, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = "#9aa3ad"; ctx.beginPath(); ctx.ellipse(X, Y - 4 * s, 12 * s, 7 * s, 0, 0, TAU); ctx.fill(); }
  }

  // start, checkpoints, finish
  const pole = (x, h, col) => { const X = SX(x), Y = SY(groundY(T, x)); ctx.fillStyle = col; ctx.fillRect(X - 3 * z, Y - h * z, 6 * z, h * z); return { X, Y }; };
  if (x0 < 40 && x1 > -40) { const { X, Y } = pole(0, 90, "#fff"); ctx.fillStyle = "#e04848"; ctx.fillRect(X, Y - 90 * z, 40 * z, 22 * z); ctx.fillStyle = "#fff"; ctx.font = `900 ${12 * z}px system-ui`; ctx.textAlign = "left"; ctx.fillText("GO!", X + 6 * z, Y - 74 * z); }
  for (let cx = 3000; cx < T.len; cx += 3000) if (cx > x0 && cx < x1) { const { X, Y } = pole(cx, 70, "#e0e0e0"); ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.moveTo(X + 3 * z, Y - 70 * z); ctx.lineTo(X + 30 * z, Y - 62 * z + Math.sin(t * 4) * 2 * z); ctx.lineTo(X + 3 * z, Y - 54 * z); ctx.closePath(); ctx.fill(); }
  if (T.len > x0 - 80 && T.len < x1 + 80) {
    const a = pole(T.len - 50, 150, "#333"), b = pole(T.len + 50, 150, "#333");
    const top = Math.min(a.Y, b.Y) - 150 * z;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? "#222" : "#fff"; ctx.fillRect(a.X + i * (b.X - a.X) / 10, top + j * 12 * z, (b.X - a.X) / 10 + 1, 12 * z); }
    ctx.fillStyle = "#ffd65a"; ctx.font = `900 ${16 * z}px system-ui`; ctx.textAlign = "center"; ctx.fillText("FINISH", (a.X + b.X) / 2, top - 8 * z);
  }

  // coins
  for (const k of coins) {
    if (k.x < x0 || k.x > x1 || me.got[k.id]) continue;
    const X = SX(k.x), Y = SY(k.y), sq = Math.abs(Math.cos(t * 4 + k.id));
    ctx.fillStyle = "#e0a82e"; ctx.beginPath(); ctx.ellipse(X, Y, 9 * z * Math.max(0.2, sq), 9 * z, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.ellipse(X, Y, 6 * z * Math.max(0.15, sq), 6 * z, 0, 0, TAU); ctx.fill();
  }

  // ghosts (neighbours, partner), then me in front
  for (const n of npcs) {
    const x = phase === "race" ? Math.min(T.len + 120, npcX(n, Math.max(0, t))) : 0;
    if (x < x0 - 80 || x > x1 + 80) continue;
    drawCart(ctx, { x, y: groundY(T, x) + 30, a: Math.atan(slopeAt(T, x)), spin: x / WHEEL_R, comp: [4, 4] }, n.species, { hue: n.hue, size: 1 }, "#c9a0ff", SX, SY, z, t, 0.5, n.name);
  }
  for (const o of others) {
    if (!o.c || o.x < x0 - 80 || o.x > x1 + 80) continue;
    drawCart(ctx, { x: o.x, y: o.y, a: o.a, spin: o.x / WHEEL_R, comp: [3, 3] }, o.c.species, o.c.traits, o.color, SX, SY, z, t, o.crashed ? 0.35 : 0.65, o.c.name);
  }
  if (myC) {
    const crashed = me.crashed > 0;
    const shown = crashed ? { ...me, a: me.a + (1.3 - me.crashed) * 5 } : me;
    if (!crashed || Math.floor(t * 10) % 2 === 0 || me.crashed > 0.6) drawCart(ctx, shown, myC.species, myC.traits, color, SX, SY, z, t, 1);
    if (crashed) {
      ctx.fillStyle = "#ffe14d";
      for (let i = 0; i < 5; i++) { const a = t * 6 + i * 1.26; ctx.beginPath(); ctx.arc(SX(me.x) + Math.cos(a) * 30 * z, SY(me.y + 40) + Math.sin(a) * 10 * z, 4 * z, 0, TAU); ctx.fill(); }
    }
    // dust
    if (me.onGround && Math.abs(me.vx) > 60 && !crashed) {
      ctx.fillStyle = "rgba(200,170,120,0.45)";
      for (const w of wheelCenters(me)) for (let i = 0; i < 3; i++) { const k = (t * 7 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(SX(w.x - 10 - k * 30), SY(w.y - WHEEL_R + k * 12), (3 + k * 5) * z, 0, TAU); ctx.fill(); }
    }
  }
}

// A wooden cart with your creature in it.
function drawCart(ctx, c, species, traits, color, SX, SY, z, t, alpha = 1, label) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const wc = wheelCenters(c);
  // suspension struts
  ctx.strokeStyle = "#555"; ctx.lineWidth = 3 * z;
  cartParts.WHEELS.forEach((p, i) => { const ax = c.x + p.x * Math.cos(c.a) - p.y * Math.sin(c.a), ay = c.y + p.x * Math.sin(c.a) + p.y * Math.cos(c.a); ctx.beginPath(); ctx.moveTo(SX(ax), SY(ay)); ctx.lineTo(SX(wc[i].x), SY(wc[i].y)); ctx.stroke(); });
  // body (in body frame: x forward, y up → screen y = -y)
  ctx.save();
  ctx.translate(SX(c.x), SY(c.y)); ctx.rotate(-c.a); ctx.scale(z, z);
  // the driver sits in the tub
  ctx.save(); ctx.translate(-2, -10); drawCreature(ctx, 0, 0, species, traits, { face: 1, t, moving: false, scale: 0.62 }); ctx.restore();
  ctx.fillStyle = "#9b6a40"; ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(38, -14); ctx.lineTo(32, 6); ctx.lineTo(-34, 6); ctx.closePath(); ctx.fill();   // tub
  ctx.fillStyle = color; ctx.fillRect(-36, -9, 72, 5);                                                                                                         // stripe in your colour
  ctx.fillStyle = "#7a4f2c"; ctx.fillRect(-38, -16, 76, 4);
  ctx.fillStyle = "#6b4426"; ctx.beginPath(); ctx.moveTo(30, -14); ctx.lineTo(44, -18); ctx.lineTo(42, -10); ctx.closePath(); ctx.fill();                         // front bumper
  ctx.fillStyle = "#c0c6ce"; ctx.fillRect(-42, -12, 6, 8);                                                                                                     // exhaust
  ctx.restore();
  // wheels
  for (const w of wc) {
    const X = SX(w.x), Y = SY(w.y), R = WHEEL_R * z;
    ctx.fillStyle = "#2b2b33"; ctx.beginPath(); ctx.arc(X, Y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = "#d8b45e"; ctx.beginPath(); ctx.arc(X, Y, R * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8a6a2a"; ctx.lineWidth = 2 * z;
    for (let i = 0; i < 4; i++) { const a = -c.spin + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * R * 0.55, Y + Math.sin(a) * R * 0.55); ctx.stroke(); }
  }
  if (label) { ctx.globalAlpha = Math.min(1, alpha + 0.3); ctx.font = `800 ${11 * z}px system-ui`; ctx.textAlign = "center"; ctx.fillStyle = color; ctx.fillText(label, SX(c.x), SY(c.y + 70)); }
  ctx.restore();
}

// Little race map strip across the top: everyone's place on the track.
export function drawProgress(cv, T, items) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.roundRect(8, H / 2 - 4, W - 16, 8, 4); ctx.fill();
  for (let cx = 3000; cx < T.len; cx += 3000) { ctx.fillStyle = "#ffd65a"; ctx.fillRect(8 + (W - 16) * cx / T.len - 1, H / 2 - 7, 2, 14); }
  ctx.fillStyle = "#fff"; ctx.fillRect(W - 10, H / 2 - 8, 3, 16);
  for (const it of items) { ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(8 + (W - 16) * Math.min(1, Math.max(0, it.x / T.len)), H / 2, it.big ? 7 : 5, 0, TAU); ctx.fill(); if (it.big) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); } }
}