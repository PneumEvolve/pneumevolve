// src/Pages/Homestead/drawArt.js
// ─────────────────────────────────────────────────────────────────────────────
// Drawn canvas icons that replace emoji for specific items.
//
// Each exported function follows ONE contract:
//
//   drawXyz(ctx, x, y, size)
//
//     ctx  — CanvasRenderingContext2D
//     x,y  — top-left of the square the icon should fill
//     size — width AND height of that square, in CSS px
//
// All functions are PURE and DETERMINISTIC — same inputs, same pixels.
// No randomness, no time, no global state. Safe to call inside a render loop
// without animating. Line widths scale with `Math.max(1, size * 0.02)`.
//
// Wiring (see Wiring Guide.html for the full walkthrough):
//   1. import the draw fn here in Items.js
//   2. add a `draw:` field on the item entry
//   3. drawWorld.js/drawPlaceable already falls through if `draw` is present
//   4. UI components use the <ItemIcon id="..." size={..} /> helper
// ─────────────────────────────────────────────────────────────────────────────

// Palette tokens used by these icons. These extend PAL from drawWorld.js;
// if you'd rather keep one palette, copy these into PAL and import from there.
const ART_PAL = {
  treeTrunk: "#7a4f2a",
  woodMid:   "#8b5a2b",
  woodDark:  "#5a3a1a",
  woodLight: "#a07040",
  woodHi:    "#c08858",
  stone:     ["#a0a090", "#909080", "#b0b0a0"],
  stoneDark: "#6a685c",
  flameR:    "#c83820",
  flameO:    "#f08020",
  flameY:    "#fad048",
  iron:      "#b8b8b8",
  ironDark:  "#5a5a5a",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function groundShadow(ctx, cx, by, rx, ry, alpha = 0.25) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CRAFTING STATION
//    A wooden workbench with a saw on the left and a hammer head on the right.
//    Replaces 🔨 for the `crafting_station` item.
// ─────────────────────────────────────────────────────────────────────────────
export function drawCraftingStation(ctx, x, y, s) {
  const cx = x + s / 2;
  const lw = Math.max(1, s * 0.018);

  // Ground shadow
  groundShadow(ctx, cx, y + s * 0.93, s * 0.4, s * 0.06);

  // Back legs (darker, slightly inset)
  ctx.fillStyle = ART_PAL.woodDark;
  ctx.fillRect(x + s * 0.24, y + s * 0.5, s * 0.07, s * 0.42);
  ctx.fillRect(x + s * 0.69, y + s * 0.5, s * 0.07, s * 0.42);

  // Front legs
  ctx.fillStyle = ART_PAL.treeTrunk;
  ctx.fillRect(x + s * 0.18, y + s * 0.54, s * 0.08, s * 0.4);
  ctx.fillRect(x + s * 0.74, y + s * 0.54, s * 0.08, s * 0.4);

  // Cross-brace under top
  ctx.fillStyle = ART_PAL.woodMid;
  ctx.fillRect(x + s * 0.16, y + s * 0.5, s * 0.68, s * 0.07);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x + s * 0.16, y + s * 0.56, s * 0.68, s * 0.02);

  // Top plank
  ctx.fillStyle = ART_PAL.woodLight;
  ctx.fillRect(x + s * 0.1, y + s * 0.38, s * 0.8, s * 0.14);
  // Top front highlight
  ctx.fillStyle = ART_PAL.woodHi;
  ctx.fillRect(x + s * 0.11, y + s * 0.4, s * 0.78, s * 0.025);
  // Top side shadow
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(x + s * 0.1, y + s * 0.48, s * 0.8, s * 0.04);
  // Wood grain on top
  if (s >= 28) {
    ctx.strokeStyle = "rgba(60,38,18,0.55)";
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.15, y + s * 0.45);
    ctx.lineTo(x + s * 0.85, y + s * 0.45);
    ctx.stroke();
  }

  // Saw on the left side of bench top
  if (s >= 24) {
    ctx.fillStyle = ART_PAL.iron;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.22, y + s * 0.34);
    ctx.lineTo(x + s * 0.46, y + s * 0.34);
    ctx.lineTo(x + s * 0.44, y + s * 0.4);
    ctx.lineTo(x + s * 0.24, y + s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x + s * 0.23, y + s * 0.345, s * 0.22, s * 0.008);
    if (s >= 40) {
      ctx.fillStyle = ART_PAL.ironDark;
      const tY = y + s * 0.4;
      for (let i = 0; i < 5; i++) {
        const tx = x + s * (0.25 + i * 0.04);
        ctx.beginPath();
        ctx.moveTo(tx, tY);
        ctx.lineTo(tx + s * 0.018, tY + s * 0.02);
        ctx.lineTo(tx + s * 0.036, tY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = ART_PAL.treeTrunk;
    ctx.fillRect(x + s * 0.16, y + s * 0.31, s * 0.07, s * 0.11);
    ctx.fillStyle = ART_PAL.woodDark;
    ctx.fillRect(x + s * 0.16, y + s * 0.39, s * 0.07, s * 0.02);
  }

  // Hammer on the right, head sticking up
  ctx.fillStyle = ART_PAL.ironDark;
  ctx.fillRect(x + s * 0.56, y + s * 0.18, s * 0.22, s * 0.11);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + s * 0.56, y + s * 0.195, s * 0.22, s * 0.018);
  ctx.fillStyle = ART_PAL.ironDark;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.78, y + s * 0.18);
  ctx.lineTo(x + s * 0.82, y + s * 0.21);
  ctx.lineTo(x + s * 0.78, y + s * 0.29);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ART_PAL.treeTrunk;
  ctx.fillRect(x + s * 0.62, y + s * 0.28, s * 0.06, s * 0.14);
  ctx.fillStyle = ART_PAL.woodDark;
  ctx.fillRect(x + s * 0.62, y + s * 0.4, s * 0.06, s * 0.025);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FIRE PIT
