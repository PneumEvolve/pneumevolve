// src/Pages/Arcade/games/creature-farm/drawScenery.js
//
// The farm's still background — grass, flowers, paths, the forest edge, the
// farmhouse, the pen fence and little decorations — painted ONCE into an
// offscreen canvas and then just copied every frame. That lets it be detailed
// without slowing the game down. It's repainted only when the farm gets wider
// (buying land to the east).
//
// Everything here is drawn in code (no image files, no emojis). Randomness
// uses a fixed seed, so the farm looks the same every time and on both devices.

import { MAP, WORLD_W, WORLD_H } from "./farmWorld";

const TAU = Math.PI * 2;
const RES = 2;                       // offscreen pixels per world unit (crisp on most screens)
let cache = null;                    // { key, canvas }

export function sceneryCanvas(WW) {
  if (typeof document === "undefined") return null;
  if (cache && cache.key === WW) return cache.canvas;
  const res = Math.max(1, Math.min(RES, 12000 / WW));       // keep huge farms within canvas limits
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(WW * res); cv.height = Math.ceil(WORLD_H * res);
  const ctx = cv.getContext("2d");
  ctx.scale(res, res);
  paintScenery(ctx, WW);
  cache = { key: WW, canvas: cv };
  return cv;
}

function rngFrom(seed) {             // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Places nothing decorative should be drawn on top of.
function blocked(WW) {
  const f = MAP.field, p = MAP.pen, h = MAP.house;
  const list = [
    [h.x - 20, h.y - 20, h.w + 40, h.h + 44],
    [MAP.store.x - 40, MAP.store.y - 34, 80, 80],
    [f.x - 12, f.y - 12, f.cols * (f.size + f.gap) + 14, f.rows * (f.size + f.gap) + 14],
    [p.x - 14, p.y - 14, p.w + 28, p.h + 28],
    [110, 245, 470, 42], [MAP.pen.x + 76, 245, 40, MAP.pen.y - 240], [128, 215, 34, 60],
    [MAP.sign.x - 34, MAP.sign.y - 70, 68, 92],
    [MAP.trough.x - 50, MAP.trough.y - 26, 100, 60],
    [MAP.stall.x - 44, MAP.stall.y - 40, 88, 76],
    [MAP.east.x - 16, f.y - 16, Math.max(0, WW - MAP.east.x), MAP.east.rows * (f.size + f.gap) + 24],
  ];
  for (const w of Object.values(MAP.workshops)) list.push([w.x - 48, w.y - 50, 96, 104]);
  return list;
}
const inside = (x, y, r) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];
const free = (x, y, bl) => !bl.some(r => inside(x, y, r));

