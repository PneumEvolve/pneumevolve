// src/Pages/Arcade/games/creature-farm/wilds/drawWilds.js
//
// Drawing for the Wilds fights (all in code, no emojis): the forest clearing,
// creatures and goop with their health bars, status effects (rooted, stunned,
// shielded, glowing, burning, taunted), the Goop King's slam warning, and the
// short-lived effects the sim emits (shots, hits, pops, rings, zaps, numbers).

import { drawCreature } from "../drawFarm";
import { drawGoop } from "../stampede/drawStampede";
import { ARENA, BOSS_SLAM } from "./wildsSim";

const TAU = Math.PI * 2;
export const SLOT_COLORS = ["#ffcc4d", "#7ee0ff"];

let bgCache = null;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The clearing (painted once).
function background() {
  if (bgCache || typeof document === "undefined") return bgCache;
  const R = 2, cv = document.createElement("canvas");
  cv.width = ARENA.W * R; cv.height = ARENA.H * R;
  const ctx = cv.getContext("2d"); ctx.scale(R, R);
  const r = rng(424242);
  const g = ctx.createRadialGradient(ARENA.W / 2, ARENA.H / 2, 60, ARENA.W / 2, ARENA.H / 2, ARENA.W * 0.7);
  g.addColorStop(0, "#6fae55"); g.addColorStop(1, "#3f7a3a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, ARENA.W, ARENA.H);
  for (let i = 0; i < 40; i++) {
    const x = r() * ARENA.W, y = r() * ARENA.H, rad = 20 + r() * 60;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gg.addColorStop(0, r() < 0.5 ? "rgba(150,120,70,0.16)" : "rgba(230,255,170,0.08)"); gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  ctx.lineCap = "round"; ctx.lineWidth = 1.1;
  for (const col of ["#4c8a3c", "#5d9e48", "#7cbf62"]) {
    ctx.strokeStyle = col; ctx.beginPath();
    for (let i = 0; i < 700; i++) { const x = r() * ARENA.W, y = r() * ARENA.H, h = 2 + r() * 4; ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - h); }
    ctx.stroke();
  }
  // rocks and flowers
  for (let i = 0; i < 9; i++) {
    const x = 60 + r() * (ARENA.W - 120), y = 80 + r() * (ARENA.H - 120);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 10, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8e8a85"; ctx.beginPath(); ctx.ellipse(x, y, 8, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 3, 1.6, 0, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    const x = r() * ARENA.W, y = r() * ARENA.H, col = ["#fff", "#fff3a0", "#ffb3d1"][i % 3];
    ctx.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.2, 0, TAU); ctx.fill(); }
  }
  // tree line around the edge
  const tree = (x, y, s) => {
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, y + 2, 16 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#4a3426"; ctx.fillRect(x - 3 * s, y - 12 * s, 6 * s, 14 * s);
    for (const [dx, dy, rr, c] of [[-9, -22, 12, "#23552c"], [9, -23, 12, "#23552c"], [0, -32, 14, "#2c6836"], [-5, -29, 6, "#3f8a45"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); ctx.fill(); }
  };
  for (let x = -10; x < ARENA.W + 20; x += 34) tree(x + r() * 10, 30 + r() * 10, 1 + r() * 0.3);
  const sh = ctx.createLinearGradient(0, 0, 0, 80); sh.addColorStop(0, "rgba(10,30,10,0.55)"); sh.addColorStop(1, "rgba(10,30,10,0)");
  ctx.fillStyle = sh; ctx.fillRect(0, 0, ARENA.W, 80);
  for (let x = -10; x < ARENA.W + 20; x += 40) tree(x + r() * 12, ARENA.H + 26 + r() * 6, 1.1);
  const v = ctx.createRadialGradient(ARENA.W / 2, ARENA.H / 2, ARENA.H * 0.4, ARENA.W / 2, ARENA.H / 2, ARENA.W * 0.65);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, ARENA.W, ARENA.H);
  bgCache = cv;
  return cv;
}