//    Stone ring, crossed logs in the middle, three-layer flame.
//    Replaces 🔥 for the `fire_pit` item.
// ─────────────────────────────────────────────────────────────────────────────
export function drawFirePit(ctx, x, y, s) {
  const cx = x + s / 2;
  const ringY = y + s * 0.74;

  // Ground shadow
  groundShadow(ctx, cx, y + s * 0.92, s * 0.42, s * 0.06, 0.22);

  // Ring back (darker)
  ctx.fillStyle = ART_PAL.stoneDark;
  ctx.beginPath();
  ctx.ellipse(cx, ringY - s * 0.04, s * 0.42, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark pit interior
  ctx.fillStyle = "#1a0e04";
  ctx.beginPath();
  ctx.ellipse(cx, ringY - s * 0.02, s * 0.32, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crossed logs
  ctx.save();
  ctx.translate(cx, ringY - s * 0.02);
  ctx.rotate(0.45);
  ctx.fillStyle = ART_PAL.woodDark;
  ctx.fillRect(-s * 0.3, -s * 0.03, s * 0.6, s * 0.06);
  ctx.fillStyle = "rgba(40,20,8,0.7)";
  ctx.fillRect(-s * 0.3, -s * 0.025, s * 0.6, s * 0.012);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, ringY - s * 0.02);
  ctx.rotate(-0.45);
  ctx.fillStyle = ART_PAL.treeTrunk;
  ctx.fillRect(-s * 0.3, -s * 0.03, s * 0.6, s * 0.06);
  ctx.fillStyle = "rgba(40,20,8,0.55)";
  ctx.fillRect(-s * 0.3, -s * 0.025, s * 0.6, s * 0.012);
  ctx.restore();

  // Log end discs
  if (s >= 24) {
    ctx.fillStyle = ART_PAL.woodLight;
    const ends = [
      [Math.cos(0.45) * s * 0.3, Math.sin(0.45) * s * 0.3 * 0.5],
      [-Math.cos(0.45) * s * 0.3, -Math.sin(0.45) * s * 0.3 * 0.5],
      [Math.cos(-0.45) * s * 0.3, Math.sin(-0.45) * s * 0.3 * 0.5],
      [-Math.cos(-0.45) * s * 0.3, -Math.sin(-0.45) * s * 0.3 * 0.5],
    ];
    for (const [dx, dy] of ends) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, ringY - s * 0.02 + dy, s * 0.035, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Flames — outer red, middle orange, inner yellow (all deterministic)
  ctx.fillStyle = ART_PAL.flameR;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.17, ringY - s * 0.04);
  ctx.bezierCurveTo(
    cx - s * 0.24, y + s * 0.45,
    cx - s * 0.08, y + s * 0.28,
    cx + s * 0.0,  y + s * 0.22
  );
  ctx.bezierCurveTo(
    cx + s * 0.06, y + s * 0.34,
    cx + s * 0.22, y + s * 0.42,
    cx + s * 0.16, ringY - s * 0.04
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ART_PAL.flameO;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, ringY - s * 0.08);
  ctx.bezierCurveTo(
    cx - s * 0.14, y + s * 0.5,
    cx - s * 0.02, y + s * 0.38,
    cx + s * 0.02, y + s * 0.32
  );
  ctx.bezierCurveTo(
    cx + s * 0.06, y + s * 0.42,
    cx + s * 0.14, y + s * 0.5,
    cx + s * 0.09, ringY - s * 0.08
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ART_PAL.flameY;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.04, ringY - s * 0.1);
  ctx.bezierCurveTo(
    cx - s * 0.06, y + s * 0.52,
    cx, y + s * 0.45,
    cx + s * 0.01, y + s * 0.4
  );
  ctx.bezierCurveTo(
    cx + s * 0.04, y + s * 0.48,
    cx + s * 0.05, y + s * 0.54,
    cx + s * 0.03, ringY - s * 0.1
  );
  ctx.closePath();
  ctx.fill();

  // Front stones (overlap flames so they sit "in front")
  const stoneSpec = [
    [-0.34,  0.04, 0.11, 0.07],
    [-0.16,  0.08, 0.1,  0.06],
    [ 0.04,  0.08, 0.11, 0.06],
    [ 0.24,  0.04, 0.11, 0.07],
  ];
  for (const [dx, dy, rx, ry] of stoneSpec) {
    ctx.fillStyle = ART_PAL.stone[2];
    ctx.beginPath();
    ctx.ellipse(cx + s * dx, ringY + s * dy, s * rx, s * ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx + s * dx, ringY + s * dy + s * ry * 0.6, s * rx * 0.85, s * ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx + s * dx, ringY + s * dy - s * ry * 0.5, s * rx * 0.65, s * ry * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ember glow
  if (s >= 20) {
    const grad = ctx.createRadialGradient(cx, ringY - s * 0.02, 0, cx, ringY - s * 0.02, s * 0.18);
    grad.addColorStop(0, "rgba(250,180,80,0.5)");
    grad.addColorStop(1, "rgba(250,180,80,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, ringY - s * 0.02, s * 0.18, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FURNACE
//    Stone block, arched glowing mouth, chimney on top-right.
//    Replaces 🏭 for the `furnace` item.
// ─────────────────────────────────────────────────────────────────────────────
export function drawFurnace(ctx, x, y, s) {
  const cx = x + s / 2;
  const lw = Math.max(1, s * 0.018);

  // Ground shadow
  groundShadow(ctx, cx, y + s * 0.95, s * 0.4, s * 0.05);

  // Chimney
  ctx.fillStyle = ART_PAL.stone[1];
  ctx.fillRect(x + s * 0.58, y + s * 0.1, s * 0.14, s * 0.2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x + s * 0.68, y + s * 0.12, s * 0.04, s * 0.18);
  ctx.fillStyle = ART_PAL.stone[2];
  ctx.fillRect(x + s * 0.55, y + s * 0.08, s * 0.2, s * 0.04);
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(x + s * 0.61, y + s * 0.09, s * 0.08, s * 0.02);

  // Main body
  ctx.fillStyle = ART_PAL.stone[1];
  ctx.beginPath();
  ctx.moveTo(x + s * 0.16, y + s * 0.9);
  ctx.lineTo(x + s * 0.16, y + s * 0.32);
  ctx.lineTo(x + s * 0.84, y + s * 0.32);
  ctx.lineTo(x + s * 0.84, y + s * 0.9);
  ctx.closePath();
  ctx.fill();

  // Side shading
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + s * 0.72, y + s * 0.32, s * 0.12, s * 0.58);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(x + s * 0.16, y + s * 0.32, s * 0.06, s * 0.58);

  // Capstone
  ctx.fillStyle = ART_PAL.stone[2];
  ctx.fillRect(x + s * 0.14, y + s * 0.28, s * 0.72, s * 0.06);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(x + s * 0.14, y + s * 0.335, s * 0.72, s * 0.012);

  // Brick courses (medium+ only)
  if (s >= 32) {
    ctx.strokeStyle = "rgba(40,38,28,0.5)";
    ctx.lineWidth = lw * 0.7;
    [0.46, 0.6, 0.74].forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(x + s * 0.16, y + s * p);
      ctx.lineTo(x + s * 0.84, y + s * p);
      ctx.stroke();
    });
    const verts = [
      [0.34, 0.34, 0.46], [0.56, 0.34, 0.46], [0.74, 0.34, 0.46],
      [0.26, 0.46, 0.6],  [0.48, 0.46, 0.6],  [0.66, 0.46, 0.6],
      [0.34, 0.6, 0.74],  [0.56, 0.6, 0.74],  [0.74, 0.6, 0.74],
      [0.26, 0.74, 0.9],  [0.46, 0.74, 0.9],  [0.66, 0.74, 0.9],
    ];
    for (const [vx, y1, y2] of verts) {
      ctx.beginPath();
      ctx.moveTo(x + s * vx, y + s * y1);
      ctx.lineTo(x + s * vx, y + s * y2);
      ctx.stroke();
    }
  }

  // Arched mouth (dark cavity)
  ctx.fillStyle = "#0c0500";
  ctx.beginPath();
  ctx.moveTo(x + s * 0.32, y + s * 0.88);
  ctx.lineTo(x + s * 0.32, y + s * 0.62);
  ctx.quadraticCurveTo(x + s * 0.32, y + s * 0.5, cx, y + s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.68, y + s * 0.5, x + s * 0.68, y + s * 0.62);
  ctx.lineTo(x + s * 0.68, y + s * 0.88);
  ctx.closePath();
  ctx.fill();

  // Glowing interior (radial gradient)
  const glow = ctx.createRadialGradient(cx, y + s * 0.78, 0, cx, y + s * 0.78, s * 0.22);
  glow.addColorStop(0, "rgba(252,210,80,1)");
  glow.addColorStop(0.4, "rgba(240,120,32,0.95)");
  glow.addColorStop(1, "rgba(200,56,32,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.34, y + s * 0.87);
  ctx.lineTo(x + s * 0.34, y + s * 0.62);
  ctx.quadraticCurveTo(x + s * 0.34, y + s * 0.52, cx, y + s * 0.52);
  ctx.quadraticCurveTo(x + s * 0.66, y + s * 0.52, x + s * 0.66, y + s * 0.62);
  ctx.lineTo(x + s * 0.66, y + s * 0.87);
  ctx.closePath();
  ctx.fill();

  // Tiny inner flame
  if (s >= 24) {
    ctx.fillStyle = ART_PAL.flameY;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.05, y + s * 0.82);
    ctx.bezierCurveTo(
      cx - s * 0.05, y + s * 0.72,
      cx - s * 0.01, y + s * 0.66,
      cx + s * 0.01, y + s * 0.62
    );
    ctx.bezierCurveTo(
      cx + s * 0.05, y + s * 0.68,
      cx + s * 0.05, y + s * 0.76,
      cx + s * 0.04, y + s * 0.82
    );
    ctx.closePath();
    ctx.fill();
  }

  // Arch outline
  if (s >= 32) {
    ctx.strokeStyle = ART_PAL.stoneDark;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.32, y + s * 0.88);
    ctx.lineTo(x + s * 0.32, y + s * 0.62);
    ctx.quadraticCurveTo(x + s * 0.32, y + s * 0.5, cx, y + s * 0.5);
    ctx.quadraticCurveTo(x + s * 0.68, y + s * 0.5, x + s * 0.68, y + s * 0.62);
    ctx.lineTo(x + s * 0.68, y + s * 0.88);
    ctx.stroke();
  }

  // Soft glow on ground in front of mouth
  if (s >= 20) {
    const fg = ctx.createRadialGradient(cx, y + s * 0.92, 0, cx, y + s * 0.92, s * 0.3);
    fg.addColorStop(0, "rgba(252,180,80,0.4)");
    fg.addColorStop(1, "rgba(252,180,80,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(cx, y + s * 0.92, s * 0.3, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const TOOL_PAL = {
  // Wood (matches ART_PAL in drawArt.js — duplicated here for portability)
  treeTrunk: "#7a4f2a",
  woodLight: "#a07040",
  woodHi:    "#c08858",
  woodDark:  "#5a3a1a",

  // Stone tier — warm grey
  stone:     "#a8a294",
  stoneHi:   "#c0bba8",
  stoneDk:   "#7a766a",

  // Iron tier — cool blue-grey
  iron:      "#8a96a4",
  ironHi:    "#cdd6dc",
  ironDk:    "#3a4654",
  ironDeep:  "#202830",

  // Sword guard / pommel
  brass:     "#c89048",
  brassDk:   "#7a5028",

  // Watering can stream
  water:     "#5a9ad8",
  waterHi:   "#a8d4f8",

  // Leather grip wrap
  grip:      "#3a2010",
};

// All handheld tools sit on a 45° diagonal: head upper-left, grip lower-right.
const ANG = Math.PI / 4;

// ── helpers ─────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function metalGradient(ctx, x0, y0, x1, y1, dk, mid, hi) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, hi);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, dk);
  return g;
}

/**
 * Wooden shaft on the 45° diagonal, with a leather-wrapped grip on the
 * lower-right end. Call once, then draw the head separately (in rotated
 * frame use translate(cx, cy); rotate(ANG); -L/2 as the head anchor).
 */
function drawShaft(ctx, x, y, s, opts = {}) {
  const {
    length = 0.86,
    thickness = 0.085,
    gripLen = 0.32,
    angle = ANG,
    color = TOOL_PAL.treeTrunk,
    colorHi = TOOL_PAL.woodHi,
    colorDk = TOOL_PAL.woodDark,
    showGrip = true,
  } = opts;

  const cx = x + s / 2;
  const cy = y + s / 2;
  const L = s * length;
  const T = s * thickness;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // shaft
  ctx.fillStyle = color;
  ctx.fillRect(-L / 2, -T / 2, L, T);
  ctx.fillStyle = colorHi;
  ctx.fillRect(-L / 2, -T / 2, L, T * 0.25);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(-L / 2, T / 2 - T * 0.22, L, T * 0.22);
  ctx.fillStyle = colorDk;
  ctx.fillRect(L / 2 - T * 0.15, -T / 2, T * 0.15, T);

  // leather grip
  if (showGrip) {
    const G = s * gripLen;
    const gripX = L / 2 - G;
    ctx.fillStyle = TOOL_PAL.grip;
    ctx.fillRect(gripX, -T * 0.62, G, T * 1.24);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(gripX, -T * 0.62, G, T * 0.32);
    if (s >= 28) {
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = Math.max(0.8, s * 0.011);
      const n = s >= 48 ? 4 : 3;
      for (let i = 1; i <= n; i++) {
        const lx = gripX + (G * i) / (n + 1);
        ctx.beginPath();
        ctx.moveTo(lx, -T * 0.62);
        ctx.lineTo(lx, T * 0.62);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

const cyMid = (y, s) => y + s / 2;

// ─────────────────────────────────────────────────────────────────────────
// 1. HOE — flat trapezoidal blade hanging DOWN off the shaft tip
//    (opposite side from the axe head, so silhouettes don't collide)
// ─────────────────────────────────────────────────────────────────────────
function drawHoeImpl(ctx, x, y, s, material) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.94, s * 0.3, s * 0.045);

  drawShaft(ctx, x, y, s, { length: 0.86, thickness: 0.075 });

  ctx.save();
  ctx.translate(cx, cyMid(y, s));
  ctx.rotate(ANG);
  const L = s * 0.86;
  const hx = -L / 2;

  const dk = material === "iron" ? TOOL_PAL.ironDk : TOOL_PAL.stoneDk;
  const mid = material === "iron" ? TOOL_PAL.iron  : TOOL_PAL.stone;
  const hi  = material === "iron" ? TOOL_PAL.ironHi : TOOL_PAL.stoneHi;

  // socket / collar where shaft meets head
  ctx.fillStyle = dk;
  ctx.fillRect(hx - s * 0.04, -s * 0.055, s * 0.1, s * 0.11);

  // blade — trapezoid hanging DOWN, cutting edge furthest out
  ctx.fillStyle = metalGradient(ctx, hx, s * 0.05, hx, s * 0.36, hi, mid, dk);
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.02, s * 0.05);
  ctx.lineTo(hx + s * 0.10, s * 0.05);
  ctx.lineTo(hx + s * 0.18, s * 0.34);
  ctx.lineTo(hx - s * 0.04, s * 0.34);
  ctx.closePath();
  ctx.fill();

  // cutting-edge highlight
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.moveTo(hx - s * 0.04, s * 0.34);
  ctx.lineTo(hx + s * 0.18, s * 0.34);
  ctx.lineTo(hx + s * 0.15, s * 0.30);
  ctx.lineTo(hx - s * 0.02, s * 0.30);
  ctx.closePath();
  ctx.fill();

  // seam where blade meets socket
  if (s >= 24) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(hx - s * 0.02, s * 0.05, s * 0.12, s * 0.012);
  }

  // chip nicks (stone only)
  if (material === "stone" && s >= 28) {
    ctx.fillStyle = TOOL_PAL.stoneDk;
    ctx.beginPath();
    ctx.moveTo(hx + s * 0.04, s * 0.34);
    ctx.lineTo(hx + s * 0.07, s * 0.32);
    ctx.lineTo(hx + s * 0.10, s * 0.34);
    ctx.closePath();
    ctx.fill();
  }

  // specular streak (iron only)
  if (material === "iron" && s >= 24) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(hx + s * 0.02, s * 0.12, s * 0.015, s * 0.18);
  }

  ctx.restore();
}
export function drawHoe(ctx, x, y, s)     { drawHoeImpl(ctx, x, y, s, "stone"); }
export function drawIronHoe(ctx, x, y, s) { drawHoeImpl(ctx, x, y, s, "iron"); }

// ─────────────────────────────────────────────────────────────────────────
// 2. AXE — chunky asymmetric wedge, big curved cutting edge facing out
// ─────────────────────────────────────────────────────────────────────────
function drawAxeImpl(ctx, x, y, s, material) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.93, s * 0.33, s * 0.05);

  drawShaft(ctx, x, y, s, { length: 0.84, thickness: 0.085 });

  ctx.save();
  ctx.translate(cx, cyMid(y, s));
  ctx.rotate(ANG);
  const L = s * 0.84;
  const hx = -L / 2;

  const dk = material === "iron" ? TOOL_PAL.ironDk : TOOL_PAL.stoneDk;
  const mid = material === "iron" ? TOOL_PAL.iron  : TOOL_PAL.stone;
  const hi  = material === "iron" ? TOOL_PAL.ironHi : TOOL_PAL.stoneHi;
  const sizeBump = material === "iron" ? 1.08 : 1.0;

  // Eye / socket — taller so the head clearly attaches
  ctx.fillStyle = dk;
  ctx.fillRect(hx - s * 0.02, -s * 0.09 * sizeBump, s * 0.14, s * 0.18 * sizeBump);

  // Main head — protrudes farther and flares wider than v1
  const headLen  = s * 0.46 * sizeBump;
  const headBack = s * 0.08;
  const headHalf = s * 0.22 * sizeBump;

  ctx.fillStyle = metalGradient(ctx, hx - headLen, 0, hx + s * 0.08, 0, dk, mid, hi);
  ctx.beginPath();
  ctx.moveTo(hx + headBack, -s * 0.07 * sizeBump);
  ctx.lineTo(hx - headLen * 0.55, -headHalf);
  ctx.lineTo(hx - headLen, -s * 0.04);
  ctx.lineTo(hx - headLen,  s * 0.04);
  ctx.lineTo(hx - headLen * 0.55, headHalf);
  ctx.lineTo(hx + headBack, s * 0.07 * sizeBump);
  ctx.closePath();
  ctx.fill();

  // Curved cutting-edge highlight
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(1, s * (material === "iron" ? 0.024 : 0.020));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx - headLen * 0.55, -headHalf);
  ctx.quadraticCurveTo(hx - headLen * 1.02, 0, hx - headLen * 0.55, headHalf);
  ctx.stroke();

  // Interior crease
  if (s >= 24) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(0.8, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(hx - headLen * 0.22, -s * 0.13 * sizeBump);
    ctx.quadraticCurveTo(hx - headLen * 0.5, 0, hx - headLen * 0.22, s * 0.13 * sizeBump);
    ctx.stroke();
  }

  // Leather lash where head meets shaft
  if (s >= 24) {
    ctx.fillStyle = TOOL_PAL.grip;
    ctx.fillRect(hx + s * 0.005, -s * 0.10, s * 0.05, s * 0.20);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(hx + s * 0.005, -s * 0.10, s * 0.05, s * 0.05);
  }

  // Chip nick (stone)
  if (material === "stone" && s >= 28) {
    ctx.fillStyle = TOOL_PAL.stoneDk;
    ctx.beginPath();
    ctx.moveTo(hx - headLen + s * 0.015, -s * 0.02);
    ctx.lineTo(hx - headLen + s * 0.065, -s * 0.05);
    ctx.lineTo(hx - headLen + s * 0.045, s * 0.005);
    ctx.closePath();
    ctx.fill();
  }
  // Specular hot-spot (iron)
  if (material === "iron" && s >= 24) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(hx - headLen * 0.45, -s * 0.05, s * 0.07, s * 0.022, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
export function drawAxe(ctx, x, y, s)     { drawAxeImpl(ctx, x, y, s, "stone"); }
export function drawIronAxe(ctx, x, y, s) { drawAxeImpl(ctx, x, y, s, "iron"); }

// ─────────────────────────────────────────────────────────────────────────
// 3. PICKAXE — twin-spike head perpendicular to shaft
// ─────────────────────────────────────────────────────────────────────────
function drawPickaxeImpl(ctx, x, y, s, material) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.93, s * 0.34, s * 0.05);

  drawShaft(ctx, x, y, s, { length: 0.84, thickness: 0.08 });

  ctx.save();
  ctx.translate(cx, cyMid(y, s));
  ctx.rotate(ANG);
  const L = s * 0.84;
  const hx = -L / 2;

  const dk = material === "iron" ? TOOL_PAL.ironDk : TOOL_PAL.stoneDk;
  const mid = material === "iron" ? TOOL_PAL.iron  : TOOL_PAL.stone;
  const hi  = material === "iron" ? TOOL_PAL.ironHi : TOOL_PAL.stoneHi;
  const bump = material === "iron" ? 1.06 : 1.0;

  // socket
  ctx.fillStyle = dk;
  ctx.fillRect(hx - s * 0.02, -s * 0.06, s * 0.12, s * 0.12);

  // Two tapered spikes — up and down from shaft tip
  const drawSpike = (dir) => {
    const tipY = dir * s * 0.32 * bump;
    const baseY = dir * s * 0.05;
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.02, baseY);
    ctx.lineTo(hx + s * 0.08, baseY);
    ctx.lineTo(hx + s * 0.06, baseY + dir * s * 0.04);
    ctx.lineTo(hx + s * 0.005, tipY);
    ctx.lineTo(hx - s * 0.04, baseY + dir * s * 0.04);
    ctx.closePath();
    ctx.fill();

    // leading edge highlight
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.03, baseY + dir * s * 0.005);
    ctx.lineTo(hx + s * 0.002, tipY);
    ctx.lineTo(hx - s * 0.012, baseY + dir * s * 0.02);
    ctx.closePath();
    ctx.fill();

    // shadow side
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.moveTo(hx + s * 0.06, baseY + dir * s * 0.01);
    ctx.lineTo(hx + s * 0.005, tipY);
    ctx.lineTo(hx + s * 0.04, baseY + dir * s * 0.04);
    ctx.closePath();
    ctx.fill();
  };
  drawSpike(-1);
  drawSpike(+1);

  // Central collar
  ctx.fillStyle = dk;
  ctx.fillRect(hx - s * 0.02, -s * 0.05, s * 0.12, s * 0.1);
  ctx.fillStyle = mid;
  ctx.fillRect(hx, -s * 0.03, s * 0.085, s * 0.06);
  ctx.fillStyle = hi;
  ctx.fillRect(hx, -s * 0.03, s * 0.085, s * 0.012);

  // Leather lash
  if (s >= 24) {
    ctx.fillStyle = TOOL_PAL.grip;
    ctx.fillRect(hx + s * 0.07, -s * 0.07, s * 0.04, s * 0.14);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(hx + s * 0.07, -s * 0.07, s * 0.04, s * 0.04);
  }

  // Iron specular dots
  if (material === "iron" && s >= 24) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(hx - s * 0.005, -s * 0.22 * bump, s * 0.01, s * 0.13);
    ctx.fillRect(hx - s * 0.005,  s * 0.09 * bump, s * 0.01, s * 0.13);
  }
  ctx.restore();
}
export function drawPickaxe(ctx, x, y, s)     { drawPickaxeImpl(ctx, x, y, s, "stone"); }
export function drawIronPickaxe(ctx, x, y, s) { drawPickaxeImpl(ctx, x, y, s, "iron"); }