function paintScenery(ctx, WW) {
  const rnd = rngFrom(20261126);
  const bl = blocked(WW);
  const top = MAP.wildEdge;

  // ── grass: gentle gradient, soft light/dark patches, thousands of blades
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  g.addColorStop(0, "#67b456"); g.addColorStop(1, "#58a24a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, WW, WORLD_H);
  for (let i = 0; i < 70 * (WW / WORLD_W); i++) {
    const x = rnd() * WW, y = top + rnd() * (WORLD_H - top), r = 30 + rnd() * 90;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() < 0.5;
    gr.addColorStop(0, light ? "rgba(230,255,170,0.10)" : "rgba(20,70,20,0.09)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  const bladeCols = ["#4c9140", "#5aa64c", "#72c060", "#83cf6d"];
  ctx.lineCap = "round"; ctx.lineWidth = 1.1;
  for (const col of bladeCols) {
    ctx.strokeStyle = col; ctx.beginPath();
    for (let i = 0; i < 620 * (WW / WORLD_W); i++) {
      const x = rnd() * WW, y = top + 4 + rnd() * (WORLD_H - top - 4), h = 2.5 + rnd() * 3.5, lean = (rnd() - 0.5) * 2.5;
      ctx.moveTo(x, y); ctx.lineTo(x + lean, y - h);
      if (rnd() < 0.5) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5 + lean * 0.6 + 1, y - h * 0.8); }
    }
    ctx.stroke();
  }
  // darker tufts
  for (let i = 0; i < 160 * (WW / WORLD_W); i++) {
    const x = rnd() * WW, y = top + 10 + rnd() * (WORLD_H - top - 10);
    if (!free(x, y, bl)) continue;
    tuft(ctx, x, y, 0.8 + rnd() * 0.6);
  }
  // little flower clusters
  const petal = ["#ffffff", "#fff3a0", "#ffb3d1", "#d4b8ff", "#ffffff"];
  for (let i = 0; i < 55 * (WW / WORLD_W); i++) {
    const cx = rnd() * WW, cy = top + 20 + rnd() * (WORLD_H - top - 30);
    if (!free(cx, cy, bl)) continue;
    const col = petal[Math.floor(rnd() * petal.length)];
    for (let k = 0, n = 3 + Math.floor(rnd() * 4); k < n; k++) flower(ctx, cx + (rnd() - 0.5) * 22, cy + (rnd() - 0.5) * 12, 1.4 + rnd() * 1, col);
  }

  // ── paths (dirt with a darker rim, pebbles and grassy edges)
  const paths = [
    [118, 255, 446, 22],                                  // house → field
    [133, 222, 24, 44],                                   // front door
    [MAP.pen.x + 84, 262, 22, MAP.pen.y - 256],            // → pen gate
  ];
  ctx.fillStyle = "#9c7b4e";
  for (const [x, y, w, h] of paths) { ctx.beginPath(); ctx.roundRect(x - 3, y - 2, w + 6, h + 5, 13); ctx.fill(); }
  ctx.fillStyle = "#c6a676";
  for (const [x, y, w, h] of paths) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 11); ctx.fill(); }
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (const [x, y, w, h] of paths) { ctx.beginPath(); ctx.roundRect(x + 3, y + 2, w - 6, Math.min(5, h - 4), 4); ctx.fill(); }
  for (const [x, y, w, h] of paths) {
    for (let k = 0; k < (w * h) / 90; k++) {
      const px = x + 4 + rnd() * (w - 8), py = y + 3 + rnd() * (h - 6);
      ctx.fillStyle = rnd() < 0.5 ? "rgba(110,80,45,0.35)" : "rgba(240,225,190,0.45)";
      ctx.beginPath(); ctx.ellipse(px, py, 1 + rnd() * 1.6, 0.8 + rnd() * 1, 0, 0, TAU); ctx.fill();
    }
  }

  // ── decorations
  const decor = [
    ["bush", 26, 262], ["bush", 248, 150], ["bush", 36, 340], ["rocks", 302, 392], ["rocks", 548, 388],
["log", 296, 205], ["mushrooms", 255, 400], ["rocks", 950, 380], ["bush", 520, 210],
    ["mushrooms", 20, 590], ["bush", 300, 588],
  ];
  for (const [kind, x, y] of decor) {
    if (!free(x, y, bl) && kind !== "bush") continue;
    if (kind === "bush") bush(ctx, x, y, rnd);
    else if (kind === "rocks") rocks(ctx, x, y);
    else if (kind === "log") log(ctx, x, y);
    else if (kind === "mushrooms") mushrooms(ctx, x, y);
  }
  // new land to the east gets a few bushes and rocks along its south edge
  for (let x = MAP.east.x + 20; x < WW - 40; x += 90 + rnd() * 60) {
    const y = 545 + rnd() * 40;
    if (rnd() < 0.6) bush(ctx, x, y, rnd); else rocks(ctx, x, y);
  }

  // ── the pen (worn, strawy ground + a proper fence)
  pen(ctx, rnd);

  // ── the farmhouse
  house(ctx);

  // ── forest edge along the top, and along the east edge of the land you own
  forestTop(ctx, WW, rnd);
  if (WW > WORLD_W) forestEast(ctx, WW, rnd);
}