// The whole fight, in arena units (the caller sets the transform).
export function drawFight(ctx, view, t, ui) {
  const bg = background();
  if (bg) ctx.drawImage(bg, 0, 0, ARENA.W, ARENA.H); else { ctx.fillStyle = "#5c9e4c"; ctx.fillRect(0, 0, ARENA.W, ARENA.H); }

  // Goop King slam warnings
  for (const e of view.enemies) if (e.kind === "boss" && e.wind > 0 && e.slam) {
    const frac = 1 - e.wind / BOSS_SLAM.wind;
    ctx.fillStyle = `rgba(255,50,80,${0.12 + frac * 0.25})`; ctx.beginPath(); ctx.arc(e.slam.x, e.slam.y, BOSS_SLAM.radius * frac, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,80,100,0.9)"; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(e.slam.x, e.slam.y, BOSS_SLAM.radius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }

  // order lines for my selected creature
  const sel = view.squad.find(u => u.id === ui.selected);
  if (sel && !sel.ko && sel.order && !(ui.drag && ui.drag.uid === sel.id)) {
    const to = sel.order.type === "attack" ? view.enemies.find(e => e.id === sel.order.target) : sel.order;
    if (to) {
      ctx.strokeStyle = sel.order.type === "attack" ? "rgba(255,110,110,0.75)" : "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
      if (sel.order.type === "move") { ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.ellipse(to.x, to.y, 10, 4, 0, 0, TAU); ctx.stroke(); }
    }
  }

  // the steering arrow while you drag one of your creatures
  const dr = ui.drag && view.squad.find(u => u.id === ui.drag.uid && !u.ko);
  if (dr) {
    const tx = ui.drag.x, ty = ui.drag.y, dx = tx - dr.x, dy = ty - dr.y, d = Math.hypot(dx, dy);
    if (d > 14) {
      const ux = dx / d, uy = dy / d, hx = tx - ux * 16, hy = ty - uy * 16;
      ctx.save();
      ctx.lineCap = "round"; ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(dr.x, dr.y - 4); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = SLOT_COLORS[dr.slot] || "#ffd65a"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(dr.x, dr.y - 4); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = SLOT_COLORS[dr.slot] || "#ffd65a";
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx - uy * 11, hy + ux * 11); ctx.lineTo(hx + uy * 11, hy - ux * 11); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tx, ty + 4, 12, 5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  const drawables = [...view.squad.map(u => ({ u, y: u.y })), ...view.enemies.map(u => ({ u, y: u.y }))].sort((a, b) => a.y - b.y);
  for (const { u } of drawables) {
    if (u.side === 0) drawUnit(ctx, u, t, ui);
    else drawFoe(ctx, u, t, ui);
  }

  // effects
  for (const f of view.fx) drawFx(ctx, f, t);
}

function drawUnit(ctx, u, t, ui) {
  const col = SLOT_COLORS[u.slot] || "#fff";
  const mine = ui.canControl(u);
  // ring
  ctx.strokeStyle = col; ctx.globalAlpha = u.ko ? 0.3 : mine ? 0.95 : 0.55; ctx.lineWidth = u.id === ui.selected ? 3 : 2;
  if (u.id === ui.selected) { ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 12; }
  ctx.beginPath(); ctx.ellipse(u.x, u.y, 22, 8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  if (u.st?.glow > 0) { const g = ctx.createRadialGradient(u.x, u.y - 16, 4, u.x, u.y - 16, 34); g.addColorStop(0, "rgba(255,230,110,0.45)"); g.addColorStop(1, "rgba(255,230,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, u.y - 16, 34, 0, TAU); ctx.fill(); }
  if (u.ko) {
    ctx.save(); ctx.globalAlpha = 0.5;
    drawCreature(ctx, u.x, u.y, u.species, { hue: u.hue, size: u.size, rare: u.rare, personality: "sleepy" }, { face: u.face, t: 0, scale: 1.05, sleepy: true });
    ctx.restore();
    ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#e8e0ff"; ctx.fillText("KO", u.x, u.y - 40);
    return;
  }
  drawCreature(ctx, u.x, u.y, u.species, { hue: u.hue, size: u.size, rare: u.rare, personality: u.personality }, { face: u.face, t, moving: true, scale: 1.05 });
  if (u.st?.shield > 0) { ctx.strokeStyle = "rgba(220,200,160,0.9)"; ctx.fillStyle = "rgba(230,215,180,0.18)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u.x, u.y - 18, 28, 0, TAU); ctx.fill(); ctx.stroke(); }
  bar(ctx, u.x, u.y - 46, u.hp / u.maxHp, u.hp / u.maxHp < 0.3 ? "#ff6b6b" : "#7ee081");
  if ((u.abs || []).some(a => a.t <= 0) && mine) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(u.x + 21, u.y - 44, 3.2 + Math.sin(t * 6) * 0.8, 0, TAU); ctx.fill(); }
  ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText(u.name, u.x, u.y + 18);
  statuses(ctx, u, t);
}

function drawFoe(ctx, e, t) {
  if (e.look === "bulb") drawBulb(ctx, e, t);
  else drawGoop(ctx, { kind: e.look, x: e.x, y: e.y, id: Number(String(e.id).slice(1)) || 1, flash: e.flash > 0, hpFrac: 1 }, t);
  const s = e.kind === "boss" ? 3.2 : e.kind === "brute" ? 1.5 : e.kind === "swarm" ? 0.7 : 1;
  if (e.kind !== "boss") bar(ctx, e.x, e.y - 30 * s - 8, e.hp / e.maxHp, "#ff5d73", 26 * Math.max(0.8, s * 0.8));
  statuses(ctx, e, t);
}

function drawBulb(ctx, e, t) {
  const wob = Math.sin(t * 3 + e.x) * 1.5;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 14, 4.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? "#fff" : "#3d7a3a"; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-15, -18, 0, -20); ctx.quadraticCurveTo(15, -18, 13, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2c5c2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(4, -28, 2, -34 + wob); ctx.stroke();
  const g = ctx.createRadialGradient(2, -36 + wob, 1, 2, -36 + wob, 12); g.addColorStop(0, "rgba(170,255,140,0.9)"); g.addColorStop(1, "rgba(170,255,140,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, -36 + wob, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = "#c8ff9a"; ctx.beginPath(); ctx.arc(2, -36 + wob, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ffe14d"; ctx.beginPath(); ctx.ellipse(-4, -10, 2.4, 2, 0, 0, TAU); ctx.ellipse(4, -10, 2.4, 2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function statuses(ctx, u, t) {
  const s = u.st || {};
  const big = u.kind === "boss" ? 3 : 1;
  if (s.root > 0) { ctx.strokeStyle = "#4f9a3a"; ctx.lineWidth = 2.5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(u.x + k * 9, u.y + 2); ctx.quadraticCurveTo(u.x + k * 14, u.y - 10, u.x + k * 6, u.y - 16); ctx.stroke(); } }
  if (s.stun > 0) for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; star(ctx, u.x + Math.cos(a) * 12 * big, u.y - 38 * big + Math.sin(a) * 4, 3); }
  if (s.burn > 0) for (let k = 0; k < 3; k++) { const fx = u.x - 8 + k * 8, fy = u.y - 10 - ((t * 30 + k * 7) % 14); ctx.fillStyle = k % 2 ? "#ffb02e" : "#ff5a1f"; ctx.beginPath(); ctx.ellipse(fx, fy, 2.5, 4, 0, 0, TAU); ctx.fill(); }
  if (s.taunt > 0) { ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#ff6b6b"; ctx.fillText("!", u.x + 14 * big, u.y - 30 * big); }
}
function star(ctx, x, y, r) {
  ctx.fillStyle = "#ffe36b"; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function bar(ctx, x, y, frac, col, w = 34) {
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 5, 2.5); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2 + 0.5, y + 0.5, Math.max(0, (w - 1) * Math.min(1, frac)), 4, 2); ctx.fill();
}

function drawFx(ctx, f) {
  const k = f.t;
  if (f.k === "shot") {
    const a = 1 - k / 0.5;
    ctx.strokeStyle = f.col || "#fff"; ctx.globalAlpha = Math.max(0, a); ctx.lineWidth = 3; ctx.lineCap = "round";
    const p = Math.min(1, k / 0.15);
    ctx.beginPath(); ctx.moveTo(f.x + (f.x2 - f.x) * Math.max(0, p - 0.4), f.y + (f.y2 - f.y) * Math.max(0, p - 0.4)); ctx.lineTo(f.x + (f.x2 - f.x) * p, f.y + (f.y2 - f.y) * p); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (f.k === "hit") {
    ctx.globalAlpha = Math.max(0, 1 - k / 0.3); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, r1 = 4 + k * 30, r2 = 9 + k * 40; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.lineTo(f.x + Math.cos(a) * r2, f.y + Math.sin(a) * r2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (f.k === "pop") {
    ctx.globalAlpha = Math.max(0, 1 - k / 0.5); ctx.fillStyle = "#b07ad0";
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = f.r * (0.4 + k * 2); ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r, f.y - 10 + Math.sin(a) * r * 0.6, 4 * (1 - k), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (f.k === "ring" || f.k === "boom") {
    const a = Math.max(0, 1 - k / 0.5);
    ctx.globalAlpha = a; ctx.strokeStyle = f.col; ctx.lineWidth = f.k === "boom" ? 6 : 3;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + k * 0.8), f.r * (0.6 + k * 0.8) * 0.55, 0, 0, TAU); ctx.stroke();
    if (f.k === "boom") { ctx.globalAlpha = a * 0.35; ctx.fillStyle = f.col; ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (f.k === "zap") {
    ctx.globalAlpha = Math.max(0, 1 - k / 0.4); ctx.strokeStyle = "#e3d0ff"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(f.x, f.y);
    for (let i = 1; i < 6; i++) { const p = i / 6; ctx.lineTo(f.x + (f.x2 - f.x) * p + Math.sin(i * 7 + f.x) * 8, f.y + (f.y2 - f.y) * p + Math.cos(i * 5 + f.y) * 8); }
    ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (f.k === "num" || f.k === "heal") {
    ctx.globalAlpha = Math.max(0, 1 - k / 0.9); ctx.font = `bold ${f.k === "heal" ? 13 : 12}px system-ui, sans-serif`; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillText(f.k === "heal" ? `+${f.n}` : String(f.n), f.x + 1, f.y - k * 26 + 1);
    ctx.fillStyle = f.k === "heal" ? "#8dffa0" : f.col || "#fff"; ctx.fillText(f.k === "heal" ? `+${f.n}` : String(f.n), f.x, f.y - k * 26);
    ctx.globalAlpha = 1;
  } else if (f.k === "label") {
    ctx.globalAlpha = Math.max(0, 1 - k / 1.2); ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    const w = ctx.measureText(f.text).width + 12;
    ctx.fillStyle = "rgba(20,14,34,0.8)"; ctx.beginPath(); ctx.roundRect(f.x - w / 2, f.y - 14 - k * 10, w, 18, 9); ctx.fill();
    ctx.fillStyle = "#ffe08a"; ctx.fillText(f.text, f.x, f.y - k * 10);
    ctx.globalAlpha = 1;
  }
}

// Boss health bar across the top of the arena.
export function drawBossBar(ctx, boss) {
  if (!boss) return;
  const w = 420, x = (ARENA.W - w) / 2, y = 14;
  ctx.fillStyle = "rgba(15,10,30,0.8)"; ctx.beginPath(); ctx.roundRect(x - 6, y - 4, w + 12, 26, 10); ctx.fill();
  ctx.fillStyle = "#3a1a52"; ctx.beginPath(); ctx.roundRect(x, y + 8, w, 9, 4); ctx.fill();
  ctx.fillStyle = "#c04ae0"; ctx.beginPath(); ctx.roundRect(x, y + 8, w * Math.max(0, boss.hp / boss.maxHp), 9, 4); ctx.fill();
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#ffd65a"; ctx.fillText("THE GOOP KING", ARENA.W / 2, y + 5);
}