// ─────────────────────────────────────────────────────────────────────────
// 4. FISHING ROD — thin diagonal rod, line, hook
// ─────────────────────────────────────────────────────────────────────────
export function drawFishingRod(ctx, x, y, s) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.93, s * 0.22, s * 0.035);

  // Thin rod, slightly steeper than the standard tool diagonal
  drawShaft(ctx, x, y, s, {
    length: 0.9,
    thickness: 0.05,
    gripLen: 0.28,
    angle: ANG * 1.05,
    color: TOOL_PAL.woodLight,
    colorHi: TOOL_PAL.woodHi,
  });

  // Eyelets along the rod
  if (s >= 24) {
    ctx.save();
    ctx.translate(cx, cyMid(y, s));
    ctx.rotate(ANG * 1.05);
    ctx.fillStyle = TOOL_PAL.ironDk;
    const L = s * 0.9;
    [0.25, 0.05, -0.15, -0.35].forEach((p) => {
      const px = L * p;
      ctx.beginPath();
      ctx.arc(px, -s * 0.045, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Rod tip dot
  const tipX = cx + Math.cos(ANG * 1.05) * (-s * 0.9 / 2);
  const tipY = cyMid(y, s) + Math.sin(ANG * 1.05) * (-s * 0.9 / 2);
  ctx.fillStyle = TOOL_PAL.ironDk;
  ctx.beginPath();
  ctx.arc(tipX, tipY, s * 0.022, 0, Math.PI * 2);
  ctx.fill();

  // Line swooping down to a hook
  const hookX = x + s * 0.66;
  const hookY = y + s * 0.74;
  ctx.strokeStyle = "rgba(240,232,200,0.85)";
  ctx.lineWidth = Math.max(0.6, s * 0.008);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.28, hookX, hookY);
  ctx.stroke();

  // J-shaped hook
  if (s >= 16) {
    ctx.strokeStyle = TOOL_PAL.iron;
    ctx.lineWidth = Math.max(0.8, s * 0.018);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hookX, hookY);
    ctx.lineTo(hookX, hookY + s * 0.06);
    ctx.arc(hookX - s * 0.03, hookY + s * 0.06, s * 0.03, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = TOOL_PAL.ironHi;
    ctx.lineWidth = Math.max(0.4, s * 0.008);
    ctx.beginPath();
    ctx.moveTo(hookX - s * 0.001, hookY + s * 0.01);
    ctx.lineTo(hookX - s * 0.001, hookY + s * 0.05);
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. WATERING CAN — upright vessel, horizontal tapered spout, flared rose
// ─────────────────────────────────────────────────────────────────────────
export function drawWateringCan(ctx, x, y, s) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.94, s * 0.4, s * 0.05);

  // Body
  const bodyX = x + s * 0.12;
  const bodyY = y + s * 0.36;
  const bodyW = s * 0.46;
  const bodyH = s * 0.5;

  ctx.fillStyle = TOOL_PAL.ironDk;
  roundRect(ctx, bodyX, bodyY, bodyW, bodyH, s * 0.07);
  ctx.fill();
  ctx.fillStyle = TOOL_PAL.iron;
  roundRect(ctx, bodyX + s * 0.018, bodyY + s * 0.018, bodyW - s * 0.05, bodyH - s * 0.04, s * 0.05);
  ctx.fill();
  ctx.fillStyle = TOOL_PAL.ironHi;
  roundRect(ctx, bodyX + s * 0.04, bodyY + s * 0.04, bodyW - s * 0.1, s * 0.06, s * 0.02);
  ctx.fill();

  // rim
  ctx.fillStyle = TOOL_PAL.ironDeep;
  ctx.fillRect(bodyX + s * 0.02, bodyY + s * 0.018, bodyW - s * 0.04, s * 0.015);

  // rivets
  if (s >= 28) {
    ctx.fillStyle = TOOL_PAL.ironDeep;
    [0.18, 0.32, 0.46].forEach((p) => {
      ctx.beginPath();
      ctx.arc(x + s * p, bodyY + s * 0.36, s * 0.013, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // top arching handle
  ctx.strokeStyle = TOOL_PAL.ironDk;
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bodyX + s * 0.06, bodyY + s * 0.03);
  ctx.quadraticCurveTo(bodyX + bodyW * 0.5, bodyY - s * 0.18, bodyX + bodyW - s * 0.06, bodyY + s * 0.03);
  ctx.stroke();
  ctx.strokeStyle = TOOL_PAL.iron;
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  ctx.moveTo(bodyX + s * 0.08, bodyY + s * 0.04);
  ctx.quadraticCurveTo(bodyX + bodyW * 0.5, bodyY - s * 0.15, bodyX + bodyW - s * 0.08, bodyY + s * 0.04);
  ctx.stroke();

  // Spout — tapered horizontal tube
  const spoutBaseX   = bodyX + bodyW - s * 0.01;
  const spoutBaseTop = bodyY + s * 0.12;
  const spoutBaseBot = bodyY + s * 0.28;
  const spoutTipX    = x + s * 0.80;
  const spoutTipTop  = bodyY + s * 0.06;
  const spoutTipBot  = bodyY + s * 0.18;

  ctx.fillStyle = TOOL_PAL.ironDk;
  ctx.beginPath();
  ctx.moveTo(spoutBaseX, spoutBaseTop);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.04, spoutTipX, spoutTipTop);
  ctx.lineTo(spoutTipX, spoutTipBot);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.20, spoutBaseX, spoutBaseBot);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = TOOL_PAL.iron;
  ctx.beginPath();
  ctx.moveTo(spoutBaseX - s * 0.005, spoutBaseTop + s * 0.012);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.06, spoutTipX - s * 0.005, spoutTipTop + s * 0.01);
  ctx.lineTo(spoutTipX - s * 0.005, spoutTipBot - s * 0.01);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.18, spoutBaseX - s * 0.005, spoutBaseBot - s * 0.012);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = TOOL_PAL.ironHi;
  ctx.beginPath();
  ctx.moveTo(spoutBaseX - s * 0.005, spoutBaseTop + s * 0.016);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.07, spoutTipX - s * 0.005, spoutTipTop + s * 0.014);
  ctx.lineTo(spoutTipX - s * 0.005, spoutTipTop + s * 0.025);
  ctx.quadraticCurveTo(x + s * 0.72, bodyY + s * 0.085, spoutBaseX - s * 0.005, spoutBaseTop + s * 0.028);
  ctx.closePath();
  ctx.fill();

  // Rose — flared trapezoid at end of spout
  const roseTipX   = x + s * 0.97;
  const roseTipTop = bodyY - s * 0.02;
  const roseTipBot = bodyY + s * 0.26;

  ctx.fillStyle = TOOL_PAL.ironDk;
  ctx.beginPath();
  ctx.moveTo(spoutTipX, spoutTipTop);
  ctx.lineTo(roseTipX, roseTipTop);
  ctx.lineTo(roseTipX, roseTipBot);
  ctx.lineTo(spoutTipX, spoutTipBot);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = TOOL_PAL.iron;
  ctx.beginPath();
  ctx.moveTo(spoutTipX + s * 0.004, spoutTipTop + s * 0.008);
  ctx.lineTo(roseTipX - s * 0.013, roseTipTop + s * 0.014);
  ctx.lineTo(roseTipX - s * 0.013, roseTipBot - s * 0.014);
  ctx.lineTo(spoutTipX + s * 0.004, spoutTipBot - s * 0.008);
  ctx.closePath();
  ctx.fill();

  // rose front cap
  ctx.fillStyle = TOOL_PAL.ironDeep;
  ctx.fillRect(roseTipX - s * 0.013, roseTipTop, s * 0.013, roseTipBot - roseTipTop);

  // rose top highlight
  ctx.fillStyle = TOOL_PAL.ironHi;
  ctx.beginPath();
  ctx.moveTo(spoutTipX + s * 0.004, spoutTipTop + s * 0.012);
  ctx.lineTo(roseTipX - s * 0.013, roseTipTop + s * 0.02);
  ctx.lineTo(roseTipX - s * 0.013, roseTipTop + s * 0.034);
  ctx.lineTo(spoutTipX + s * 0.004, spoutTipTop + s * 0.024);
  ctx.closePath();
  ctx.fill();

  // rose holes
  if (s >= 20) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    [0.02, 0.07, 0.12, 0.17, 0.22].forEach((p) => {
      ctx.beginPath();
      ctx.arc(roseTipX - s * 0.0065, bodyY + s * p, Math.max(0.7, s * 0.014), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // water visible inside body
  if (s >= 28) {
    ctx.fillStyle = TOOL_PAL.water;
    ctx.fillRect(bodyX + s * 0.04, bodyY + s * 0.035, bodyW - s * 0.08, s * 0.025);
    ctx.fillStyle = TOOL_PAL.waterHi;
    ctx.fillRect(bodyX + s * 0.06, bodyY + s * 0.042, bodyW - s * 0.18, s * 0.008);
  }

  // drip from rose
  if (s >= 20) {
    ctx.fillStyle = TOOL_PAL.water;
    ctx.fillRect(roseTipX - s * 0.006, roseTipBot, s * 0.012, s * 0.05);
    ctx.beginPath();
    ctx.ellipse(roseTipX, roseTipBot + s * 0.07, s * 0.014, s * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TOOL_PAL.waterHi;
    ctx.beginPath();
    ctx.arc(roseTipX - s * 0.002, roseTipBot + s * 0.065, s * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 6. IRON SWORD — diagonal blade, brass crossguard, leather grip, pommel
// ─────────────────────────────────────────────────────────────────────────
export function drawIronSword(ctx, x, y, s) {
  const cx = x + s / 2, cy = y + s / 2;
  groundShadow(ctx, cx, y + s * 0.94, s * 0.26, s * 0.04);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ANG);

  const L = s * 0.92;
  const halfL = L / 2;
  const bladeLen = L * 0.62;
  const bladeBase = -halfL + bladeLen;
  const bladeW = s * 0.075;

  // Blade — tapered diamond
  ctx.fillStyle = metalGradient(ctx, 0, -bladeW, 0, bladeW, TOOL_PAL.ironDk, TOOL_PAL.iron, TOOL_PAL.ironHi);
  ctx.beginPath();
  ctx.moveTo(-halfL, 0);
  ctx.lineTo(-halfL + bladeLen * 0.92, -bladeW);
  ctx.lineTo(bladeBase, -bladeW * 0.7);
  ctx.lineTo(bladeBase, bladeW * 0.7);
  ctx.lineTo(-halfL + bladeLen * 0.92, bladeW);
  ctx.closePath();
  ctx.fill();

  // Fuller (center stripe)
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-halfL + s * 0.06, -s * 0.01, bladeLen - s * 0.08, s * 0.012);
  // upper edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-halfL + s * 0.03, -bladeW * 0.85);
  ctx.lineTo(-halfL + bladeLen * 0.92, -bladeW * 0.85);
  ctx.lineTo(bladeBase - s * 0.005, -bladeW * 0.55);
  ctx.closePath();
  ctx.fill();
  // lower edge shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(-halfL + s * 0.03, bladeW * 0.85);
  ctx.lineTo(-halfL + bladeLen * 0.92, bladeW * 0.85);
  ctx.lineTo(bladeBase - s * 0.005, bladeW * 0.55);
  ctx.closePath();
  ctx.fill();

  // Crossguard
  ctx.fillStyle = TOOL_PAL.brassDk;
  ctx.fillRect(bladeBase - s * 0.02, -s * 0.16, s * 0.05, s * 0.32);
  ctx.fillStyle = TOOL_PAL.brass;
  ctx.fillRect(bladeBase - s * 0.01, -s * 0.16, s * 0.03, s * 0.32);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(bladeBase - s * 0.01, -s * 0.16, s * 0.03, s * 0.05);

  // Grip
  const gripStart = bladeBase + s * 0.03;
  const gripEnd = halfL - s * 0.05;
  ctx.fillStyle = TOOL_PAL.grip;
  ctx.fillRect(gripStart, -s * 0.045, gripEnd - gripStart, s * 0.09);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(gripStart, -s * 0.045, gripEnd - gripStart, s * 0.025);
  if (s >= 24) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(0.8, s * 0.012);
    const n = s >= 48 ? 5 : 3;
    for (let i = 1; i <= n; i++) {
      const lx = gripStart + ((gripEnd - gripStart) * i) / (n + 1);
      ctx.beginPath();
      ctx.moveTo(lx, -s * 0.045);
      ctx.lineTo(lx, s * 0.045);
      ctx.stroke();
    }
  }

  // Pommel
  ctx.fillStyle = TOOL_PAL.brassDk;
  ctx.beginPath();
  ctx.arc(halfL - s * 0.025, 0, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TOOL_PAL.brass;
  ctx.beginPath();
  ctx.arc(halfL - s * 0.03, -s * 0.005, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(halfL - s * 0.045, -s * 0.022, s * 0.022, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
// 7. HAMMER — chunky iron head, leather grip (demolition mallet)
// ─────────────────────────────────────────────────────────────────────────
export function drawHammer(ctx, x, y, s) {
  const cx = x + s / 2;
  groundShadow(ctx, cx, y + s * 0.93, s * 0.32, s * 0.05);

  drawShaft(ctx, x, y, s, { length: 0.78, thickness: 0.085, gripLen: 0.36 });

  ctx.save();
  ctx.translate(cx, cyMid(y, s));
  ctx.rotate(ANG);
  const L = s * 0.78;
  const hx = -L / 2;

  const headW = s * 0.34;
  const headH = s * 0.18;

  // Collar
  ctx.fillStyle = TOOL_PAL.woodDark;
  ctx.fillRect(hx + s * 0.02, -s * 0.05, s * 0.06, s * 0.1);

  // Head
  ctx.fillStyle = metalGradient(ctx, 0, -headH / 2, 0, headH / 2, TOOL_PAL.ironDk, TOOL_PAL.iron, TOOL_PAL.ironHi);
  ctx.fillRect(hx - headW * 0.6, -headH / 2, headW, headH);

  // Bands at each end
  ctx.fillStyle = TOOL_PAL.ironDeep;
  ctx.fillRect(hx - headW * 0.6, -headH / 2, s * 0.025, headH);
  ctx.fillRect(hx + headW * 0.4 - s * 0.025, -headH / 2, s * 0.025, headH);

  // Striking face highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(hx - headW * 0.6 + s * 0.025, -headH / 2 + s * 0.012, s * 0.018, headH - s * 0.024);

  // Top edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(hx - headW * 0.55, -headH / 2, headW * 0.92, s * 0.018);

  // Bottom shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(hx - headW * 0.55, headH / 2 - s * 0.022, headW * 0.92, s * 0.022);

  // Wedge in head (where haft is driven through)
  if (s >= 24) {
    ctx.fillStyle = TOOL_PAL.woodDark;
    ctx.fillRect(hx + s * 0.07, -s * 0.04, s * 0.025, s * 0.08);
    ctx.fillStyle = TOOL_PAL.woodLight;
    ctx.fillRect(hx + s * 0.072, -s * 0.04, s * 0.008, s * 0.08);
  }

  ctx.restore();
}
