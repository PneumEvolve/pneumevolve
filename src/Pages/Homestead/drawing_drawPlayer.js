// src/Pages/Homestead/drawing_drawPlayer.js
//
// ONE drawPlayer for the whole game. Replaces five drifting copies that
// previously lived in HomesteadView, ForestRun, MiningRun, FruitRun, and
// drawWorld.js — each with a slightly different positional signature.
//
// New call shape (options bag):
//   drawPlayer(ctx, x, y, {
//     facing, step, character, weapon, heldItem, t,
//     invincible, attackFlash, jumpZ, isPartner,
//   })
//
// All keys are optional. The function merges every feature the old copies
// had:
//   - attackFlash         body recolour + arm extension (was run-only)
//   - invincible blink    (was run-only; homestead just dimmed)
//   - jumpZ               (was homestead-only)
//   - isPartner           subtle alpha (was homestead-only)
//   - weapon / heldItem   ITEMS[id].draw if present, else emoji fallback
//
// Backward-compat positional shims (drawPlayerLegacyRun, drawPlayerLegacyHome)
// are exported so the runs can be migrated one file at a time without a
// flag day. Once every call site is using the options bag, the shims can
// be deleted.

import { ITEMS, ITEM_ICONS, EQUIPPABLE } from "./Items";

const SKINS   = { light:"#f5c5a3", medium:"#d4956a", tan:"#c07840", brown:"#8b5a2b", dark:"#5a3018" };
const OUTFITS = {
  blue:["#5b8dd9","#3a6abf"], green:["#5a9a4a","#3a7a2a"], red:["#c05040","#8a2820"],
  purple:["#7a5ab0","#5a3a8a"], orange:["#d07830","#a05010"], teal:["#4a9a8a","#2a7a6a"],
};
const HAIRS   = { short:"#7a4f2a", long:"#3a2010", curly:"#c88040", braid:"#884020" };
const HATS_C  = { cap:"#5a3a8a", straw:"#d4a855", beanie:"#c05040" };

export function drawPlayer(ctx, px, py, opts = {}) {
  const {
    facing      = "down",
    step        = 0,
    character   = null,
    weapon      = null,
    heldItem    = null,
    t           = 0,
    invincible  = 0,
    attackFlash = 0,
    jumpZ       = 0,
    isPartner   = false,
  } = opts;

  // Old run versions used to bail out completely while blinking. Keep that.
  const blink = invincible > 0 && Math.floor(t * 8) % 2 === 0;
  if (blink) return;

  const bobY  = (step === 1 || step === 3) ? -1 : 0;
  const legSw = (step === 1 || step === 3) ?  3 : 0;
  const jy    = jumpZ || 0;

  const { skin = "light", outfit = "blue", hair = "short", hat = "none" } = character || {};
  const skinCol  = SKINS[skin]   || "#f5c5a3";
  const [bodyCol, legCol] = OUTFITS[outfit] || ["#5b8dd9","#3a6abf"];
  const hairCol  = HAIRS[hair]   || "#7a4f2a";
  const flashCol = "#88ccff";

  if (isPartner) ctx.globalAlpha = 0.85;

  // Shadow stays on the ground regardless of jump
  const shadowScale = Math.max(0.3, 1 - Math.abs(jy) / 80);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();

  const pyJ = py + jy;

  // Legs
  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, pyJ + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, pyJ + 2, 5, 9 - legSw);

  // Body — flash blue while attacking
  ctx.fillStyle = attackFlash > 0 ? flashCol : bodyCol;
  ctx.fillRect(px - 7, pyJ - 10 + bobY, 14, 13);

  // Arms — extended toward facing during attack, normal walk-cycle otherwise
  const armSw = attackFlash > 0 ? 6 : (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = attackFlash > 0 ? flashCol : bodyCol;
  if (attackFlash > 0 && facing === "right") {
    ctx.fillRect(px + 7,  pyJ - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px - 10, pyJ - 9  + bobY - armSw, 3, 8);
  } else if (attackFlash > 0 && facing === "left") {
    ctx.fillRect(px - 17, pyJ - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px + 7,  pyJ - 9  + bobY - armSw, 3, 8);
  } else {
    ctx.fillRect(px - 10, pyJ - 9 + bobY + armSw, 3, 8);
    ctx.fillRect(px + 7,  pyJ - 9 + bobY - armSw, 3, 8);
  }

  // Head + hair + hat + face
  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, pyJ - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, pyJ - 22 + bobY, 14, 5);
  if (hat !== "none" && HATS_C[hat]) {
    ctx.fillStyle = HATS_C[hat];
    if (hat === "cap")    { ctx.fillRect(px - 8, pyJ - 27 + bobY, 16, 6); ctx.fillRect(px - 10, pyJ - 28 + bobY, 20, 3); }
    if (hat === "straw")  { ctx.beginPath(); ctx.ellipse(px, pyJ - 27 + bobY, 12, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px - 6, pyJ - 35 + bobY, 12, 10); }
    if (hat === "beanie") { ctx.beginPath(); ctx.arc(px, pyJ - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
  }
  if (facing === "down") {
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(px - 4, pyJ - 16 + bobY, 3, 3);
    ctx.fillRect(px + 1, pyJ - 16 + bobY, 3, 3);
    ctx.fillRect(px - 2, pyJ - 12 + bobY, 4, 2);
  } else if (facing === "left") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px - 5, pyJ - 16 + bobY, 3, 3);
  } else if (facing === "right") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px + 2, pyJ - 16 + bobY, 3, 3);
  }

  // Held item — weapon (legacy) or heldItem (active hotbar slot)
  const displayItem = weapon || heldItem;
  if (displayItem) {
    const handX = facing === "left" ? px - 14 : px + 14;
    const handY = pyJ - 8 + bobY + (attackFlash > 0 ? -4 : 0);
    const heldItemData = ITEMS[displayItem];
    const facingRight = facing === "right";
    const size = 14;
    ctx.save();
    if (facingRight) {
      ctx.translate(handX, handY);
      ctx.scale(-1, 1);
      ctx.translate(-handX, -handY);
    }
    if (heldItemData?.draw) {
      heldItemData.draw(ctx, handX - size / 2, handY - size / 2, size);
    } else {
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const icon = ITEM_ICONS[displayItem] ?? EQUIPPABLE[displayItem]?.icon ?? "📦";
      ctx.fillText(icon, handX, handY);
    }
    ctx.restore();
  }

  if (isPartner) ctx.globalAlpha = 1;
}

// ─── Legacy positional shims ─────────────────────────────────────────────────
// Kept so the codebase can migrate one file at a time. Delete once nothing
// references them.

// Old run signature: (ctx, px, py, facing, step, invincible, attackFlash, t, character, weapon, jumpZ?)
export function drawPlayerLegacyRun(ctx, px, py, facing, step, invincible, attackFlash, t, character, weapon, jumpZ = 0) {
  drawPlayer(ctx, px, py, { facing, step, invincible, attackFlash, t, character, weapon, jumpZ });
}

// Old homestead signature: (ctx, px, py, facing, step, character, t, jumpZ, isPartner, heldItem)
export function drawPlayerLegacyHome(ctx, px, py, facing, step, character, t = 0, jumpZ = 0, isPartner = false, heldItem = null) {
  drawPlayer(ctx, px, py, { facing, step, character, t, jumpZ, isPartner, heldItem });
}