// ── Pieces ────────────────────────────────────────────────────────────────────
function tuft(ctx, x, y, s) {
  ctx.strokeStyle = "#3f8235"; ctx.lineWidth = 1.3 * s; ctx.lineCap = "round";
  ctx.beginPath();
  for (const [dx, h] of [[-3, 6], [-1, 8], [1, 7], [3, 5]]) { ctx.moveTo(x + dx * s, y); ctx.lineTo(x + dx * 1.6 * s, y - h * s); }
  ctx.stroke();
}
function flower(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, TAU); ctx.fill(); }
  ctx.fillStyle = col === "#fff3a0" ? "#e8a020" : "#ffd23f"; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
}
function bush(ctx, x, y, rnd) {
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x, y + 2, 20, 6, 0, 0, TAU); ctx.fill();
  const blobs = [[-11, -7, 10], [10, -7, 10], [0, -13, 12], [-3, -4, 11], [6, -3, 10]];
  ctx.fillStyle = "#2f7a37"; for (const [dx, dy, r] of blobs) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r + 1.5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#3f9445"; for (const [dx, dy, r] of blobs) { ctx.beginPath(); ctx.arc(x + dx, y + dy - 1, r, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#5cb35a"; for (const [dx, dy, r] of blobs.slice(0, 3)) { ctx.beginPath(); ctx.arc(x + dx - 3, y + dy - 4, r * 0.45, 0, TAU); ctx.fill(); }
  if (rnd() < 0.6) { ctx.fillStyle = rnd() < 0.5 ? "#e8405a" : "#ffffff"; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x - 12 + rnd() * 24, y - 18 + rnd() * 14, 1.6, 0, TAU); ctx.fill(); } }
}
function rocks(ctx, x, y) {
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 16, 5, 0, 0, TAU); ctx.fill();
  for (const [dx, dy, rx, ry, c] of [[-6, -3, 9, 7, "#8e8a85"], [7, -1, 6, 5, "#a19c96"], [1, 1, 5, 3.5, "#b3aea7"]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(x + dx - rx * 0.3, y + dy - ry * 0.4, rx * 0.4, ry * 0.3, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "#6fa84a"; ctx.beginPath(); ctx.ellipse(x - 9, y - 7, 4, 2, -0.3, 0, TAU); ctx.fill();
}
function log(ctx, x, y) {
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x, y + 4, 22, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#7a5233"; ctx.beginPath(); ctx.roundRect(x - 20, y - 8, 36, 12, 6); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.lineTo(x + 8, y - 4); ctx.moveTo(x - 10, y); ctx.lineTo(x + 12, y); ctx.stroke();
  ctx.fillStyle = "#c79a68"; ctx.beginPath(); ctx.ellipse(x + 16, y - 2, 4, 6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8f6a42"; ctx.beginPath(); ctx.ellipse(x + 16, y - 2, 2, 3.5, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#5aa64c"; ctx.beginPath(); ctx.ellipse(x - 8, y - 8, 5, 2, 0, 0, TAU); ctx.fill();
}
function mushrooms(ctx, x, y) {
  for (const [dx, s] of [[0, 1], [7, 0.7], [-6, 0.6]]) {
    ctx.fillStyle = "#f3e6cf"; ctx.fillRect(x + dx - 1.5 * s, y - 6 * s, 3 * s, 6 * s);
    ctx.fillStyle = "#d9443f"; ctx.beginPath(); ctx.ellipse(x + dx, y - 6 * s, 5 * s, 4 * s, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + dx - 2 * s, y - 8 * s, 0.9 * s, 0, TAU); ctx.arc(x + dx + 1.5 * s, y - 7 * s, 0.8 * s, 0, TAU); ctx.fill();
  }
}

function treeShape(ctx, x, y, s, dark) {
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x, y + 1, 14 * s, 4 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#5a3d2a"; ctx.fillRect(x - 3.5 * s, y - 12 * s, 7 * s, 13 * s);
  ctx.fillStyle = "#47301f"; ctx.fillRect(x + 0.5 * s, y - 12 * s, 3 * s, 13 * s);
  const c = dark ? ["#24572d", "#2c6836", "#3a7d42"] : ["#2b6634", "#357a3e", "#4a944c"];
  ctx.fillStyle = c[0];
  for (const [dx, dy, r] of [[-9, -20, 11], [9, -21, 11], [0, -30, 13]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }
  ctx.fillStyle = c[1];
  for (const [dx, dy, r] of [[-7, -23, 9], [8, -24, 9], [0, -32, 10]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }
  ctx.fillStyle = c[2];
  for (const [dx, dy, r] of [[-5, -27, 5], [-1, -35, 5]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }
}
function forestTop(ctx, WW, rnd) {
  const edge = MAP.wildEdge - 10;
  const g = ctx.createLinearGradient(0, 0, 0, edge);
  g.addColorStop(0, "#173a20"); g.addColorStop(1, "#22502b");
  ctx.fillStyle = g; ctx.fillRect(0, 0, WW, edge);
  // back canopy
  ctx.fillStyle = "#1f4a27";
  for (let x = -10; x < WW + 20; x += 18) { ctx.beginPath(); ctx.arc(x, 10 + rnd() * 10, 16 + rnd() * 8, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#28592f";
  for (let x = 0; x < WW + 20; x += 22) { ctx.beginPath(); ctx.arc(x, 30 + rnd() * 8, 14 + rnd() * 6, 0, TAU); ctx.fill(); }
  // shadow cast on the grass
  const sh = ctx.createLinearGradient(0, edge, 0, edge + 26);
  sh.addColorStop(0, "rgba(10,40,10,0.28)"); sh.addColorStop(1, "rgba(10,40,10,0)");
  ctx.fillStyle = sh; ctx.fillRect(0, edge, WW, 26);
  // front row of trees
  for (let x = 8; x < WW; x += 30 + rnd() * 10) treeShape(ctx, x, MAP.wildEdge - 2 + rnd() * 8, 0.95 + rnd() * 0.2, rnd() < 0.4);
  // undergrowth
  for (let x = 0; x < WW; x += 14) {
    ctx.fillStyle = rnd() < 0.5 ? "#2f7a37" : "#3a8a40";
    ctx.beginPath(); ctx.arc(x, MAP.wildEdge + 2 + rnd() * 3, 5 + rnd() * 4, Math.PI, TAU); ctx.fill();
  }
}
function forestEast(ctx, WW, rnd) {
  const sh = ctx.createLinearGradient(WW - 40, 0, WW - 10, 0);
  sh.addColorStop(0, "rgba(10,40,10,0)"); sh.addColorStop(1, "rgba(10,40,10,0.25)");
  ctx.fillStyle = sh; ctx.fillRect(WW - 40, MAP.wildEdge, 40, WORLD_H);
  ctx.fillStyle = "#1f4a27"; ctx.fillRect(WW - 10, 0, 10, WORLD_H);
  for (let y = MAP.wildEdge + 24; y < WORLD_H + 20; y += 34 + rnd() * 8) treeShape(ctx, WW - 12 + rnd() * 6, y, 0.9 + rnd() * 0.2, rnd() < 0.4);
}

function pen(ctx, rnd) {
  const p = MAP.pen;
  // ground: worn, a bit strawy
  ctx.save();
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.clip();
  ctx.fillStyle = "rgba(205,200,110,0.22)"; ctx.fillRect(p.x, p.y, p.w, p.h);
  for (let i = 0; i < 26; i++) {
    const x = p.x + rnd() * p.w, y = p.y + rnd() * p.h, r = 12 + rnd() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(190,160,90,0.22)"); g.addColorStop(1, "rgba(190,160,90,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "rgba(235,205,110,0.65)"; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 140; i++) { const x = p.x + rnd() * p.w, y = p.y + 8 + rnd() * (p.h - 8), a = rnd() * TAU, l = 3 + rnd() * 4; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  ctx.stroke();
  ctx.restore();
  // hay bale in the far corner + water tub
  const hx = p.x + p.w - 46, hy = p.y + p.h - 26;
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(hx, hy + 10, 26, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#d9b552"; ctx.beginPath(); ctx.roundRect(hx - 24, hy - 12, 48, 22, 6); ctx.fill();
  ctx.strokeStyle = "rgba(150,110,30,0.6)"; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hx - 20 + i * 7, hy - 10); ctx.lineTo(hx - 22 + i * 7, hy + 8); ctx.stroke(); }
  ctx.fillStyle = "#8a5a34"; ctx.fillRect(hx - 10, hy - 12, 3, 22); ctx.fillRect(hx + 8, hy - 12, 3, 22);
  ctx.fillStyle = "#f0d278"; ctx.beginPath(); ctx.roundRect(hx - 22, hy - 12, 44, 5, 3); ctx.fill();
  const wx = p.x + 40, wy = p.y + p.h - 24;
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(wx, wy + 8, 18, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#8f8a86"; ctx.beginPath(); ctx.ellipse(wx, wy, 16, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#6fc1f0"; ctx.beginPath(); ctx.ellipse(wx, wy - 1, 12, 4.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(wx - 4, wy - 2, 4, 1.2, 0, 0, TAU); ctx.fill();

  // fence: posts with caps and two rails, gate gap on the top side
  const gateA = p.x + 60, gateB = p.x + 130;
  const rail = (x1, y1, x2, y2) => {
    for (const [dy, c] of [[0, "#6e4628"], [-1.2, "#a8743f"]]) { ctx.strokeStyle = c; ctx.lineWidth = dy ? 2 : 4; ctx.beginPath(); ctx.moveTo(x1, y1 + dy); ctx.lineTo(x2, y2 + dy); ctx.stroke(); }
  };
  ctx.lineCap = "round";
  for (const off of [-9, -3]) {
    rail(p.x, p.y + off, gateA, p.y + off); rail(gateB, p.y + off, p.x + p.w, p.y + off);
    rail(p.x, p.y + p.h + off, p.x + p.w, p.y + p.h + off);
  }
  for (const off of [-2, 4]) { rail(p.x + off - 1, p.y, p.x + off - 1, p.y + p.h); rail(p.x + p.w + off - 1, p.y, p.x + p.w + off - 1, p.y + p.h); }
  const post = (x, y, big) => {
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x + 1, y + 3, 4, 1.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#7a4e2c"; ctx.fillRect(x - (big ? 3.5 : 2.5), y - 14, big ? 7 : 5, 16);
    ctx.fillStyle = "#a8743f"; ctx.fillRect(x - (big ? 3.5 : 2.5), y - 14, big ? 3 : 2, 16);
    ctx.fillStyle = "#5e3a20"; ctx.fillRect(x - (big ? 4.5 : 3.5), y - 16, big ? 9 : 7, 3);
  };
  for (let x = p.x; x <= p.x + p.w + 1; x += 30) { if (x > gateA + 2 && x < gateB - 2) continue; post(x, p.y, false); post(x, p.y + p.h, false); }
  post(gateA, p.y, true); post(gateB, p.y, true);
  for (let y = p.y + 30; y < p.y + p.h; y += 30) { post(p.x, y, false); post(p.x + p.w, y, false); }
  // little "PEN" plaque on the fence
  ctx.fillStyle = "#c9955a"; ctx.beginPath(); ctx.roundRect(p.x + 14, p.y - 20, 34, 14, 3); ctx.fill();
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#4a2f18"; ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("PEN", p.x + 31, p.y - 10);
}

function house(ctx) {
  const h = MAP.house;
  const wx = h.x, wy = h.y + 30, ww = h.w, wh = h.h - 30;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(wx + ww / 2 + 6, wy + wh + 4, ww / 2 + 16, 9, 0, 0, TAU); ctx.fill();
  // chimney (behind the roof)
  const cx = wx + ww - 40;
  ctx.fillStyle = "#8a4b3a"; ctx.fillRect(cx, h.y - 12, 16, 30);
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
  for (let y = h.y - 8; y < h.y + 18; y += 5) { ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 16, y); ctx.stroke(); }
  ctx.fillStyle = "#5e3226"; ctx.fillRect(cx - 2, h.y - 15, 20, 5);
  // walls: wooden planks
  ctx.fillStyle = "#d58f55"; ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let y = wy + 7; y < wy + wh; y += 8) ctx.fillRect(wx, y, ww, 1.2);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let y = wy + 1; y < wy + wh; y += 8) ctx.fillRect(wx, y, ww, 1);
  ctx.fillStyle = "#a8683a"; ctx.fillRect(wx, wy, 5, wh); ctx.fillRect(wx + ww - 5, wy, 5, wh);
  // stone foundation
  ctx.fillStyle = "#8c8781"; ctx.fillRect(wx - 3, wy + wh - 8, ww + 6, 9);
  ctx.fillStyle = "#a39e98";
  for (let x = wx - 2; x < wx + ww; x += 13) { ctx.beginPath(); ctx.roundRect(x, wy + wh - 7, 11, 6, 2); ctx.fill(); }
  // roof: shingles in rows, overhang, ridge
  const rl = wx - 14, rr = wx + ww + 14, ry = wy + 4, apex = h.y - 10, mid = wx + ww / 2;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(rl, ry); ctx.lineTo(mid, apex); ctx.lineTo(rr, ry); ctx.closePath();
  ctx.fillStyle = "#a34433"; ctx.fill();
  ctx.clip();
  for (let row = 0, y = ry; y > apex - 6; y -= 7, row++) {
    ctx.fillStyle = row % 2 ? "#b24f3c" : "#9a3e2e";
    for (let x = rl - 10 + (row % 2) * 6; x < rr + 10; x += 12) { ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(rl, y - 0.5, rr - rl, 1);
  }
  const shine = ctx.createLinearGradient(rl, apex, mid, ry);
  shine.addColorStop(0, "rgba(255,255,255,0.18)"); shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine; ctx.fillRect(rl, apex, mid - rl, ry - apex);
  ctx.restore();
  ctx.strokeStyle = "#6e2a20"; ctx.lineWidth = 3; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(rl, ry); ctx.lineTo(mid, apex); ctx.lineTo(rr, ry); ctx.stroke();
  // roof shadow on the wall
  const rs = ctx.createLinearGradient(0, wy, 0, wy + 10);
  rs.addColorStop(0, "rgba(0,0,0,0.25)"); rs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rs; ctx.fillRect(wx, wy + 4, ww, 10);
  // windows with shutters and flower boxes
  for (const x of [wx + 16, wx + ww - 44]) {
    const y = wy + 18;
    ctx.fillStyle = "#4f8a5b"; ctx.fillRect(x - 8, y - 1, 7, 24); ctx.fillRect(x + 29, y - 1, 7, 24);
    ctx.fillStyle = "rgba(0,0,0,0.15)"; for (const sx of [x - 8, x + 29]) for (let k = 2; k < 22; k += 4) ctx.fillRect(sx + 1, y + k, 5, 1);
    ctx.fillStyle = "#f4ead8"; ctx.fillRect(x - 2, y - 2, 32, 26);
    const gl = ctx.createLinearGradient(x, y, x, y + 22);
    gl.addColorStop(0, "#fff4c2"); gl.addColorStop(1, "#ffd27a");
    ctx.fillStyle = gl; ctx.fillRect(x, y, 28, 22);
    ctx.fillStyle = "#f4ead8"; ctx.fillRect(x + 13, y, 2, 22); ctx.fillRect(x, y + 10, 28, 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 8, y + 2); ctx.lineTo(x + 2, y + 8); ctx.closePath(); ctx.fill();
    // flower box
    ctx.fillStyle = "#8a5a34"; ctx.fillRect(x - 3, y + 24, 34, 6);
    ctx.fillStyle = "#3f8a3e"; ctx.beginPath(); ctx.ellipse(x + 14, y + 24, 16, 3.5, 0, Math.PI, TAU); ctx.fill();
    for (let k = 0; k < 6; k++) flower(ctx, x + 1 + k * 5.4, y + 21 - (k % 2) * 2, 1.4, k % 3 === 0 ? "#ff6b8a" : k % 3 === 1 ? "#fff3a0" : "#ffffff");
  }
  // door with an arch, step, lamp
  const dx = mid - 13, dy = wy + wh - 40;
  ctx.fillStyle = "#f4ead8"; ctx.beginPath(); ctx.moveTo(dx - 3, dy + 41); ctx.lineTo(dx - 3, dy + 8); ctx.arc(mid, dy + 8, 16, Math.PI, TAU); ctx.lineTo(dx + 29, dy + 41); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6b4429"; ctx.beginPath(); ctx.moveTo(dx, dy + 40); ctx.lineTo(dx, dy + 8); ctx.arc(mid, dy + 8, 13, Math.PI, TAU); ctx.lineTo(dx + 26, dy + 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(dx + 8, dy + 2, 1.5, 38); ctx.fillRect(dx + 17, dy + 2, 1.5, 38);
  ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(dx + 21, dy + 24, 2, 0, TAU); ctx.fill();
  ctx.fillStyle = "#9e9993"; ctx.beginPath(); ctx.roundRect(dx - 6, dy + 39, 38, 6, 2); ctx.fill();
  ctx.fillStyle = "#3a3a3a"; ctx.fillRect(dx + 33, dy + 4, 2, 8);
  ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.roundRect(dx + 30, dy + 10, 8, 10, 2); ctx.fill();
  const lg = ctx.createRadialGradient(dx + 34, dy + 15, 1, dx + 34, dy + 15, 16);
  lg.addColorStop(0, "rgba(255,224,138,0.35)"); lg.addColorStop(1, "rgba(255,224,138,0)");
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(dx + 34, dy + 15, 16, 0, TAU); ctx.fill();
}