// src/Pages/Homestead/HomesteadView.jsx
// Game loop, interaction handling, and React UI overlays.
// All drawing lives in drawWorld.js.
// All item data lives in Items.js.
// All world-state mutations (farming, nodes) live in useHomesteadState.js.
//
// INVENTORY MODEL (v2):
//   playerInventory  — { items: { [id]: qty }, slots: number }   personal, per-player, saved locally
//   chest            — { [id]: qty }                              shared between partners, no slot cap
//   hotbarSlots      — number (2 base, upgradeable)               how many hotbar cells are active

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  TILE, WORLD_COLS, WORLD_ROWS,
  T, OBJ,
  buildTileMap, defaultObjects, tileNoise,
  moveEntity, updateCamera, findInteractTarget,
  PLAYER_W, PLAYER_H,
  HAIR_STYLES, SKIN_TONES, OUTFIT_COLORS, HAT_STYLES,
  defaultCharacter,
  updateNPCs, findNearbyNPC, NPC_ROSTER,
  REL_THRESHOLDS, REL_TIER_LABEL, NPC_LIKED_GIFTS,
  getBonusDialogLines, getQuestBonusItem,
  REL_GIFT_COOLDOWN_MS, REL_GAIN_QUEST_DELIVER, REL_GAIN_GIFT_LIKED, REL_GAIN_GIFT_NEUTRAL,
} from "./gameEngine";
import {
  ITEMS, ITEM_ICONS, ITEM_LABELS,
  EQUIPPABLE, HOTBAR_ITEMS, RECIPES, STATION_RECIPES, PLACEABLES, SEEDS, UPGRADES,
  emptyEquipment, getEquipStats, getWeaponDurability,
  HOTBAR_SIZE, emptyHotbar,
  INVENTORY_BASE_SLOTS, INVENTORY_MAX_SLOTS, HOTBAR_BASE_SLOTS, HOTBAR_MAX_SLOTS,
  canCraft, craftItem, canCraftAtStation, craftItemAtStation,
  canCraftFromChest, craftItemFromChest,
  canCraftAtStationFromChest, craftItemAtStationFromChest,
  expandedStationRecipes, resolveRecipeKey,
  canCraftAtStationByKey, craftItemAtStationByKey,
  canCraftAtStationByKeyFromChest, craftItemAtStationByKeyFromChest,
  usedSlots, canFitItem, spendFromPlayerInventory, applyUpgrade,
  mergeIntoChest, spendFromChest, normalizeChest, chestToMap,
  CHEST_COLS, CHEST_ROWS, CHEST_SLOTS, canFitInChest,
  QUEST_REWARD_DEFS, getPriceWithRewards, getMarenDiscountActive,
  getUnlockedItemIds,
} from "./Items";
import {
  drawTile, drawObject, drawCrop,
  drawPlayer, drawHUD, drawGhostPlacement,
  drawTownArea, drawWaterDrop,
} from "./drawWorld";
import { useHomesteadState } from "./useHomesteadState";
import { useHearthroom } from "./useHearthroom";
import { ItemIcon } from "./ItemIcon";

// ─── Partner widget ───────────────────────────────────────────────────────────
function PartnerWidget({ joinCode, partnerOnline }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(joinCode); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <div style={{ position:"absolute", top:38, right:12, zIndex:8, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, fontFamily:"monospace", userSelect:"none", pointerEvents:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:9, color:"rgba(220,200,160,0.4)" }}>{partnerOnline?"partner online":"partner offline"}</span>
        <div style={{ width:8, height:8, borderRadius:"50%", background:partnerOnline?"rgba(80,200,120,0.8)":"rgba(180,120,80,0.45)", boxShadow:partnerOnline?"0 0 6px rgba(80,200,120,0.5)":"none" }} />
      </div>
      <button onClick={copy} style={{ background:"rgba(10,18,6,0.82)", border:"1px solid rgba(200,180,100,0.2)", borderRadius:7, padding:"4px 10px", cursor:"pointer", color:"rgba(200,230,120,0.75)", fontSize:12, fontFamily:"monospace", letterSpacing:"0.14em", lineHeight:1 }}>
        {copied?"copied ✓":joinCode}
      </button>
    </div>
  );
}

// ─── Sell Toast Stack ────────────────────────────────────────────────────────
const SELL_TOAST_STYLE = `
@keyframes sellToastIn {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes sellToastOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
`;
let _sellToastStyleInjected = false;
function injectSellToastStyle() {
  if (_sellToastStyleInjected) return;
  _sellToastStyleInjected = true;
  const el = document.createElement("style");
  el.textContent = SELL_TOAST_STYLE;
  document.head.appendChild(el);
}

const TOAST_DURATION_MS = 2000;
const TOAST_FADE_MS     = 400;

function SellToastStack({ toasts }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 90,
      right: 16,
      zIndex: 999,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 6,
      pointerEvents: "none",
      alignItems: "flex-end",
    }}>
      {toasts.map(t => {
        const elapsed = Date.now() - t.addedAt;
        const fading  = elapsed > TOAST_DURATION_MS - TOAST_FADE_MS;
        return (
          <div key={t.id} style={{
            background: "rgba(10,20,8,0.92)",
            border: "1px solid rgba(200,230,120,0.35)",
            borderRadius: 10,
            padding: "8px 14px",
            fontFamily: "monospace",
            fontSize: 12,
            color: "rgba(200,230,120,0.95)",
            boxShadow: "0 4px 18px rgba(0,0,0,0.55)",
            whiteSpace: "nowrap",
            animation: fading
              ? `sellToastOut ${TOAST_FADE_MS}ms ease forwards`
              : `sellToastIn 200ms ease`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            <span>
              Sold{" "}
              <span style={{ color: "rgba(255,220,100,0.95)" }}>
                {t.qty > 1 ? `${t.qty}× ` : ""}{t.label}
              </span>
              {" for "}
              <span style={{ color: "rgba(100,230,160,0.95)" }}>+{t.gold}g</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Run Join Prompt ──────────────────────────────────────────────────────────
const RUN_TYPE_INFO = {
  forest:  { icon:"🌲", label:"Forest Run" },
  mining:  { icon:"⛏️", label:"Mining Run" },
  fruit:   { icon:"🍎", label:"Fruit Picking" },
  fishing: { icon:"🎣", label:"Fishing Trip" },
};
function RunJoinPrompt({ runType, onJoin, onDecline }) {
  const info = RUN_TYPE_INFO[runType] ?? RUN_TYPE_INFO.forest;
  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(4,10,4,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20 }}>
      <div style={{ background:"#141e0e", border:"1px solid rgba(200,230,120,0.25)", borderRadius:16, padding:"28px 32px", maxWidth:300, width:"90%", fontFamily:"monospace", color:"#f5e6c8", textAlign:"center", display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:8 }}>partner is heading out</p>
          <h2 style={{ fontSize:22, fontWeight:400, color:"rgba(200,230,120,0.9)" }}>{info.icon} {info.label}</h2>
          <p style={{ fontSize:12, color:"rgba(245,230,200,0.45)", marginTop:8, lineHeight:1.6 }}>Join them for a co-op run?</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={onJoin} style={{ padding:"13px", borderRadius:10, border:"1px solid rgba(200,230,120,0.35)", background:"rgba(200,230,120,0.1)", color:"rgba(200,230,120,0.95)", fontSize:13, fontFamily:"monospace", cursor:"pointer" }}>join the run →</button>
          <button onClick={onDecline} style={{ padding:"9px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace", cursor:"pointer" }}>stay home</button>
        </div>
      </div>
    </div>
  );
}


// ─── Sleep Modal ─────────────────────────────────────────────────────────────
// sleepPhase values:
//   'confirm'            — local player pressed [F] on house; waiting for their confirm
//   'waiting_partner'    — local confirmed; waiting for partner to also confirm
//   'partner_requesting' — partner pressed [F]; local player must confirm to proceed
//   'both_ready'         — both players ready; host executes sleep then broadcasts
function SleepModal({ phase, partnerOnline, onConfirm, onCancel }) {
  if (!phase) return null;

  const overlay = {
    position:"absolute", inset:0, background:"rgba(4,10,20,0.82)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:30,
  };
  const box = {
    background:"#0d1320", border:"1px solid rgba(120,160,220,0.3)", borderRadius:18,
    padding:"28px 32px", maxWidth:300, width:"90%", fontFamily:"monospace",
    color:"#f5e6c8", textAlign:"center", display:"flex", flexDirection:"column", gap:16,
    boxShadow:"0 24px 80px rgba(0,0,0,0.7)",
  };
  const btn = (accent) => ({
    padding:"12px", borderRadius:10, cursor:"pointer", fontFamily:"monospace",
    fontSize:13, border:`1px solid ${accent}`, background:`${accent}22`, color:accent,
  });

  if (phase === 'confirm') {
    return (
      <div style={overlay}>
        <div style={box}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(160,200,255,0.45)", textTransform:"uppercase", marginBottom:8 }}>end the day</p>
            <h2 style={{ fontSize:22, fontWeight:400, color:"rgba(180,210,255,0.9)" }}>🌙 Go to sleep?</h2>
            <p style={{ fontSize:12, color:"rgba(245,230,200,0.45)", marginTop:8, lineHeight:1.6 }}>
              {partnerOnline ? "Both players must be ready. Your partner will be prompted too." : "You'll sleep through to the next day."}
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button style={btn("rgba(180,210,255,0.9)")} onClick={onConfirm}>sleep →</button>
            <button style={{ ...btn("rgba(255,255,255,0.25)"), fontSize:12 }} onClick={onCancel}>stay up</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'waiting_partner') {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(160,200,255,0.45)", textTransform:"uppercase" }}>waiting for partner</p>
          <h2 style={{ fontSize:20, fontWeight:400, color:"rgba(180,210,255,0.9)" }}>🌙 Waiting for your partner…</h2>
          <svg width="48" height="48" style={{ margin:"0 auto", animation:"spin 1.4s linear infinite" }}>
            <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(120,160,220,0.15)" strokeWidth="4"/>
            <path d="M24 4 A20 20 0 0 1 44 24" fill="none" stroke="rgba(180,210,255,0.85)" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <button style={{ ...btn("rgba(255,255,255,0.25)"), fontSize:12 }} onClick={onCancel}>cancel</button>
        </div>
      </div>
    );
  }

  if (phase === 'partner_requesting') {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(160,200,255,0.45)", textTransform:"uppercase" }}>your partner wants to sleep</p>
          <h2 style={{ fontSize:20, fontWeight:400, color:"rgba(180,210,255,0.9)" }}>🌙 End the day?</h2>
          <p style={{ fontSize:12, color:"rgba(245,230,200,0.45)", lineHeight:1.6 }}>Your partner is ready to sleep. Join them?</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button style={btn("rgba(180,210,255,0.9)")} onClick={onConfirm}>sleep together →</button>
            <button style={{ ...btn("rgba(255,255,255,0.25)"), fontSize:12 }} onClick={onCancel}>not yet</button>
          </div>
        </div>
      </div>
    );
  }

  // both_ready — show a brief "sleeping…" flash (executes quickly)
  return (
    <div style={overlay}>
      <div style={box}>
        <h2 style={{ fontSize:22, fontWeight:400, color:"rgba(180,210,255,0.9)" }}>🌙 Sleeping…</h2>
      </div>
    </div>
  );
}

// ─── Run Locked Modal ─────────────────────────────────────────────────────────
function RunLockedModal({ onClose }) {
  return (
    <div style={{
      position:"absolute", inset:0, background:"rgba(4,8,4,0.80)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:30,
    }}>
      <div style={{
        background:"#0d1a10", border:"1px solid rgba(200,230,120,0.18)", borderRadius:18,
        padding:"28px 32px", maxWidth:300, width:"90%", fontFamily:"monospace",
        color:"#f5e6c8", textAlign:"center", display:"flex", flexDirection:"column", gap:16,
        boxShadow:"0 24px 80px rgba(0,0,0,0.7)",
      }}>
        <div>
          <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:8 }}>run used</p>
          <h2 style={{ fontSize:22, fontWeight:400, color:"rgba(200,230,120,0.85)", marginBottom:0 }}>🌙 Already ran today</h2>
          <p style={{ fontSize:12, color:"rgba(245,230,200,0.45)", marginTop:10, lineHeight:1.7 }}>
            You've used your run for the day. Head to the house and sleep to reset.
          </p>
        </div>
        {/* Visual sleep hint */}
        <div style={{
          display:"flex", alignItems:"center", gap:10, justifyContent:"center",
          background:"rgba(120,160,255,0.06)", border:"1px solid rgba(120,160,255,0.15)",
          borderRadius:10, padding:"10px 14px",
        }}>
          <span style={{ fontSize:20 }}>🏠</span>
          <span style={{ fontSize:11, color:"rgba(180,210,255,0.6)", lineHeight:1.5, textAlign:"left" }}>
            Press <span style={{ color:"rgba(180,210,255,0.9)", fontWeight:700 }}>[F]</span> at the house<br/>to go to sleep
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            padding:"11px", borderRadius:10, cursor:"pointer", fontFamily:"monospace",
            fontSize:12, border:"1px solid rgba(255,255,255,0.1)",
            background:"transparent", color:"rgba(255,255,255,0.3)",
          }}
        >
          ok
        </button>
      </div>
    </div>
  );
}

// ─── Town Panel ───────────────────────────────────────────────────────────────
function TownPanel({ playerInventory, chest, gold, activeRewards, marenDiscountActive, unlockedItemIds, onBuyToInventory, onBuyToChest, onSellFromInventory, onSellFromChest, onSellToast, onClose }) {
  const [msg, setMsg] = useState(null);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2000); };
  const [sellFrom, setSellFrom] = useState("inventory"); // "inventory" | "chest"

  const rewards = activeRewards ?? [];
  const hasPriceReward = rewards.some(r => QUEST_REWARD_DEFS[r]?.effect?.type === "price_multiplier");

  /**
   * Apply Maren's market-stall 10% discount on top of any quest-reward prices.
   * Sell price +10%, buy price −10% (minimum 1g).
   */
  const applyMarenDiscount = (price, priceType) => {
    if (!marenDiscountActive) return price;
    if (priceType === "sell") return Math.round(price * 1.10);
    return Math.max(1, Math.round(price * 0.90));
  };

  // Only show items that are unlocked by arrived NPCs (items without unlockedByNpc are always shown)
  const buyable = Object.entries(ITEMS).filter(([id, it]) =>
    it.buyPrice != null && (!unlockedItemIds || unlockedItemIds.has(id))
  );
  const playerItems = Object.entries(playerInventory?.items ?? {}).filter(([id, qty]) => qty > 0 && ITEMS[id]?.sellPrice != null);
  const chestItems  = Object.entries(chestToMap(normalizeChest(chest))).filter(([id, qty]) => qty > 0 && ITEMS[id]?.sellPrice != null);
  const sellable = sellFrom === "inventory" ? playerItems : chestItems;

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(4,10,4,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:25 }} onClick={onClose}>
      <div style={{ background:"#111a0b", border:"1px solid rgba(200,180,80,0.3)", borderRadius:18, width:480, maxWidth:"96vw", maxHeight:"88vh", display:"flex", flexDirection:"column", fontFamily:"monospace", color:"#f5e6c8", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:2 }}>Millhaven Market</p>
            <h2 style={{ fontSize:18, fontWeight:400, color:"rgba(200,230,120,0.9)" }}>🛒 Market {hasPriceReward && <span style={{ fontSize:10, color:"rgba(100,220,160,0.8)", marginLeft:6 }}>📈 Better Prices</span>}{marenDiscountActive && <span style={{ fontSize:10, color:"rgba(160,230,180,0.85)", marginLeft:6 }}>🏪 Maren's discount</span>}</h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:15, color:"rgba(255,215,0,0.9)", fontFamily:"monospace" }}>🪙 {gold ?? 0}g</span>
            <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace", cursor:"pointer", padding:"3px 9px" }}>✕</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>for sale</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {buyable.map(([id, it]) => {
                const rewardBuy = getPriceWithRewards(id, "buy", rewards) ?? it.buyPrice;
                const effectiveBuy = applyMarenDiscount(rewardBuy, "buy");
                const canAfford = (gold ?? 0) >= effectiveBuy;
                const invFull = !canFitItem(playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS }, id);
                const discounted = effectiveBuy < it.buyPrice;
                return (
                  <div key={id} style={{ padding:"10px 12px", borderRadius:10, display:"flex", alignItems:"center", gap:10, background:canAfford?"rgba(200,230,120,0.05)":"rgba(255,255,255,0.02)", border:`1px solid ${canAfford?"rgba(200,230,120,0.18)":"rgba(255,255,255,0.06)"}`, opacity:canAfford?1:0.5 }}>
                    <span style={{ fontSize:22 }}>{it.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{it.label}</div>
                      <div style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>{it.description}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end" }}>
                      <button disabled={!canAfford || invFull} onClick={() => { onBuyToInventory?.(id, effectiveBuy); flash(`Bought ${it.label}!`); }} style={{ padding:"4px 8px", borderRadius:5, fontSize:9, fontFamily:"monospace", cursor:canAfford&&!invFull?"pointer":"default", border:`1px solid ${canAfford&&!invFull?"rgba(200,230,120,0.3)":"rgba(255,255,255,0.05)"}`, background:canAfford&&!invFull?"rgba(200,230,120,0.1)":"transparent", color:canAfford&&!invFull?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)" }}>
                        🎒 {discounted && <span style={{ textDecoration:"line-through", opacity:0.45, marginRight:2 }}>{it.buyPrice}</span>}{effectiveBuy}g
                      </button>
                      <button disabled={!canAfford} onClick={() => { onBuyToChest?.(id, effectiveBuy); flash(`Bought ${it.label} → chest!`); }} style={{ padding:"4px 8px", borderRadius:5, fontSize:9, fontFamily:"monospace", cursor:canAfford?"pointer":"default", border:`1px solid ${canAfford?"rgba(180,200,100,0.2)":"rgba(255,255,255,0.05)"}`, background:canAfford?"rgba(180,200,100,0.06)":"transparent", color:canAfford?"rgba(180,200,100,0.7)":"rgba(255,255,255,0.2)" }}>
                        📦 {discounted && <span style={{ textDecoration:"line-through", opacity:0.45, marginRight:2 }}>{it.buyPrice}</span>}{effectiveBuy}g
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {(playerItems.length > 0 || chestItems.length > 0) && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase" }}>sell to market</p>
                <div style={{ display:"flex", gap:4 }}>
                  {["inventory","chest"].map(src => (
                    <button key={src} onClick={() => setSellFrom(src)} style={{ fontSize:9, fontFamily:"monospace", padding:"3px 8px", borderRadius:5, cursor:"pointer", background:sellFrom===src?"rgba(200,230,120,0.12)":"transparent", border:`1px solid ${sellFrom===src?"rgba(200,230,120,0.4)":"rgba(255,255,255,0.1)"}`, color:sellFrom===src?"rgba(200,230,120,0.9)":"rgba(245,230,200,0.4)" }}>
                      {src === "inventory" ? "🎒 mine" : "📦 chest"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                {sellable.map(([id, qty]) => {
                  const it = ITEMS[id];
                  const rewardSell = getPriceWithRewards(id, "sell", rewards) ?? it.sellPrice;
                  const effectiveSell = applyMarenDiscount(rewardSell, "sell");
                  const boosted = effectiveSell > it.sellPrice;
                  return (
                    <div key={id} style={{ padding:"10px 12px", borderRadius:10, display:"flex", alignItems:"center", gap:10, background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.15)" }}>
                      <span style={{ fontSize:22 }}>{it.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"rgba(255,210,100,0.85)" }}>{it.label}</div>
                        <div style={{ fontSize:10, color:"rgba(245,230,200,0.3)" }}>×{qty}</div>
                      </div>
                      <button onClick={() => { (sellFrom === "inventory" ? onSellFromInventory : onSellFromChest)?.(id, effectiveSell); onSellToast?.({ icon: it.icon, label: it.label, qty: 1, gold: effectiveSell }); }} style={{ padding:"5px 10px", borderRadius:6, fontSize:10, fontFamily:"monospace", cursor:"pointer", border:"1px solid rgba(255,200,80,0.3)", background:"rgba(255,200,80,0.08)", color:boosted?"rgba(100,230,160,0.95)":"rgba(255,210,100,0.9)" }}>
                        +{effectiveSell}g{boosted && <span style={{ fontSize:8, marginLeft:2, opacity:0.7 }}>↑</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:"8px 18px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          {marenDiscountActive && (
            <div style={{ fontSize:9, color:"rgba(160,230,180,0.75)", letterSpacing:"0.10em", display:"flex", alignItems:"center", gap:5 }}>
              <span>🏪</span>
              <span>Maren's discount active · sell +10% · buy −10%</span>
            </div>
          )}
          <div style={{ fontSize:9, color:"rgba(245,230,200,0.2)", textAlign:"center" }}>
            🎒 buy to inventory · 📦 buy to chest · [F] or click outside to close
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Treasury Panel ───────────────────────────────────────────────────────────
function TreasuryPanel({ town, playerInventory, onPlayerInventoryUpdate, onClose }) {
  const [msg, setMsg] = useState(null);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };
  const treasury = town?.townState?.treasury ?? {};
  const totalFood = Object.values(treasury).reduce((s, q) => s + q, 0);
  const residents = (town?.townState?.npcs ?? []).filter(n => !n.waitingAtBorder).length;
  const foodItems = Object.entries(playerInventory?.items ?? {})
    .filter(([id, qty]) => qty > 0 && ITEMS[id]?.useEffect?.heal);

  const depositAll = () => {
    if (!foodItems.length) return;
    const toDeposit = {};
    foodItems.forEach(([id, qty]) => { toDeposit[id] = qty; });
    town?.depositToTreasury(toDeposit);
    const newItems = { ...(playerInventory?.items ?? {}) };
    foodItems.forEach(([id]) => { delete newItems[id]; });
    onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
    flash("Food deposited into the treasury!");
  };

  const depositOne = (id, qty) => {
    town?.depositToTreasury({ [id]: qty });
    const newItems = { ...(playerInventory?.items ?? {}) };
    newItems[id] = (newItems[id] ?? 0) - qty;
    if (newItems[id] <= 0) delete newItems[id];
    onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
    flash(`Deposited ${ITEMS[id]?.label ?? id}!`);
  };

  const panelStyle = { position:"absolute", inset:0, background:"rgba(4,10,4,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:25 };
  const boxStyle = { background:"#111a0b", border:"1px solid rgba(200,180,80,0.3)", borderRadius:18, width:400, maxWidth:"96vw", maxHeight:"85vh", display:"flex", flexDirection:"column", fontFamily:"monospace", color:"#f5e6c8", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.7)" };

  return (
    <div style={panelStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:2 }}>Town</p>
            <h2 style={{ fontSize:18, fontWeight:400, color:"rgba(200,230,120,0.9)" }}>🏛️ Treasury</h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace", cursor:"pointer", padding:"3px 9px" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:16 }}>
          {/* Status */}
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(200,230,120,0.05)", border:"1px solid rgba(200,230,120,0.15)" }}>
              <p style={{ fontSize:9, color:"rgba(200,230,160,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>food stocked</p>
              <p style={{ fontSize:20, color:"rgba(200,230,120,0.9)" }}>{totalFood}</p>
            </div>
            <div style={{ flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(200,230,120,0.05)", border:"1px solid rgba(200,230,120,0.15)" }}>
              <p style={{ fontSize:9, color:"rgba(200,230,160,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>residents</p>
              <p style={{ fontSize:20, color:"rgba(200,230,120,0.9)" }}>{residents}</p>
            </div>
          </div>
          {/* Stocked food */}
          {totalFood > 0 && (
            <div>
              <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>currently stocked</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {Object.entries(treasury).filter(([,q])=>q>0).map(([id, qty]) => (
                  <div key={id} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(200,230,120,0.07)", border:"1px solid rgba(200,230,120,0.2)", display:"flex", alignItems:"center", gap:6 }}>
                    <ItemIcon id={id} size={20} />
                    <span style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label ?? id}</span>
                    <span style={{ fontSize:11, color:"rgba(245,230,200,0.5)" }}>×{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Deposit from inventory */}
          {foodItems.length > 0 ? (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase" }}>deposit food</p>
                <button onClick={depositAll} style={{ fontSize:9, fontFamily:"monospace", padding:"3px 10px", borderRadius:6, cursor:"pointer", background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)", color:"rgba(200,230,120,0.9)" }}>deposit all</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {foodItems.map(([id, qty]) => (
                  <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:9, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                    <ItemIcon id={id} size={22} />
                    <span style={{ flex:1, fontSize:12, color:"rgba(245,230,200,0.8)" }}>{ITEMS[id]?.label ?? id} ×{qty}</span>
                    <button onClick={() => depositOne(id, qty)} style={{ fontSize:9, fontFamily:"monospace", padding:"3px 8px", borderRadius:5, cursor:"pointer", background:"rgba(200,230,120,0.08)", border:"1px solid rgba(200,230,120,0.2)", color:"rgba(200,230,120,0.8)" }}>deposit</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize:12, color:"rgba(245,230,200,0.3)", textAlign:"center", padding:"12px 0" }}>No food in your inventory to deposit.</p>
          )}
          {msg && <p style={{ fontSize:12, color:"rgba(180,230,120,0.9)", textAlign:"center" }}>{msg}</p>}
          {!town?.townState?.mayorAssigned && totalFood > 0 && (
            <p style={{ fontSize:11, color:"rgba(200,180,80,0.6)", textAlign:"center", lineHeight:1.6 }}>
              Keep the treasury stocked — your first resident will arrive soon.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NPC Dialog Panel ─────────────────────────────────────────────────────────
function NPCDialogPanel({ npc, town, placedObjects, playerInventory, onPlayerInventoryUpdate, gold, onGoldUpdate, onClose }) {
  const [page, setPage] = useState("talk");    // "talk" | "rename" | "assign" | "quest" | "gift"
  const [nameInput, setNameInput] = useState(npc?.name ?? "");
  const [msg, setMsg] = useState(null);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  if (!npc) return null;
  const roster = NPC_ROSTER[npc.npcId] ?? NPC_ROSTER.generic;
  const questItem = roster.questItem;
  const questQty  = roster.questQty ?? 0;
  const questProgress = npc.questProgress ?? 0;
  const questDone = npc.questComplete;
  const playerHasQuestItem = questItem ? ((playerInventory?.items?.[questItem] ?? 0) > 0) : false;

  // Relationship
  const relationship  = npc.relationship ?? 0;
  const tierLabel     = REL_TIER_LABEL(relationship);
  const likedGifts    = NPC_LIKED_GIFTS[npc.npcId] ?? NPC_LIKED_GIFTS.generic;
  const now           = Date.now();
  const lastGift      = npc.lastGiftTime ?? 0;
  const giftOnCooldown = (lastGift + REL_GIFT_COOLDOWN_MS) > now;
  const cooldownHrsLeft = giftOnCooldown
    ? Math.ceil(((lastGift + REL_GIFT_COOLDOWN_MS) - now) / (1000 * 60 * 60))
    : 0;

  // Relationship hearts display (0–5 filled)
  const heartsFilled = Math.round((relationship / 100) * 5);
  const heartsRow = Array.from({ length: 5 }, (_, i) =>
    <span key={i} style={{ fontSize:11, color: i < heartsFilled ? "rgba(255,100,100,0.9)" : "rgba(255,255,255,0.15)" }}>♥</span>
  );

  // Completed reward info
  const completedRewardDef = questDone && roster.questReward
    ? (QUEST_REWARD_DEFS[roster.questReward] ?? null)
    : null;

  // Dialog lines — base + bonus dialog gated behind relationship
  const BASE_DIALOGUE = {
    generic:  ["Nice place you've got here.", "I'm still settling in, but it already feels like home.", "Let me know if there's anything I can do to help."],
    maren:    ["These goods won't sell themselves.", "I've been in worse markets. This one has potential.", "Bring me something rare and I'll make it worth your while."],
    finn:     ["...", "The water's calm today.", "Something big is out there. I can feel it."],
    petra:    ["Good iron. Finally.", "Bring me ore and I'll make you something that lasts.", "I don't make things pretty. I make things that work."],
    elda:     ["The roots here run deep.", "These herbs... interesting. Very interesting.", "There are things in this land that haven't been disturbed in a long time."],
    sable:    ["This soil is incredible! Do you know what you could grow here?", "I've been planning the layout of a proper farm. Can I show you?", "My last harvest was three pumpkins the size of your head."],
    clem:     ["Have you eaten? You look like you haven't eaten.", "I made too much stew again. Surprise, surprise.", "Tell me what you've been finding out there and I'll figure out how to cook it."],
    rowan:    ["This land has a history. I intend to find it.", "Do you know when this area was first settled?", "I found something in the east corner. Come find me later."],
    bex:      ["Don't worry about where I came from.", "I'm good at a lot of things. Put me to work.", "...nice try."],
    haas:     ["The bees are happy today. Good sign.", "Slow down a little. That's my only advice.", "Honey takes time. Everything worth having does."],
  };
  const baseLines  = BASE_DIALOGUE[npc.npcId] ?? BASE_DIALOGUE.generic;
  const bonusLines = getBonusDialogLines(npc.npcId, relationship);
  const allLines   = [...baseLines, ...bonusLines];
  const line       = allLines[Math.floor(Date.now() / 8000) % allLines.length];

  // Giftable items — any item in player inventory (gifts: all items are valid, liked = more ♥)
  const giftableItems = Object.entries(playerInventory?.items ?? {}).filter(([, qty]) => qty > 0);

  const panelStyle = { position:"absolute", inset:0, background:"rgba(4,10,4,0.82)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:25, paddingBottom:90 };
  const boxStyle   = { background:"#111a0b", border:"1px solid rgba(200,180,80,0.25)", borderRadius:16, width:420, maxWidth:"96vw", fontFamily:"monospace", color:"#f5e6c8", boxShadow:"0 24px 80px rgba(0,0,0,0.7)" };

  const tierColor = relationship >= REL_THRESHOLDS.CLOSE      ? "rgba(255,160,100,0.9)"
                  : relationship >= REL_THRESHOLDS.FRIENDLY   ? "rgba(100,230,160,0.85)"
                  : relationship >= REL_THRESHOLDS.ACQUAINTED ? "rgba(160,210,255,0.8)"
                  : "rgba(245,230,200,0.3)";

  return (
    <div style={panelStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:"14px 18px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>{roster.icon ?? "🧑"}</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, color:"rgba(200,230,120,0.95)", fontWeight:400 }}>{npc.name}</p>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
              <p style={{ fontSize:10, color:"rgba(245,230,200,0.35)", letterSpacing:"0.1em" }}>
                {npc.assignment ? `working · ${npc.assignment.replace(/_/g," ")}` : "unassigned"}
                {" · "}
                {npc.mood === "happy" ? "😊" : npc.mood === "unhappy" ? "😟" : "😐"}
              </p>
              <span style={{ fontSize:9, color:tierColor, letterSpacing:"0.08em" }}>{tierLabel}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:3 }}>
              {heartsRow}
              <span style={{ fontSize:9, color:"rgba(245,230,200,0.25)", marginLeft:4 }}>{relationship}/100</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.3)", fontSize:12, fontFamily:"monospace", cursor:"pointer", padding:"3px 9px" }}>✕</button>
        </div>

        {/* Nav */}
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          {["talk","rename","assign","gift", ...(questItem ? ["quest"] : [])].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ flex:1, padding:"8px 4px", background:page===p?"rgba(200,230,120,0.08)":"transparent", border:"none", borderBottom:page===p?"2px solid rgba(200,230,120,0.5)":"2px solid transparent", color:page===p?"rgba(200,230,120,0.9)":"rgba(245,230,200,0.35)", fontSize:10, fontFamily:"monospace", cursor:"pointer", letterSpacing:"0.1em", textTransform:"uppercase" }}>
              {p}{p === "quest" && questDone ? " ✓" : ""}
            </button>
          ))}
        </div>

        <div style={{ padding:"16px 18px 18px", minHeight:120 }}>
          {/* Talk */}
          {page === "talk" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ fontSize:13, color:"rgba(245,230,200,0.75)", lineHeight:1.8, fontStyle:"italic" }}>"{line}"</p>
              {/* Relationship tier unlock notice */}
              {bonusLines.length > 0 && (
                <p style={{ fontSize:9, color:tierColor, opacity:0.7 }}>
                  {tierLabel === "Close" ? "💞" : tierLabel === "Friendly" ? "🤝" : "✨"} {tierLabel} — new things to say unlocked.
                </p>
              )}
              {/* Preferred-job nudge */}
              {(() => {
                const preferred = roster.preferredJob;
                if (!preferred) return null;
                const alreadyAssigned = npc.assignment === preferred;
                if (alreadyAssigned) return null;
                const buildingExists = Array.isArray(placedObjects)
                  ? placedObjects.some(o => o.type === preferred)
                  : false;
                const buildingLabel = preferred.replace(/_/g, " ");
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(200,180,60,0.07)", border:"1px solid rgba(200,180,60,0.22)" }}>
                    <span style={{ fontSize:18 }}>💼</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, color:"rgba(220,200,100,0.9)", lineHeight:1.5 }}>
                        {npc.name} would like to work the {buildingLabel}.
                      </p>
                      {!buildingExists && (
                        <p style={{ fontSize:10, color:"rgba(245,230,200,0.35)", marginTop:2 }}>
                          (build a {buildingLabel} first)
                        </p>
                      )}
                    </div>
                    <button
                      disabled={!buildingExists || npc.assignment === preferred}
                      onClick={() => { town?.assignNPC(npc.id, preferred); flash(`${npc.name} assigned to ${buildingLabel}!`); }}
                      style={{ padding:"6px 12px", borderRadius:7, fontSize:10, fontFamily:"monospace", cursor:buildingExists?"pointer":"default", background:buildingExists?"rgba(200,230,120,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${buildingExists?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.1)"}`, color:buildingExists?"rgba(200,230,120,0.9)":"rgba(245,230,200,0.25)", whiteSpace:"nowrap" }}>
                      assign →
                    </button>
                  </div>
                );
              })()}
              {msg && <p style={{ fontSize:11, color:"rgba(180,230,120,0.9)" }}>{msg}</p>}
            </div>
          )}

          {/* Rename */}
          {page === "rename" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <p style={{ fontSize:11, color:"rgba(245,230,200,0.4)" }}>Give them a new name.</p>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") { town?.renameNPC(npc.id, nameInput); flash("Name updated!"); } }}
                maxLength={24}
                style={{ padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(200,230,120,0.25)", color:"#f5e6c8", fontSize:13, fontFamily:"monospace", outline:"none" }}
              />
              <button onClick={() => { town?.renameNPC(npc.id, nameInput); flash("Name updated!"); }} style={{ padding:"8px", borderRadius:8, background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)", color:"rgba(200,230,120,0.9)", fontSize:12, fontFamily:"monospace", cursor:"pointer" }}>
                confirm name
              </button>
              {msg && <p style={{ fontSize:11, color:"rgba(180,230,120,0.9)" }}>{msg}</p>}
            </div>
          )}

          {/* Assign */}
          {page === "assign" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ fontSize:11, color:"rgba(245,230,200,0.4)", marginBottom:4 }}>Assign to a building, or leave them free to wander.</p>
              {roster.preferredJob && (
                <p style={{ fontSize:10, color:"rgba(200,180,80,0.6)" }}>Prefers: {roster.preferredJob.replace(/_/g," ")}</p>
              )}
              {!town?.townState?.mayorAssigned && (
                <button onClick={() => { town?.assignMayor(npc.id); flash("Mayor assigned! Town buildings unlocked."); setPage("talk"); }}
                  style={{ padding:"9px 14px", borderRadius:8, background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.3)", color:"rgba(255,215,0,0.9)", fontSize:12, fontFamily:"monospace", cursor:"pointer", textAlign:"left" }}>
                  👑 Assign as Mayor · Town Hall
                </button>
              )}
              <button onClick={() => { town?.assignNPC(npc.id, null); flash("Unassigned."); }} style={{ padding:"8px 14px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(245,230,200,0.5)", fontSize:11, fontFamily:"monospace", cursor:"pointer", textAlign:"left" }}>
                unassign (free wander)
              </button>
              {msg && <p style={{ fontSize:11, color:"rgba(180,230,120,0.9)", marginTop:4 }}>{msg}</p>}
            </div>
          )}

          {/* Gift */}
          {page === "gift" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {/* Relationship bar */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${relationship}%`, background: relationship >= REL_THRESHOLDS.CLOSE ? "rgba(255,140,80,0.7)" : relationship >= REL_THRESHOLDS.FRIENDLY ? "rgba(100,230,160,0.65)" : relationship >= REL_THRESHOLDS.ACQUAINTED ? "rgba(140,180,255,0.65)" : "rgba(200,230,120,0.45)", borderRadius:3, transition:"width 0.4s" }} />
                </div>
                <span style={{ fontSize:10, color:tierColor, minWidth:72 }}>{tierLabel} · {relationship}/100</span>
              </div>

              {/* Next tier hint */}
              {relationship < 100 && (() => {
                const nextThreshold = relationship < REL_THRESHOLDS.ACQUAINTED ? REL_THRESHOLDS.ACQUAINTED
                  : relationship < REL_THRESHOLDS.FRIENDLY ? REL_THRESHOLDS.FRIENDLY
                  : relationship < REL_THRESHOLDS.CLOSE ? REL_THRESHOLDS.CLOSE : null;
                const nextLabel = nextThreshold === REL_THRESHOLDS.ACQUAINTED ? "Acquainted"
                  : nextThreshold === REL_THRESHOLDS.FRIENDLY ? "Friendly"
                  : nextThreshold === REL_THRESHOLDS.CLOSE ? "Close" : null;
                if (!nextLabel) return null;
                return (
                  <p style={{ fontSize:9, color:"rgba(245,230,200,0.3)", lineHeight:1.5 }}>
                    {nextThreshold - relationship} more ♥ to reach <span style={{ color:"rgba(200,230,120,0.6)" }}>{nextLabel}</span>
                    {nextThreshold >= REL_THRESHOLDS.FRIENDLY && (
                      <span style={{ color:"rgba(200,180,60,0.55)" }}> — unlocks bonus dialog {nextThreshold >= REL_THRESHOLDS.FRIENDLY ? "& items" : ""}</span>
                    )}
                  </p>
                );
              })()}

              {/* Cooldown notice */}
              {giftOnCooldown && (
                <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(255,180,60,0.06)", border:"1px solid rgba(255,180,60,0.2)" }}>
                  <p style={{ fontSize:11, color:"rgba(255,190,80,0.8)" }}>
                    Already gave a gift today. Come back in ~{cooldownHrsLeft}h.
                  </p>
                </div>
              )}

              {/* Liked items hint */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:9, color:"rgba(245,230,200,0.3)" }}>likes:</span>
                {likedGifts.map(id => (
                  <span key={id} style={{ fontSize:11, padding:"2px 7px", borderRadius:5, background:"rgba(255,100,100,0.08)", border:"1px solid rgba(255,100,100,0.2)", color:"rgba(255,160,160,0.8)" }}>
                    {ITEMS[id]?.icon ?? "?"} {ITEMS[id]?.label ?? id}
                  </span>
                ))}
              </div>

              {/* Gift items from inventory */}
              {giftableItems.length === 0 ? (
                <p style={{ fontSize:12, color:"rgba(245,230,200,0.3)", textAlign:"center", padding:"10px 0" }}>Nothing in your inventory to give.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:180, overflowY:"auto" }}>
                  {giftableItems.map(([id, qty]) => {
                    const it = ITEMS[id];
                    if (!it) return null;
                    const isLiked = likedGifts.includes(id);
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:8, background: isLiked ? "rgba(255,100,100,0.06)" : "rgba(255,255,255,0.03)", border:`1px solid ${isLiked ? "rgba(255,100,100,0.22)" : "rgba(255,255,255,0.07)"}` }}>
                        <span style={{ fontSize:18 }}>{it.icon}</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:12, color: isLiked ? "rgba(255,180,180,0.9)" : "rgba(245,230,200,0.7)" }}>{it.label}</span>
                          {isLiked && <span style={{ fontSize:9, color:"rgba(255,120,120,0.7)", marginLeft:6 }}>loved ♥+{REL_GAIN_GIFT_LIKED}</span>}
                          {!isLiked && <span style={{ fontSize:9, color:"rgba(200,230,120,0.4)", marginLeft:6 }}>♥+{REL_GAIN_GIFT_NEUTRAL}</span>}
                        </div>
                        <span style={{ fontSize:10, color:"rgba(245,230,200,0.3)" }}>×{qty}</span>
                        <button
                          disabled={giftOnCooldown}
                          onClick={() => {
                            if (giftOnCooldown) return;
                            const result = town?.giftNPC(npc.id, id);
                            if (!result) return;
                            if (!result.accepted) {
                              flash(`${npc.name} can't receive another gift just yet.`);
                              return;
                            }
                            // Deduct 1 from inventory
                            const newItems = { ...(playerInventory?.items ?? {}) };
                            newItems[id] = (newItems[id] ?? 0) - 1;
                            if (newItems[id] <= 0) delete newItems[id];
                            onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
                            flash(result.isLiked
                              ? `${npc.name} loves it! ♥ +${result.relGain}`
                              : `${npc.name} accepts your gift. ♥ +${result.relGain}`
                            );
                          }}
                          style={{ padding:"5px 10px", borderRadius:7, fontSize:10, fontFamily:"monospace", cursor:giftOnCooldown?"default":"pointer", background:giftOnCooldown?"rgba(255,255,255,0.04)":isLiked?"rgba(255,100,100,0.12)":"rgba(200,230,120,0.1)", border:`1px solid ${giftOnCooldown?"rgba(255,255,255,0.08)":isLiked?"rgba(255,100,100,0.3)":"rgba(200,230,120,0.25)"}`, color:giftOnCooldown?"rgba(255,255,255,0.2)":isLiked?"rgba(255,180,180,0.9)":"rgba(200,230,120,0.9)", opacity:giftOnCooldown?0.5:1 }}>
                          give
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {msg && <p style={{ fontSize:12, color:"rgba(180,230,120,0.9)", marginTop:4 }}>{msg}</p>}
            </div>
          )}

          {/* Quest */}
          {page === "quest" && questItem && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {questDone ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(100,220,160,0.07)", border:"1px solid rgba(100,220,160,0.25)", display:"flex", flexDirection:"column", gap:6 }}>
                    <p style={{ fontSize:12, color:"rgba(100,220,160,0.95)", fontWeight:"bold" }}>
                      {completedRewardDef?.icon ?? "✅"} Quest complete!
                    </p>
                    {completedRewardDef && (
                      <p style={{ fontSize:11, color:"rgba(200,240,200,0.85)", lineHeight:1.6 }}>
                        <strong style={{ color:"rgba(150,240,200,0.95)" }}>{completedRewardDef.label}</strong> — {completedRewardDef.description}
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>{questProgress} / {questQty} delivered</p>
                </div>
              ) : (
                <>
                  {roster.questReward && QUEST_REWARD_DEFS[roster.questReward] && (
                    <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(200,180,60,0.06)", border:"1px solid rgba(200,180,60,0.18)" }}>
                      <p style={{ fontSize:10, color:"rgba(200,180,60,0.7)", lineHeight:1.5 }}>
                        <strong>{QUEST_REWARD_DEFS[roster.questReward].icon} Reward: </strong>
                        {QUEST_REWARD_DEFS[roster.questReward].description}
                      </p>
                    </div>
                  )}
                  {/* Bonus item hint based on relationship */}
                  {(() => {
                    const bonusItemId = getQuestBonusItem(npc.npcId, relationship);
                    if (!bonusItemId) {
                      const friendlyBonus = getQuestBonusItem(npc.npcId, REL_THRESHOLDS.FRIENDLY);
                      if (!friendlyBonus) return null;
                      return (
                        <p style={{ fontSize:9, color:"rgba(200,180,60,0.45)", lineHeight:1.5 }}>
                          Become <span style={{ color:"rgba(100,230,160,0.7)" }}>Friendly</span> with {npc.name} to earn a bonus item on completion.
                        </p>
                      );
                    }
                    const bonusItem = ITEMS[bonusItemId];
                    return (
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:7, background:"rgba(255,160,80,0.06)", border:"1px solid rgba(255,160,80,0.2)" }}>
                        <span style={{ fontSize:14 }}>{bonusItem?.icon ?? "🎁"}</span>
                        <p style={{ fontSize:10, color:"rgba(255,180,100,0.85)" }}>
                          {tierLabel} bonus: you'll receive <strong>{bonusItem?.label ?? bonusItemId}</strong> on completion!
                        </p>
                      </div>
                    );
                  })()}
                  <p style={{ fontSize:11, color:"rgba(245,230,200,0.5)", lineHeight:1.7 }}>
                    {npc.name} is looking for <strong style={{ color:"rgba(200,230,120,0.9)" }}>{ITEMS[questItem]?.label ?? questItem}</strong>.
                  </p>
                  <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(questProgress/questQty)*100}%`, background:"rgba(200,230,120,0.6)", borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                  <p style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>{questProgress} / {questQty} delivered · ♥ +{REL_GAIN_QUEST_DELIVER} per item</p>
                  {playerHasQuestItem && (
                    <button onClick={() => {
                      const qty = Math.min(playerInventory?.items?.[questItem] ?? 0, questQty - questProgress);
                      if (qty <= 0) return;
                      const result = town?.deliverQuestItem(npc.id, qty);
                      const newItems = { ...(playerInventory?.items ?? {}) };
                      newItems[questItem] = (newItems[questItem] ?? 0) - qty;
                      if (newItems[questItem] <= 0) delete newItems[questItem];
                      onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
                      if (result?.questComplete) {
                        const rewardDef = result.rewardId ? QUEST_REWARD_DEFS[result.rewardId] : null;
                        const goldBonus = rewardDef?.goldBonus ?? 0;
                        if (goldBonus > 0 && onGoldUpdate) onGoldUpdate((gold ?? 0) + goldBonus);
                        // Bonus item for high-relationship players
                        const bonusItemId = getQuestBonusItem(npc.npcId, relationship);
                        if (bonusItemId) {
                          const newItemsWithBonus = { ...newItems };
                          newItemsWithBonus[bonusItemId] = (newItemsWithBonus[bonusItemId] ?? 0) + 1;
                          onPlayerInventoryUpdate?.({ ...playerInventory, items: newItemsWithBonus });
                        }
                        const rewardLabel = rewardDef ? `${rewardDef.icon} ${rewardDef.label} unlocked!` : "Quest complete!";
                        const bonusLabel  = bonusItemId ? ` + ${ITEMS[bonusItemId]?.icon ?? "🎁"} ${ITEMS[bonusItemId]?.label ?? bonusItemId}` : "";
                        flash(`🎉 ${rewardLabel}${goldBonus > 0 ? ` +${goldBonus}g` : ""}${bonusLabel}`);
                      } else {
                        flash(`Delivered ${qty}! ♥ +${Math.min(qty, questQty - (questProgress)) * REL_GAIN_QUEST_DELIVER}`);
                      }
                    }} style={{ padding:"9px", borderRadius:8, background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)", color:"rgba(200,230,120,0.9)", fontSize:12, fontFamily:"monospace", cursor:"pointer" }}>
                      hand over {ITEMS[questItem]?.icon} {ITEMS[questItem]?.label}
                    </button>
                  )}
                </>
              )}
              {msg && <p style={{ fontSize:12, color:"rgba(180,230,120,0.9)" }}>{msg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hotbar Bar ───────────────────────────────────────────────────────────────
// Shows only `visibleSlots` cells. The rest of the hotbar array still exists
// (so saved data isn't lost on upgrade) but is hidden.
function HotbarBar({ hotbar, hotbarSlots, equipment, selectedIdx, onSelectIdx, onOpenMenu, onUseSlot }) {
  const visible = Math.min(hotbarSlots, HOTBAR_SIZE);
  return (
    <div style={{ position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:3, zIndex:5, pointerEvents:"auto" }}>
      {Array.from({ length: visible }).map((_, idx) => {
        const slot = (hotbar ?? [])[idx];
        const isEquipped = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot] === slot?.item;
        const isSelected = idx === selectedIdx;
        const icon = slot ? (ITEM_ICONS[slot.item] ?? "📦") : null;
        const category = slot ? ITEMS[slot.item]?.category : null;
        let borderColor = "rgba(255,255,255,0.1)";
        if (isSelected)  borderColor = "rgba(255,220,60,0.85)";
        else if (isEquipped) borderColor = "rgba(100,200,255,0.6)";
        else if (slot)   borderColor = "rgba(200,230,120,0.35)";
        return (
          <div key={idx} onClick={() => slot ? onUseSlot?.(idx) : onOpenMenu("inventory")}
            style={{ width:44, height:52, borderRadius:8, cursor:"pointer",
              background: slot ? "rgba(10,18,6,0.92)" : "rgba(10,18,6,0.55)",
              border: `2px solid ${borderColor}`,
              boxShadow: isSelected ? "0 0 10px rgba(255,210,40,0.35), inset 0 0 6px rgba(255,210,40,0.08)" : "none",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", gap:1,
              transform: isSelected ? "translateY(-3px)" : "none",
              transition: "transform 0.1s, box-shadow 0.1s, border-color 0.1s",
            }}>
            {isSelected && slot && (
              <div style={{ position:"absolute", top:-16, left:"50%", transform:"translateX(-50%)", fontSize:8, color:"rgba(255,220,60,0.8)", whiteSpace:"nowrap", fontFamily:"monospace", letterSpacing:"0.06em", pointerEvents:"none" }}>
                {category==="food"?"🍴 eat":category==="placeable"?"🏗 place":EQUIPPABLE[slot.item]?"⚔ equip":category==="tool"?"⚡ use":""}
              </div>
            )}
            {slot ? (
              <>
                <ItemIcon id={slot.item} size={22} />
                <span style={{ fontSize:8, color:"rgba(200,230,120,0.65)", lineHeight:1, fontFamily:"monospace", maxWidth:40, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {ITEMS[slot.item]?.label?.toLowerCase().slice(0,6) ?? slot.item}
                </span>
                {slot.qty != null && <span style={{ fontSize:9, color:"rgba(200,230,120,0.8)", lineHeight:1, marginTop:1 }}>{slot.qty}</span>}
                {isEquipped && <div style={{ position:"absolute", top:2, right:2, width:6, height:6, borderRadius:"50%", background:"rgba(100,200,255,0.95)" }} />}
              </>
            ) : (
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.12)", fontFamily:"monospace" }}>{idx+1}</span>
            )}
          </div>
        );
      })}
      <div onClick={() => onOpenMenu("inventory")} style={{ marginLeft:8, width:36, height:36, borderRadius:8, cursor:"pointer", background:"rgba(10,18,6,0.7)", border:"1px solid rgba(200,230,120,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(200,230,120,0.5)", fontSize:10, fontFamily:"monospace" }} title="Open menu (Tab)">⊞</div>
    </div>
  );
}

// ─── Unified Tab Menu ─────────────────────────────────────────────────────────
const TABS = [
  { id:"inventory",  label:"My Bag",    icon:"🎒" },
  { id:"chest",      label:"Chest",     icon:"📦" },
  { id:"crafting",   label:"Crafting",  icon:"🔨" },
  { id:"equipment",  label:"Equipment", icon:"⚔️"  },
  { id:"farming",    label:"Farming",   icon:"🌱" },
  { id:"character",  label:"Character", icon:"🧑"  },
];

function StatPill({ label, value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:6, background:"rgba(200,230,120,0.06)", border:"1px solid rgba(200,230,120,0.15)" }}>
      <span style={{ fontSize:9, color:"rgba(200,230,160,0.45)", letterSpacing:"0.1em" }}>{label}</span>
      <span style={{ fontSize:12, color:color??"rgba(200,230,120,0.9)" }}>{value}</span>
    </div>
  );
}

function TabMenu({
  activeTab, onTabChange, onClose,
  playerInventory, onPlayerInventoryUpdate,
  hotbarSlots, onHotbarSlotsUpdate,
  chest, onChestUpdate,
  equipment, onEquipItem,
  hotbar, onHotbarChange,
  onCraftWithInventory,
  character, onCharacterUpdate,
  onStartGhostPlace,
  farmPlots,
  atCraftingStation,
  unlockedItemIds,
}) {
  const [craftMsg, setCraftMsg]  = useState(null);
  const [ch, setCh]              = useState({ ...character });
  const [dragOverSlot, setDragOver] = useState(null);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const playerItems = playerInventory?.items ?? {};
  // Items in the hotbar are stored separately — don't count them as inventory slots
  const hotbarItemIds = new Set((hotbar ?? []).filter(Boolean).map(s => s.item));
  const usedSlotsCount = Object.entries(playerItems).filter(([k, v]) => v > 0 && !hotbarItemIds.has(k)).length;
  const totalSlots = playerInventory?.slots ?? INVENTORY_BASE_SLOTS;

  // Block spacebar scroll while menu open
  useEffect(() => {
    const block = (e) => { if (e.key===" "||e.code==="Space") e.preventDefault(); };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current, content = contentRef.current;
    if (!overlay || !content) return;
    const blockOverlay = (e) => e.preventDefault();
    overlay.addEventListener("wheel", blockOverlay, { passive:false });
    const handleContent = (e) => {
      const atTop = content.scrollTop <= 0, atBottom = content.scrollTop+content.clientHeight >= content.scrollHeight-1;
      if ((e.deltaY < 0 && !atTop)||(e.deltaY > 0 && !atBottom)) e.stopPropagation();
    };
    content.addEventListener("wheel", handleContent, { passive:true });
    return () => { overlay.removeEventListener("wheel", blockOverlay); content.removeEventListener("wheel", handleContent); };
  }, []);

  function assignToHotbarSlot(itemId, slotIdx) {
    const qty = (playerItems[itemId] ?? 0) > 0 ? playerItems[itemId] : undefined;
    const newHotbar = [...(hotbar ?? [])];
    const displaced = newHotbar[slotIdx]; // item previously in this slot
    newHotbar[slotIdx] = qty != null ? { item:itemId, qty } : { item:itemId };
    // Move item out of inventory
    const newItems = { ...(playerInventory?.items ?? {}) };
    if (newItems[itemId] > 0) delete newItems[itemId];
    // Return displaced item to inventory (if it was a different item)
    if (displaced?.item && displaced.item !== itemId) {
      newItems[displaced.item] = (newItems[displaced.item] ?? 0) + (displaced.qty ?? 1);
    }
    onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
    onHotbarChange?.(newHotbar);
  }

  // ── Hotbar drop zone (shown in My Bag tab) ──────────────────────────────────
  function HotbarDropZone() {
    const visible = Math.min(hotbarSlots, HOTBAR_SIZE);
    return (
      <div style={{ padding:"10px 20px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#0f1709" }}>
        <p style={{ fontSize:9, color:"rgba(245,230,200,0.22)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:7 }}>hotbar — drag any item onto a slot</p>
        <div style={{ display:"flex", gap:5 }}>
          {Array.from({ length: visible }).map((_, idx) => {
            const slot = (hotbar ?? [])[idx];
            const isOver = dragOverSlot===idx, isEq = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot]===slot?.item;
            return (
              <div key={idx}
                onDrop={e=>{e.preventDefault();const raw=e.dataTransfer.getData("chest_drag");if(raw){try{const cd=JSON.parse(raw);if(cd.zone==="chest"){setDragOver(null);return;}}catch{}};const n=e.dataTransfer.getData("hotbar_item");if(n)assignToHotbarSlot(n,idx);setDragOver(null);}}
                onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";setDragOver(idx);}}
                onDragLeave={()=>setDragOver(null)}
                style={{ width:50, height:54, borderRadius:9, background:isOver?"rgba(200,230,120,0.18)":slot?"rgba(10,18,6,0.7)":"rgba(255,255,255,0.03)", border:`2px solid ${isOver?"rgba(200,230,120,0.9)":isEq?"rgba(100,200,255,0.5)":slot?"rgba(200,230,120,0.3)":"rgba(255,255,255,0.1)"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, position:"relative", transition:"all 0.1s" }}>
                {slot ? (
                  <>
                    <ItemIcon id={slot.item} size={22} />
                    <span style={{ fontSize:8, color:"rgba(200,230,120,0.6)", lineHeight:1, fontFamily:"monospace", maxWidth:46, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ITEMS[slot.item]?.label?.toLowerCase()?.slice(0,6)??slot.item}</span>
                    {slot.qty!=null&&<span style={{ fontSize:9, color:"rgba(200,230,120,0.7)" }}>{slot.qty}</span>}
                    {isEq&&<div style={{ position:"absolute", top:3, right:3, width:6, height:6, borderRadius:"50%", background:"rgba(100,200,255,0.9)" }}/>}
                    <button onClick={()=>{const n=[...(hotbar??[])];const s=n[idx];n[idx]=null;onHotbarChange?.(n);if(s?.item){const ni={...(playerInventory?.items??{}),[s.item]:(playerInventory?.items?.[s.item]??0)+(s.qty??1)};onPlayerInventoryUpdate?.({...playerInventory,items:ni})}}} style={{ position:"absolute", top:-5, right:-5, width:15, height:15, borderRadius:"50%", background:"rgba(255,80,80,0.8)", border:"none", color:"#fff", fontSize:9, cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize:isOver?18:11, color:isOver?"rgba(200,230,120,0.7)":"rgba(255,255,255,0.12)", fontFamily:"monospace" }}>{isOver?"+":idx+1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Tab: My Bag (player personal inventory) ─────────────────────────────────
  function InventoryTab() {
    const allItems = Object.entries(playerItems).filter(([,v])=>v>0);
    const resources   = allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]&&!PLACEABLES[k]&&!UPGRADES[k]);
    const consumables = allItems.filter(([k])=>!!HOTBAR_ITEMS[k]);
    const gear        = allItems.filter(([k])=>!!EQUIPPABLE[k]);
    const upgrades    = allItems.filter(([k])=>!!UPGRADES[k]);
    const placeables  = allItems.filter(([k])=>!!PLACEABLES[k]);

    const itemStyle = { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, cursor:"grab", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", userSelect:"none" };

    function depositToChest(itemId, qty) {
      const newItems = { ...playerItems, [itemId]: (playerItems[itemId] ?? 0) - qty };
      if (newItems[itemId] <= 0) delete newItems[itemId];
      onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
      onChestUpdate?.(mergeIntoChest(normalizeChest(chest), { [itemId]: qty }));
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Slot capacity bar */}
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(200,230,120,0.04)", border:"1px solid rgba(200,230,120,0.12)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:10, color:"rgba(200,230,120,0.5)", letterSpacing:"0.1em", textTransform:"uppercase" }}>inventory</span>
            <span style={{ fontSize:11, color: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.9)" : "rgba(200,230,120,0.7)", fontFamily:"monospace" }}>{usedSlotsCount}/{totalSlots} slots</span>
          </div>
          <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(usedSlotsCount/totalSlots)*100}%`, background: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.7)" : "rgba(200,230,120,0.6)", transition:"width 0.3s" }} />
          </div>
          {usedSlotsCount >= totalSlots && (
            <p style={{ fontSize:10, color:"rgba(255,120,80,0.7)", marginTop:6 }}>Bag full — craft a Traveler's Pouch to expand, or deposit items to the chest.</p>
          )}
        </div>

        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>bag is empty — go on a run!</p>}

        {resources.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Resources</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:6 }}>
              {resources.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", cursor:"grab" }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9, color:"rgba(245,230,200,0.4)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:15, color:"rgba(200,230,120,0.9)" }}>{qty}</div>
                  </div>
                  <button title="Deposit to chest" onClick={() => depositToChest(id, qty)} style={{ fontSize:10, background:"rgba(180,200,100,0.1)", border:"1px solid rgba(180,200,100,0.2)", borderRadius:5, color:"rgba(180,200,100,0.8)", cursor:"pointer", padding:"2px 5px" }}>📦</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Consumables</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {consumables.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  onClick={()=>{const ei=hotbar?.findIndex(s=>!s)??-1;const si=ei>=0?ei:0;if(si<hotbarSlots){const nh=[...(hotbar??[])];nh[si]={item:id,qty};onHotbarChange?.(nh);}}}
                  style={{ ...itemStyle, background:"rgba(255,200,80,0.07)", border:"1px solid rgba(255,200,80,0.25)" }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>×{qty} · drag → hotbar</div>
                  </div>
                  <button title="Deposit to chest" onClick={e=>{e.stopPropagation();depositToChest(id,qty);}} style={{ fontSize:10, background:"rgba(180,200,100,0.1)", border:"1px solid rgba(180,200,100,0.2)", borderRadius:5, color:"rgba(180,200,100,0.8)", cursor:"pointer", padding:"2px 5px" }}>📦</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {gear.filter(([id])=>EQUIPPABLE[id]?.slot==="weapon").length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Tools &amp; Weapons — drag to hotbar, then select to equip</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {gear.filter(([id])=>EQUIPPABLE[id]?.slot==="weapon").map(([id]) => {
                const isEq = equipment?.weapon===id;
                const inHotbar = (hotbar??[]).some(s=>s?.item===id);
                return (
                  <div key={id}
                    draggable
                    onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                    style={{ ...itemStyle, cursor:"grab", background:"rgba(200,230,120,0.05)", border:`1px solid ${isEq?"rgba(100,200,255,0.45)":"rgba(200,230,120,0.2)"}` }}>
                    <ItemIcon id={id} size={26} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                      <div style={{ fontSize:10, color:isEq?"rgba(100,200,255,0.7)":inHotbar?"rgba(200,230,120,0.55)":"rgba(255,255,255,0.3)" }}>
                        {isEq?"✓ equipped":inHotbar?"in hotbar · select to equip":"drag → hotbar"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gear.filter(([id])=>EQUIPPABLE[id]?.slot!=="weapon").length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Armor &amp; Accessories — click to equip</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {gear.filter(([id])=>EQUIPPABLE[id]?.slot!=="weapon").map(([id]) => {
                const eq = EQUIPPABLE[id]; const isEq = equipment?.[eq?.slot]===id;
                return (
                  <div key={id} onClick={()=>onEquipItem?.(id)} style={{ ...itemStyle, cursor:"pointer", background:"rgba(200,230,120,0.05)", border:"1px solid rgba(200,230,120,0.2)" }}>
                    <ItemIcon id={id} size={26} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                      <div style={{ fontSize:10, color:isEq?"rgba(100,200,255,0.7)":"rgba(255,255,255,0.3)" }}>{isEq?"✓ equipped":"click to equip"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upgrades.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Upgrades — click to apply</p>
            {upgrades.map(([id]) => {
              const it = ITEMS[id]; const eff = UPGRADES[id];
              return (
                <div key={id} onClick={() => {
                  const { inv: newInv, hotbarSlots: newHbs } = applyUpgrade(playerInventory, hotbarSlots, id);
                  onPlayerInventoryUpdate?.(newInv);
                  onHotbarSlotsUpdate?.(newHbs);
                }} style={{ ...itemStyle, cursor:"pointer", background:"rgba(120,80,200,0.08)", border:"1px solid rgba(120,80,200,0.25)" }}>
                  <span style={{ fontSize:22 }}>{it?.icon??"📦"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"rgba(180,150,230,0.9)" }}>{it?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{it?.description}</div>
                  </div>
                  <span style={{ fontSize:11, color:"rgba(120,80,200,0.8)", fontFamily:"monospace" }}>use</span>
                </div>
              );
            })}
          </div>
        )}

        {placeables.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Placeables — drag to hotbar, then use to place</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {placeables.map(([id, qty]) => {
                const it = ITEMS[id];
                return (
                  <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                    style={{ ...itemStyle, background:"rgba(100,180,200,0.06)", border:"1px solid rgba(100,180,200,0.2)" }}>
                    <ItemIcon id={id} size={26} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"rgba(150,220,230,0.9)" }}>{it?.label??id}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>×{qty} · drag → hotbar</div>
                    </div>
                    <button title="Deposit to chest" onClick={e=>{e.stopPropagation();depositToChest(id,qty);}} style={{ fontSize:10, background:"rgba(180,200,100,0.1)", border:"1px solid rgba(180,200,100,0.2)", borderRadius:5, color:"rgba(180,200,100,0.8)", cursor:"pointer", padding:"2px 5px" }}>📦</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Chest (shared, Minecraft-style grid) ───────────────────────────────
  function ChestTab() {
    const chestGrid = normalizeChest(chest);
    const [dragOver, setDragOverState] = React.useState(null); // { zone, idx }
    // Quantity picker state: { zone, idx, cell, anchorRect } | null
    const [qtyPicker, setQtyPicker] = React.useState(null);

    // Build player inventory as a flat grid (slots × 1 cell each, filled from items)
    const totalSlots = playerInventory?.slots ?? INVENTORY_BASE_SLOTS;
    const playerItems = playerInventory?.items ?? {};
    // Expand items into grid slots: one slot per unique item stack
    const invEntries = Object.entries(playerItems).filter(([,v])=>v>0);
    const invGrid = Array(totalSlots).fill(null).map((_, i) =>
      invEntries[i] ? { item: invEntries[i][0], qty: invEntries[i][1] } : null
    );

    // Transfer qty units from srcZone → opposite zone
    function transferQty(srcZone, srcIdx, qty) {
      if (qty <= 0) return;
      const srcCell = srcZone === "chest"
        ? chestGrid[srcIdx]
        : (invEntries[srcIdx] ? { item: invEntries[srcIdx][0], qty: invEntries[srcIdx][1] } : null);
      if (!srcCell) return;

      const safeQty = Math.min(qty, srcCell.qty);
      let cg = chestGrid.slice();
      let ii = { ...playerItems };

      if (srcZone === "chest") {
        // chest → inventory
        const remaining = srcCell.qty - safeQty;
        cg[srcIdx] = remaining > 0 ? { item: srcCell.item, qty: remaining } : null;
        ii[srcCell.item] = (ii[srcCell.item] ?? 0) + safeQty;
      } else {
        // inventory → chest
        const remaining = srcCell.qty - safeQty;
        if (remaining > 0) ii[srcCell.item] = remaining;
        else delete ii[srcCell.item];
        // Find existing chest slot with same item or first empty slot
        const existingIdx = cg.findIndex(c => c?.item === srcCell.item);
        if (existingIdx >= 0) {
          cg[existingIdx] = { item: srcCell.item, qty: cg[existingIdx].qty + safeQty };
        } else {
          const emptyIdx = cg.findIndex(c => !c);
          if (emptyIdx >= 0) cg[emptyIdx] = { item: srcCell.item, qty: safeQty };
        }
      }

      onChestUpdate?.(cg);
      onPlayerInventoryUpdate?.({ ...playerInventory, items: ii });
    }

    function moveItem(src, dst) {
      if (src.zone === dst.zone && src.idx === dst.idx) return;

      // Read source and destination cells
      const srcData = src.zone === "chest"
        ? chestGrid[src.idx]
        : (invEntries[src.idx] ? { item: invEntries[src.idx][0], qty: invEntries[src.idx][1] } : null);
      const dstData = dst.zone === "chest"
        ? chestGrid[dst.idx]
        : (invEntries[dst.idx] ? { item: invEntries[dst.idx][0], qty: invEntries[dst.idx][1] } : null);

      if (!srcData) return;

      let cg = chestGrid.slice();
      let ii = { ...playerItems };

      if (dstData && dstData.item === srcData.item) {
        // ── Stack same item type ──────────────────────────────────────────────
        const total = srcData.qty + dstData.qty;
        // Clear source
        if (src.zone === "chest") cg[src.idx] = null;
        else delete ii[srcData.item];
        // Accumulate at destination
        if (dst.zone === "chest") cg[dst.idx] = { item: dstData.item, qty: total };
        else ii[dstData.item] = total;
      } else {
        // ── Swap ──────────────────────────────────────────────────────────────
        // Place srcData at dst
        if (dst.zone === "chest") {
          cg[dst.idx] = srcData;
        } else {
          // dst is inv: add srcData item, remove dstData item if present
          ii[srcData.item] = srcData.qty;
          if (dstData) delete ii[dstData.item];
        }
        // Place dstData at src (or clear if dstData was null)
        if (src.zone === "chest") {
          cg[src.idx] = dstData; // null clears the slot
        } else {
          // src is inv: remove srcData, add dstData if present
          delete ii[srcData.item];
          if (dstData) ii[dstData.item] = dstData.qty;
        }
      }

      onChestUpdate?.(cg);
      onPlayerInventoryUpdate?.({ ...playerInventory, items: ii });
    }

    function handleDrop(e, dstZone, dstIdx) {
      e.preventDefault();
      const raw = e.dataTransfer.getData("chest_drag");
      if (!raw) return;
      const src = JSON.parse(raw);
      moveItem(src, { zone: dstZone, idx: dstIdx });
      setDragOverState(null);
    }

    const CELL_SIZE = 48;
    const GAP = 4;

    function renderGrid(cells, zone, cols) {
      return (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, ${CELL_SIZE}px)`, gap:GAP }}>
          {cells.map((cell, idx) => {
            const isOver = dragOver?.zone === zone && dragOver?.idx === idx;
            const isSelected = qtyPicker?.zone === zone && qtyPicker?.idx === idx;
            const it = cell ? ITEMS[cell.item] : null;
            return (
              <div key={idx}
                draggable={!!cell}
                onDragStart={e => {
                  setQtyPicker(null);
                  e.dataTransfer.setData("chest_drag", JSON.stringify({ zone, idx }));
                  e.dataTransfer.effectAllowed = "move";
                  // Only allow hotbar drops when dragging from player inventory
                  if (zone === "inv" && cell) e.dataTransfer.setData("hotbar_item", cell.item);
                }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverState({ zone, idx }); }}
                onDragLeave={() => setDragOverState(null)}
                onDrop={e => handleDrop(e, zone, idx)}
                onClick={e => {
                  if (!cell) return;
                  e.stopPropagation();
                  if (isSelected) { setQtyPicker(null); return; }
                  const rect = e.currentTarget.getBoundingClientRect();
                  setQtyPicker({ zone, idx, cell, rect });
                }}
                title={it ? `${it.label} ×${cell.qty}` : "Empty slot"}
                style={{
                  width: CELL_SIZE, height: CELL_SIZE,
                  borderRadius: 7,
                  background: isSelected
                    ? "rgba(200,230,120,0.18)"
                    : isOver
                      ? "rgba(200,230,120,0.22)"
                      : cell
                        ? "rgba(10,20,6,0.85)"
                        : "rgba(255,255,255,0.025)",
                  border: `2px solid ${isSelected ? "rgba(200,230,120,0.9)" : isOver ? "rgba(200,230,120,0.8)" : cell ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.07)"}`,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  position: "relative", cursor: cell ? "pointer" : "default",
                  transition: "all 0.08s",
                  boxSizing: "border-box",
                  userSelect: "none",
                  boxShadow: isSelected ? "0 0 0 2px rgba(200,230,120,0.25)" : "none",
                }}>
                {cell && <>
                  <ItemIcon id={cell.item} size={28} />
                  <span style={{ fontSize: 9, color: "rgba(200,230,120,0.85)", fontFamily: "monospace", lineHeight: 1, marginTop: 1 }}>{cell.qty}</span>
                </>}
              </div>
            );
          })}
        </div>
      );
    }

    const chestUsed = chestGrid.filter(Boolean).length;
    const destLabel = qtyPicker?.zone === "chest" ? "🎒 bag" : "📦 chest";

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }} onClick={() => setQtyPicker(null)}>

        {/* ── Quantity Picker Popup ── */}
        {qtyPicker && (() => {
          const { zone, idx, cell, rect } = qtyPicker;
          const it = ITEMS[cell.item];
          const qty = cell.qty;
          const halfQty = Math.floor(qty / 2);
          const btnStyle = (label) => ({
            padding: "5px 0",
            borderRadius: 7,
            border: "1px solid rgba(200,230,120,0.3)",
            background: "rgba(200,230,120,0.08)",
            color: "rgba(200,230,120,0.95)",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
            fontWeight: 600,
            letterSpacing: "0.04em",
            transition: "background 0.1s, border-color 0.1s",
          });
          return (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "fixed",
                top: rect.top - 90,
                left: rect.left + rect.width / 2,
                transform: "translateX(-50%)",
                zIndex: 999,
                background: "rgba(8,16,4,0.97)",
                border: "1px solid rgba(200,230,120,0.35)",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,230,120,0.08)",
                minWidth: 140,
                display: "flex",
                flexDirection: "column",
                gap: 7,
                pointerEvents: "auto",
                // little arrow pointing down
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
              }}
            >
              {/* Arrow */}
              <div style={{
                position: "absolute",
                bottom: -7,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "7px solid rgba(200,230,120,0.35)",
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <span style={{ fontSize: 18 }}>{it?.icon ?? "📦"}</span>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(200,230,120,0.9)", fontFamily: "monospace", fontWeight: 600 }}>{it?.label ?? cell.item}</div>
                  <div style={{ fontSize: 9, color: "rgba(245,230,200,0.35)", fontFamily: "monospace" }}>×{qty} → {destLabel}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                <button style={btnStyle("1")} onClick={() => { transferQty(zone, idx, 1); setQtyPicker(null); }}>1</button>
                <button
                  style={{ ...btnStyle("half"), opacity: halfQty > 0 ? 1 : 0.3, cursor: halfQty > 0 ? "pointer" : "default" }}
                  disabled={halfQty <= 0}
                  onClick={() => { if (halfQty > 0) { transferQty(zone, idx, halfQty); setQtyPicker(null); } }}
                >half</button>
                <button style={btnStyle("all")} onClick={() => { transferQty(zone, idx, qty); setQtyPicker(null); }}>all</button>
              </div>
            </div>
          );
        })()}

        {/* Chest grid */}
        <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(139,96,44,0.14)", border:"1px solid rgba(180,140,80,0.22)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <p style={{ fontSize:10, color:"rgba(200,180,120,0.6)", letterSpacing:"0.12em", textTransform:"uppercase" }}>📦 shared chest</p>
            <span style={{ fontSize:10, color: chestUsed >= CHEST_SLOTS ? "rgba(255,120,80,0.8)" : "rgba(180,150,80,0.5)", fontFamily:"monospace" }}>{chestUsed}/{CHEST_SLOTS} slots</span>
          </div>
          {renderGrid(chestGrid, "chest", CHEST_COLS)}
        </div>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize:9, color:"rgba(245,230,200,0.25)", fontFamily:"monospace", letterSpacing:"0.1em" }}>click item to transfer · drag to rearrange</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
        </div>

        {/* Player inventory grid */}
        <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(30,50,20,0.5)", border:"1px solid rgba(200,230,120,0.12)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <p style={{ fontSize:10, color:"rgba(200,230,120,0.5)", letterSpacing:"0.12em", textTransform:"uppercase" }}>🎒 your bag</p>
            <span style={{ fontSize:10, color: invEntries.length >= totalSlots ? "rgba(255,120,80,0.8)" : "rgba(200,230,120,0.4)", fontFamily:"monospace" }}>{invEntries.length}/{totalSlots} slots</span>
          </div>
          {renderGrid(invGrid, "inv", CHEST_COLS)}
          {invEntries.length === 0 && <p style={{ textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:8 }}>bag is empty</p>}
        </div>

        <p style={{ fontSize:9, color:"rgba(245,230,200,0.2)", textAlign:"center", fontFamily:"monospace" }}>
          click to pick quantity · drag to rearrange · shared with partner
        </p>
      </div>
    );
  }

  // ── Tab: Crafting ───────────────────────────────────────────────────────────
  function CraftingTab() {
    const [showAll, setShowAll]           = useState(false);
    const [craftableOnly, setCraftableOnly] = useState(false);

    // Crafting reads from player inventory (not chest)
    function handleCraft(name) {
      const newInv = craftItem(name, playerInventory);
      if (newInv) {
        onCraftWithInventory?.(newInv);
        setCraftMsg(`Crafted ${ITEMS[name]?.label??name}!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    function handleCraftAtStation(name) {
      const newInv = craftItemAtStationByKey(name, playerInventory);
      const outputId = resolveRecipeKey(name);
      if (newInv) {
        onCraftWithInventory?.(newInv);
        setCraftMsg(`Crafted ${ITEMS[outputId]?.label??outputId}!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    function handleCraftFromChest(name) {
      const result = craftItemFromChest(name, normalizeChest(chest), playerInventory);
      if (result) {
        onChestUpdate?.(result.newChest);
        onCraftWithInventory?.(result.newInv);
        setCraftMsg(`Crafted ${ITEMS[name]?.label??name} (from chest)!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    function handleCraftAtStationFromChest(name) {
      const outputId = resolveRecipeKey(name);
      const result = craftItemAtStationByKeyFromChest(name, normalizeChest(chest), playerInventory);
      if (result) {
        onChestUpdate?.(result.newChest);
        onCraftWithInventory?.(result.newInv);
        setCraftMsg(`Crafted ${ITEMS[outputId]?.label??outputId} (from chest)!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }

    const stationCraftable = canCraft("crafting_station", playerInventory ?? {});

    // ── Detect if a one-use upgrade has already been applied ────────────────
    // traveler_pouch / explorer_pack → adds inventorySlots → slots > base means already applied
    // belt_pouch / tool_belt → adds hotbarSlots → hotbarSlots > base means already applied
    const invSlotsUsed  = (playerInventory?.slots ?? INVENTORY_BASE_SLOTS) - INVENTORY_BASE_SLOTS;
    const hbSlotsUsed   = (hotbarSlots ?? HOTBAR_BASE_SLOTS) - HOTBAR_BASE_SLOTS;

    // Per-item: has this specific upgrade already maxed out its contribution?
    function upgradeAlreadyApplied(id) {
      const eff = ITEMS[id]?.upgradeEffect;
      if (!eff) return false;
      if (eff.inventorySlots) {
        // Once inventory slots > base, a pouch-type upgrade has been used
        return invSlotsUsed >= eff.inventorySlots;
      }
      if (eff.hotbarSlots) {
        return hbSlotsUsed >= eff.hotbarSlots;
      }
      return false;
    }

    if (!atCraftingStation) {
      // When Show All is on, render the full recipe browser (read-only — buttons stay disabled for station-locked recipes)
      const noStationAllEntries = expandedStationRecipes().filter(
        ([id]) => !unlockedItemIds || unlockedItemIds.has(resolveRecipeKey(id))
      );
      const noStationAllCategories = [
        { key:"tools_t1",  label:"⚒ Tier 1 Tools",      filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="tool" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
        { key:"gear",      label:"🛡 Armor & Gear",       filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="gear" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
        { key:"upgrades",  label:"🎒 Bag Upgrades",       filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="upgrade" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
        { key:"stations",  label:"🏗 Stations",           filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="placeable" && ["fire_pit","furnace","anvil","potion_stand","builders_table"].includes(resolveRecipeKey(id)) },
        { key:"decor",     label:"🌸 Decor & Structures", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="placeable" && !["fire_pit","furnace","anvil","potion_stand","crafting_station","builders_table"].includes(resolveRecipeKey(id)) && ITEMS[resolveRecipeKey(id)]?.craftStation !== "builders_table" },
        { key:"fire_pit",     label:"🔥 Fire Pit Recipes",    filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "fire_pit" },
        { key:"furnace",      label:"⚙️ Furnace Recipes",     filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "furnace" },
        { key:"anvil",        label:"⚒ Anvil Recipes",        filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "anvil" },
        { key:"potion_stand", label:"⚗️ Potion Stand Recipes", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "potion_stand" },
        { key:"builders_table_recipes", label:"📐 Builder's Table Recipes", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "builders_table" },
      ];

      // ── Toggle pill (defined here for the no-station branch) ───────────────
      function NoStationTogglePill({ label, active, onChange, title }) {
        return (
          <button
            title={title}
            onClick={() => onChange(!active)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 11px", borderRadius: 20,
              border: `1px solid ${active ? "rgba(200,230,120,0.5)" : "rgba(255,255,255,0.12)"}`,
              background: active ? "rgba(200,230,120,0.14)" : "rgba(255,255,255,0.03)",
              color: active ? "rgba(200,230,120,0.95)" : "rgba(255,255,255,0.35)",
              fontSize: 11, fontFamily: "monospace", cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{
              width: 26, height: 14, borderRadius: 7,
              background: active ? "rgba(200,230,120,0.75)" : "rgba(255,255,255,0.12)",
              position: "relative", display: "inline-block", flexShrink: 0,
              transition: "background 0.15s",
            }}>
              <span style={{
                position: "absolute", top: 2, left: active ? 13 : 2,
                width: 10, height: 10, borderRadius: "50%",
                background: active ? "#0a1206" : "rgba(255,255,255,0.4)",
                transition: "left 0.15s",
              }} />
            </span>
            {label}
          </button>
        );
      }

      return (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

          {/* Materials you have */}
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
            {Object.entries(playerItems).filter(([,v])=>v>0).map(([id,qty])=>(
              <span key={id} style={{ fontSize:10,padding:"3px 7px",borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(245,230,200,0.6)" }}>
                {ITEM_ICONS[id]??""} {qty} {ITEMS[id]?.label??id}
              </span>
            ))}
          </div>

          {/* ── Filter toggles ──────────────────────────────────────────────── */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <NoStationTogglePill
              label="Show All"
              active={showAll}
              onChange={setShowAll}
              title="Browse all recipes from every station"
            />
            <NoStationTogglePill
              label="Craftable"
              active={craftableOnly}
              onChange={setCraftableOnly}
              title="Only show recipes you have enough materials to craft right now"
            />
          </div>

          {/* Hand-craft: crafting station only — always shown */}
          <div style={{ padding:"14px",borderRadius:12,background:"rgba(200,230,120,0.04)",border:"1px solid rgba(200,230,120,0.15)" }}>
            <p style={{ fontSize:10,color:"rgba(200,230,120,0.5)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12 }}>⚒ craft by hand</p>
            {(() => {
              const name = "crafting_station";
              const recipe = RECIPES[name];
              const it = ITEMS[name];
              const chestCraftable = canCraftFromChest(name, normalizeChest(chest));
              const active = stationCraftable || chestCraftable;
              if (craftableOnly && !active) return <div style={{ fontSize:11,color:"rgba(255,255,255,0.2)",fontFamily:"monospace" }}>Nothing hand-craftable yet.</div>;
              return (
                <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:active?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${active?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}`,opacity:active?1:0.5 }}>
                  <span style={{ fontSize:22,minWidth:30 }}>{it?.icon??"📦"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??name}</div>
                    <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)" }}>
                      {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;const chestMap=chestToMap(normalizeChest(chest));const inChest=chestMap[ing]??0;return<span key={ing} style={{ marginRight:8,color:have>=qty?"rgba(200,230,120,0.7)":inChest>=qty?"rgba(180,200,100,0.6)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty}{inChest>0&&have<qty?<span style={{ color:"rgba(180,200,100,0.5)",fontSize:9 }}> (📦{inChest})</span>:null} {ITEMS[ing]?.label??ing}</span>;}) }
                    </div>
                    <div style={{ fontSize:9,color:"rgba(245,230,200,0.3)",marginTop:4 }}>{it?.description}</div>
                  </div>
                  <button disabled={!stationCraftable} onClick={()=>handleCraft(name)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${stationCraftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:stationCraftable?"rgba(200,230,120,0.1)":"transparent",color:stationCraftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:stationCraftable?"pointer":"default" }}>craft</button>
                  <button disabled={!chestCraftable} onClick={()=>handleCraftFromChest(name)} title="Craft using materials from chest" style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${chestCraftable?"rgba(180,200,100,0.35)":"rgba(255,255,255,0.06)"}`,background:chestCraftable?"rgba(180,200,100,0.1)":"transparent",color:chestCraftable?"rgba(180,200,100,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:chestCraftable?"pointer":"default",whiteSpace:"nowrap" }}>📦 chest</button>
                </div>
              );
            })()}
          </div>

          {/* Show All: full recipe browser (station-locked items show as greyed out) */}
          {showAll && noStationAllCategories.map(cat => {
            let entries = noStationAllEntries.filter(cat.filter);
            if (craftableOnly) {
              entries = entries.filter(([name]) => {
                const alreadyApplied = upgradeAlreadyApplied(resolveRecipeKey(name));
                if (alreadyApplied) return false;
                return canCraftAtStationByKey(name, playerInventory ?? {}) || canCraftAtStationByKeyFromChest(name, normalizeChest(chest));
              });
            }
            if (entries.length === 0) return null;
            return (
              <div key={cat.key}>
                <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>{cat.label}</p>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {entries.map(([name, recipe]) => {
                    const outputId = resolveRecipeKey(name);
                    const it = ITEMS[outputId];
                    const alreadyApplied = upgradeAlreadyApplied(outputId);
                    const craftable = !alreadyApplied && canCraftAtStationByKey(name, playerInventory ?? {});
                    const chestCraftable = !alreadyApplied && canCraftAtStationByKeyFromChest(name, normalizeChest(chest));
                    const active = craftable || chestCraftable;
                    const needsStation = !!it?.craftStation;
                    return (
                      <div key={name} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:active?"rgba(200,230,120,0.06)":alreadyApplied?"rgba(255,180,60,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${active?"rgba(200,230,120,0.2)":alreadyApplied?"rgba(255,180,60,0.2)":"rgba(255,255,255,0.06)"}`,opacity:active?1:alreadyApplied?0.75:0.45 }}>
                        <ItemIcon id={outputId} size={26} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??outputId}</div>
                          <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)",display:"flex",flexWrap:"wrap",gap:6 }}>
                            {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;const chestMap=chestToMap(normalizeChest(chest));const inChest=chestMap[ing]??0;return<span key={ing} style={{ color:have>=qty?"rgba(200,230,120,0.7)":inChest>=qty?"rgba(180,200,100,0.6)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty}{inChest>0&&have<qty?<span style={{ color:"rgba(180,200,100,0.5)",fontSize:9 }}> (📦{inChest})</span>:null} {ITEMS[ing]?.label??ing}</span>;})}
                          </div>
                          {needsStation && <div style={{ fontSize:9,color:"rgba(255,180,80,0.5)",marginTop:2 }}>requires {ITEMS[it.craftStation]?.label??it.craftStation}</div>}
                          {alreadyApplied && <div style={{ fontSize:9,color:"rgba(255,180,60,0.8)",marginTop:3 }}>⚠ already applied — you can only use this once</div>}
                        </div>
                        {alreadyApplied ? (
                          <span style={{ fontSize:10,color:"rgba(255,180,60,0.6)",fontFamily:"monospace",whiteSpace:"nowrap" }}>✓ used</span>
                        ) : needsStation ? (
                          <span style={{ fontSize:9,color:"rgba(255,180,80,0.4)",fontFamily:"monospace",whiteSpace:"nowrap",textAlign:"center",lineHeight:1.3 }}>needs<br/>station</span>
                        ) : (
                          <>
                            <button disabled={!craftable} onClick={()=>handleCraftAtStation(name)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${craftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:craftable?"rgba(200,230,120,0.1)":"transparent",color:craftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:craftable?"pointer":"default" }}>craft</button>
                            {(()=>{const cc=canCraftAtStationByKeyFromChest(name,normalizeChest(chest))&&!alreadyApplied;return<button disabled={!cc} onClick={()=>handleCraftAtStationFromChest(name)} title="Craft using materials from chest" style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${cc?"rgba(180,200,100,0.35)":"rgba(255,255,255,0.06)"}`,background:cc?"rgba(180,200,100,0.1)":"transparent",color:cc?"rgba(180,200,100,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:cc?"pointer":"default",whiteSpace:"nowrap" }}>📦 chest</button>;})()}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Default locked notice when Show All is off */}
          {!showAll && (
            <div style={{ padding:"14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",textAlign:"center" }}>
              <div style={{ fontSize:20,marginBottom:8 }}>🔒</div>
              <div style={{ fontSize:12,color:"rgba(245,230,200,0.35)",lineHeight:1.6 }}>All other recipes require a <span style={{ color:"rgba(200,230,120,0.7)" }}>Crafting Station</span>.<br/>Build one and walk up to it, then press <span style={{ color:"rgba(200,230,120,0.7)" }}>[F]</span> to access all recipes.</div>
            </div>
          )}
        </div>
      );
    }

    // At crafting station

    // ── Item stat summary lines shown in crafting panel ─────────────────────
    function getItemStatLine(id) {
      const stats = ITEMS[id]?.equipStats ?? {};
      const eff   = ITEMS[id]?.upgradeEffect;
      const parts = [];
      if (stats.canHoe)   parts.push("tills soil");
      if (stats.canChop)  parts.push("chops trees");
      if (stats.canMine)  parts.push("mines ore");
      if (stats.canFish)  parts.push("enables fishing");
      if (stats.canWater) parts.push("waters crops");
      if (stats.attackBonus)  parts.push(`+${stats.attackBonus} damage`);
      if (stats.attackRange)  parts.push(`+${stats.attackRange} range`);
      if (stats.defense)      parts.push(`+${stats.defense} defense`);
      if (stats.maxHpBonus)   parts.push(`+${stats.maxHpBonus} max HP`);
      if (stats.herbBonus)    parts.push(`×${stats.herbBonus} herb yield`);
      if (stats.stoneYield)   parts.push(`×${stats.stoneYield} stone yield`);
      if (stats.woodYield)    parts.push(`×${stats.woodYield} wood yield`);
      if (eff?.inventorySlots) parts.push(`+${eff.inventorySlots} inventory slots`);
      if (eff?.hotbarSlots)    parts.push(`+${eff.hotbarSlots} hotbar slot${eff.hotbarSlots > 1 ? "s" : ""}`);
      const useEff = ITEMS[id]?.useEffect;
      if (useEff?.heal) parts.push(`restores ${useEff.heal} HP`);
      return parts.join(" · ");
    }

    

    // Station-specific menus: only show items whose craftStation matches the current station.
    // The main crafting_station shows tools, gear, upgrades, stations, decor (items with no specific craftStation).
    const isSpecificStation = atCraftingStation && atCraftingStation !== "crafting_station";

    const STATION_LABELS = {
      fire_pit:     { icon:"🔥", label:"Fire Pit" },
      furnace:      { icon:"⚙️", label:"Furnace" },
      anvil:        { icon:"⚒", label:"Anvil" },
      potion_stand: { icon:"⚗️", label:"Potion Stand" },
      builders_table: { icon:"📐", label:"Builder's Table" },
    };

    const allCategories = [
      { key:"tools_t1",  label:"⚒ Tier 1 Tools",      filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="tool" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
      { key:"gear",      label:"🛡 Armor & Gear",       filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="gear" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
      { key:"upgrades",  label:"🎒 Bag Upgrades",       filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="upgrade" && !ITEMS[resolveRecipeKey(id)]?.craftStation },
      { key:"stations",  label:"🏗 Stations",           filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="placeable" && ["fire_pit","furnace","anvil","potion_stand","builders_table"].includes(resolveRecipeKey(id)) },
      { key:"decor",     label:"🌸 Decor & Structures", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.category==="placeable" && !["fire_pit","furnace","anvil","potion_stand","crafting_station","builders_table"].includes(resolveRecipeKey(id)) && ITEMS[resolveRecipeKey(id)]?.craftStation !== "builders_table" },
      { key:"fire_pit",     label:"🔥 Fire Pit Recipes",    filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "fire_pit" },
      { key:"furnace",      label:"⚙️ Furnace Recipes",     filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "furnace" },
      { key:"anvil",        label:"⚒ Anvil Recipes",        filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "anvil" },
      { key:"potion_stand", label:"⚗️ Potion Stand Recipes", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "potion_stand" },
      { key:"builders_table_recipes", label:"📐 Builder's Table Recipes", filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === "builders_table" },
    ];
    const categories = showAll
      ? allCategories
      : isSpecificStation
        ? [{ key: atCraftingStation, label: `${STATION_LABELS[atCraftingStation]?.icon ?? "🔨"} ${STATION_LABELS[atCraftingStation]?.label ?? atCraftingStation} Recipes`, filter: ([id]) => ITEMS[resolveRecipeKey(id)]?.craftStation === atCraftingStation }]
        : allCategories.slice(0, 5);
    const allStationEntries = expandedStationRecipes().filter(
      ([id]) => !unlockedItemIds || unlockedItemIds.has(resolveRecipeKey(id))
    );

    // ── Toggle pill style helper ────────────────────────────────────────────
    function TogglePill({ label, active, onChange, title }) {
      return (
        <button
          title={title}
          onClick={() => onChange(!active)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 11px", borderRadius: 20,
            border: `1px solid ${active ? "rgba(200,230,120,0.5)" : "rgba(255,255,255,0.12)"}`,
            background: active ? "rgba(200,230,120,0.14)" : "rgba(255,255,255,0.03)",
            color: active ? "rgba(200,230,120,0.95)" : "rgba(255,255,255,0.35)",
            fontSize: 11, fontFamily: "monospace", cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <span style={{
            width: 26, height: 14, borderRadius: 7,
            background: active ? "rgba(200,230,120,0.75)" : "rgba(255,255,255,0.12)",
            position: "relative", display: "inline-block", flexShrink: 0,
            transition: "background 0.15s",
          }}>
            <span style={{
              position: "absolute", top: 2, left: active ? 13 : 2,
              width: 10, height: 10, borderRadius: "50%",
              background: active ? "#0a1206" : "rgba(255,255,255,0.4)",
              transition: "left 0.15s",
            }} />
          </span>
          {label}
        </button>
      );
    }

    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
          {Object.entries(playerItems).filter(([,v])=>v>0).map(([id,qty])=>(
            <span key={id} style={{ fontSize:10,padding:"3px 7px",borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(245,230,200,0.6)" }}>
              {ITEM_ICONS[id]??""} {qty} {ITEMS[id]?.label??id}
            </span>
          ))}
        </div>

        {/* ── Filter toggles ──────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <TogglePill
            label="Show All"
            active={showAll}
            onChange={setShowAll}
            title="Show all recipes from every station, even if you're not there"
          />
          <TogglePill
            label="Craftable"
            active={craftableOnly}
            onChange={setCraftableOnly}
            title="Only show recipes you have enough materials to craft right now"
          />
        </div>

        {categories.map(cat => {
          let entries = allStationEntries.filter(cat.filter);
          if (craftableOnly) {
            entries = entries.filter(([name]) => {
              const alreadyApplied = upgradeAlreadyApplied(resolveRecipeKey(name));
              if (alreadyApplied) return false;
              return canCraftAtStationByKey(name, playerInventory ?? {}) || canCraftAtStationByKeyFromChest(name, normalizeChest(chest));
            });
          }
          if (entries.length === 0) return null;
          return (
            <div key={cat.key}>
              <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>{cat.label}</p>
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                {entries.map(([name, recipe]) => {
                  const outputId = resolveRecipeKey(name);
                  const it = ITEMS[outputId];
                  const statLine = getItemStatLine(outputId);
                  const alreadyApplied = upgradeAlreadyApplied(outputId);
                  const craftable = !alreadyApplied && canCraftAtStationByKey(name, playerInventory ?? {});
                  const chestCraftable = !alreadyApplied && canCraftAtStationByKeyFromChest(name, normalizeChest(chest));
                  const active = craftable || chestCraftable;
                  return (
                    <div key={name} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:active?"rgba(200,230,120,0.06)":alreadyApplied?"rgba(255,180,60,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${active?"rgba(200,230,120,0.2)":alreadyApplied?"rgba(255,180,60,0.2)":"rgba(255,255,255,0.06)"}`,opacity:active?1:alreadyApplied?0.75:0.5 }}>
                      <ItemIcon id={outputId} size={26} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??outputId}</div>
                        {statLine && (
                          <div style={{ fontSize:10,color:"rgba(150,210,255,0.65)",marginBottom:3,fontStyle:"italic" }}>{statLine}</div>
                        )}
                        <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)",display:"flex",flexWrap:"wrap",gap:6 }}>
                          {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;const chestMap=chestToMap(normalizeChest(chest));const inChest=chestMap[ing]??0;return<span key={ing} style={{ color:have>=qty?"rgba(200,230,120,0.7)":inChest>=qty?"rgba(180,200,100,0.6)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty}{inChest>0&&have<qty?<span style={{ color:"rgba(180,200,100,0.5)",fontSize:9 }}> (📦{inChest})</span>:null} {ITEMS[ing]?.label??ing}</span>;})}
                        </div>
                        {it?.craftStation&&it.craftStation!=="crafting_station"&&!isSpecificStation&&<div style={{ fontSize:9,color:"rgba(255,180,80,0.5)",marginTop:2 }}>requires {ITEMS[it.craftStation]?.label??it.craftStation}</div>}
                        {alreadyApplied && (
                          <div style={{ fontSize:9,color:"rgba(255,180,60,0.8)",marginTop:3,display:"flex",alignItems:"center",gap:4 }}>
                            ⚠ already applied — you can only use this once
                          </div>
                        )}
                      </div>
                      {alreadyApplied ? (
                        <span style={{ fontSize:10,color:"rgba(255,180,60,0.6)",fontFamily:"monospace",whiteSpace:"nowrap" }}>✓ used</span>
                      ) : (
                        <>
                          <button disabled={!craftable} onClick={()=>handleCraftAtStation(name)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${craftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:craftable?"rgba(200,230,120,0.1)":"transparent",color:craftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:craftable?"pointer":"default" }}>craft</button>
                          {(()=>{const cc=canCraftAtStationByKeyFromChest(name,normalizeChest(chest))&&!alreadyApplied;return<button disabled={!cc} onClick={()=>handleCraftAtStationFromChest(name)} title="Craft using materials from chest" style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${cc?"rgba(180,200,100,0.35)":"rgba(255,255,255,0.06)"}`,background:cc?"rgba(180,200,100,0.1)":"transparent",color:cc?"rgba(180,200,100,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:cc?"pointer":"default",whiteSpace:"nowrap" }}>📦 chest</button>;})()}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {craftableOnly && categories.every(cat => {
          let entries = allStationEntries.filter(cat.filter);
          entries = entries.filter(([name]) => {
            const alreadyApplied = upgradeAlreadyApplied(resolveRecipeKey(name));
            if (alreadyApplied) return false;
            return canCraftAtStationByKey(name, playerInventory ?? {}) || canCraftAtStationByKeyFromChest(name, normalizeChest(chest));
          });
          return entries.length === 0;
        }) && (
          <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(255,255,255,0.25)", fontSize:12, fontFamily:"monospace" }}>
            No craftable recipes right now — gather more materials.
          </div>
        )}
      </div>
    );
  }
  function EquipmentTab() {
    const stats = getEquipStats(equipment);
    const equippableInBag = Object.entries(playerItems).filter(([k,v])=>v>0&&EQUIPPABLE[k]).map(([k])=>k);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {["weapon","armor","accessory"].map(slot=>{
          const item=equipment?.[slot]; const info=item?EQUIPPABLE[item]:null;
          return(
            <div key={slot} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:item?"rgba(200,230,120,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${item?"rgba(200,230,120,0.18)":"rgba(255,255,255,0.06)"}` }}>
              <span style={{ fontSize:22,minWidth:30 }}>{info?.icon??"○"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.1em",textTransform:"uppercase" }}>{slot}</div>
                <div style={{ fontSize:13,color:item?"rgba(200,230,120,0.85)":"rgba(255,255,255,0.18)" }}>{info?.label??"empty"}</div>
                {info&&<div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{Object.entries(info.stats??{}).map(([k,v])=>`${k}:${v}`).join("  ")}</div>}
{item && slot === "weapon" && (() => {
  const dur = getWeaponDurability(equipment);
  if (!dur) return null;
  const [cur, max] = dur;
  const pct = cur / max;
  const barCol = pct > 0.5 ? "#80d860" : pct > 0.25 ? "#e8c840" : "#e04840";
  return (
    <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ width:60, height:5, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${pct*100}%`, height:"100%", background:barCol, borderRadius:3 }}/>
      </div>
      <span style={{ fontSize:9, color:"rgba(200,230,160,0.5)" }}>{cur}/{max}</span>
    </div>
  );
})()}
              </div>
              {item&&<button onClick={()=>onEquipItem?.(item)} style={{ padding:"6px 10px",borderRadius:7,border:"1px solid rgba(255,100,100,0.25)",background:"rgba(255,100,100,0.06)",color:"rgba(255,140,120,0.8)",fontSize:11,fontFamily:"monospace",cursor:"pointer" }}>unequip</button>}
            </div>
          );
        })}
        <div style={{ padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>active bonuses</p>
          {Object.entries(stats).filter(([,v])=>v&&v!==0&&v!==false).length===0
            ?<p style={{ fontSize:11,color:"rgba(255,255,255,0.18)" }}>no bonuses active</p>
            :<div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {stats.attackBonus>0&&<StatPill label="ATK" value={`+${stats.attackBonus}`}/>}
              {stats.defense>0&&<StatPill label="DEF" value={`+${stats.defense}`}/>}
              {stats.maxHpBonus>0&&<StatPill label="HP" value={`+${stats.maxHpBonus}`}/>}
              {stats.attackRange>0&&<StatPill label="RANGE" value={`+${stats.attackRange}`}/>}
              {stats.herbBonus>0&&<StatPill label="HERB" value={`×${stats.herbBonus}`}/>}
              {stats.stoneYield>0&&<StatPill label="STONE" value={`×${stats.stoneYield}`}/>}
              {stats.canFish&&<StatPill label="FISH" value="✓" color="rgba(100,180,255,0.8)"/>}
              {stats.canHoe&&<StatPill label="HOE" value="✓" color="rgba(180,140,80,0.8)"/>}
              {stats.canChop&&<StatPill label="CHOP" value="✓" color="rgba(120,200,60,0.8)"/>}
              {stats.canMine&&<StatPill label="MINE" value="✓" color="rgba(180,180,180,0.8)"/>}
            </div>
          }
        </div>
        {equippableInBag.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase" }}>in bag — click to equip</p>
            {equippableInBag.map(name=>{const info=EQUIPPABLE[name];const isEq=equipment?.[info?.slot]===name;return(
              <div key={name} onClick={()=>onEquipItem?.(name)} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",background:isEq?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${isEq?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}` }}>
                <span style={{ fontSize:20,minWidth:30 }}>{info.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{info.label}</div>
                  <div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{info.slot} slot</div>
                </div>
                <button style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${isEq?"rgba(255,100,100,0.25)":"rgba(200,230,120,0.3)"}`,background:isEq?"rgba(255,100,100,0.06)":"rgba(200,230,120,0.08)",color:isEq?"rgba(255,140,120,0.8)":"rgba(200,230,120,0.9)",fontSize:11,fontFamily:"monospace",cursor:"pointer" }}>
                  {isEq?"unequip":"equip"}
                </button>
              </div>
            );})}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Farming ────────────────────────────────────────────────────────────
  function FarmingTab() {
    const plots = farmPlots ?? {};
    const planted = Object.entries(plots).filter(([,p])=>p.seedId);
    const seedsInBag = Object.entries(playerItems).filter(([k,v])=>v>0&&SEEDS[k]);
    const seedsInChest = Object.entries(chestToMap(normalizeChest(chest))).filter(([k,v])=>v>0&&SEEDS[k]);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <div style={{ padding:"12px 14px",borderRadius:10,background:"rgba(139,96,64,0.12)",border:"1px solid rgba(180,140,80,0.2)" }}>
          <p style={{ fontSize:10,color:"rgba(200,180,120,0.6)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6 }}>how to farm</p>
          <p style={{ fontSize:11,color:"rgba(245,230,200,0.55)",lineHeight:1.7 }}>
            Equip the <strong style={{ color:"rgba(200,230,120,0.8)" }}>Hoe</strong>, press <strong style={{ color:"rgba(200,230,120,0.8)" }}>E</strong> on grass to till it. Equip a seed in your hotbar, press <strong style={{ color:"rgba(200,230,120,0.8)" }}>E</strong> on tilled soil to plant. Press <strong style={{ color:"rgba(200,230,120,0.8)" }}>E</strong> on ready crops to harvest into your bag.
          </p>
        </div>
        {seedsInBag.length>0&&(
          <div>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>seeds in your bag</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {seedsInBag.map(([id,qty])=>{const it=ITEMS[id];return(
                <div key={id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:"rgba(80,160,60,0.08)",border:"1px solid rgba(100,180,60,0.2)" }}>
                  <span style={{ fontSize:20 }}>{it.icon}</span>
                  <div><div style={{ fontSize:12,color:"rgba(180,230,120,0.9)" }}>{it.label}</div><div style={{ fontSize:9,color:"rgba(200,200,200,0.4)" }}>×{qty}</div></div>
                </div>
              );})}
            </div>
          </div>
        )}
        {seedsInChest.length>0&&(
          <div>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>seeds in chest (take to use)</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {seedsInChest.map(([id,qty])=>{const it=ITEMS[id];const canTake=canFitItem(playerInventory??{items:{},slots:INVENTORY_BASE_SLOTS},id);return(
                <div key={id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:"rgba(60,120,40,0.06)",border:"1px solid rgba(80,160,40,0.12)" }}>
                  <span style={{ fontSize:20 }}>{it.icon}</span>
                  <div><div style={{ fontSize:12,color:"rgba(150,200,100,0.7)" }}>{it.label}</div><div style={{ fontSize:9,color:"rgba(200,200,200,0.4)" }}>×{qty} in chest</div></div>
                  <button disabled={!canTake} onClick={()=>{const newChest=spendFromChest(normalizeChest(chest),{[id]:1});if(newChest)onChestUpdate?.(newChest);const ni={...playerItems,[id]:(playerItems[id]??0)+1};onPlayerInventoryUpdate?.({...playerInventory,items:ni});}} style={{ fontSize:9,padding:"3px 7px",borderRadius:5,cursor:canTake?"pointer":"default",border:`1px solid ${canTake?"rgba(200,230,120,0.3)":"rgba(255,255,255,0.08)"}`,background:canTake?"rgba(200,230,120,0.08)":"transparent",color:canTake?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontFamily:"monospace" }}>take</button>
                </div>
              );})}
            </div>
          </div>
        )}
        {planted.length>0&&(
          <div>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>growing now ({planted.length})</p>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {planted.map(([key,plot])=>{const def=SEEDS[plot.seedId];const nowTs=Date.now();const elapsed=(nowTs-plot.plantedAt)/1000;const isWatered=plot.wateredAt&&(nowTs-plot.wateredAt)/1000<WATER_BOOST_SECONDS;const effectiveElapsed=isWatered?elapsed*1.5:elapsed;const progress=Math.min(1,effectiveElapsed/(def?.growthTime*(def?.growthStages??3)));return(
                <div key={key} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:9,background:plot.ready?"rgba(80,200,80,0.1)":isWatered?"rgba(60,140,200,0.08)":"rgba(60,120,40,0.08)",border:`1px solid ${plot.ready?"rgba(80,200,80,0.3)":isWatered?"rgba(80,160,220,0.3)":"rgba(80,160,40,0.15)"}` }}>
                  <span style={{ fontSize:18 }}>{ITEMS[plot.seedId]?.icon??"🌱"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,color:plot.ready?"rgba(120,220,80,0.9)":"rgba(180,230,120,0.7)",display:"flex",alignItems:"center",gap:5 }}>{def?.label?.replace(" Seeds","")??plot.seedId} {plot.ready?"— ✓ ready!":""}{isWatered&&!plot.ready&&<span style={{ fontSize:9,color:"rgba(100,180,240,0.9)",background:"rgba(60,140,200,0.18)",border:"1px solid rgba(80,160,220,0.3)",borderRadius:4,padding:"1px 5px" }}>💧 ×1.5</span>}</div>
                    <div style={{ height:4,borderRadius:2,background:"rgba(255,255,255,0.08)",marginTop:4,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${progress*100}%`,background:plot.ready?"rgba(80,220,80,0.7)":isWatered?"rgba(80,160,220,0.6)":"rgba(120,200,60,0.6)",transition:"width 1s" }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:10,color:"rgba(200,200,200,0.4)",fontFamily:"monospace" }}>{Math.round(progress*100)}%</div>
                </div>
              );})}
            </div>
          </div>
        )}
        {seedsInBag.length===0&&seedsInChest.length===0&&planted.length===0&&(
          <p style={{ textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.2)",padding:"20px 0" }}>No farm yet — craft a hoe and till some soil!</p>
        )}
        <div style={{ padding:"10px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize:11,color:"rgba(245,230,200,0.35)" }}>Visit <strong style={{ color:"rgba(200,230,120,0.7)" }}>Millhaven Market</strong> (east, follow the path) to buy seeds.</p>
        </div>
      </div>
    );
  }

  // ── Tab: Character ──────────────────────────────────────────────────────────
  function CharacterTab() {
    const Swatch=({active,color,onClick,size=28})=>(
      <button onClick={onClick} style={{ width:size,height:size,borderRadius:"50%",cursor:"pointer",background:color,border:`2px solid ${active?"#fff":"rgba(255,255,255,0.1)"}`,boxShadow:active?"0 0 0 2px rgba(200,230,120,0.6)":"none",transition:"all 0.1s" }}/>
    );
    return(
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <div style={{ display:"flex",justifyContent:"center" }}>
          <svg width="56" height="80">
            <ellipse cx="28" cy="72" rx="10" ry="4" fill="rgba(0,0,0,0.2)"/>
            {(()=>{const c=OUTFIT_COLORS.find(o=>o.id===ch.outfit)?.legs||"#3a6abf";return<><rect x="16" y="50" width="8" height="14" fill={c}/><rect x="26" y="50" width="8" height="14" fill={c}/></>;})()}
            {(()=>{const c=OUTFIT_COLORS.find(o=>o.id===ch.outfit)?.body||"#5b8dd9";return<><rect x="14" y="32" width="22" height="20" fill={c}/><rect x="8" y="33" width="6" height="14" fill={c}/><rect x="36" y="33" width="6" height="14" fill={c}/></>;})()}
            {(()=>{const c=SKIN_TONES.find(s=>s.id===ch.skin)?.color||"#f5c5a3";return<rect x="14" y="14" width="22" height="20" fill={c}/>;})()}
            {(()=>{const c=HAIR_STYLES.find(h=>h.id===ch.hair)?.color||"#7a4f2a";return<rect x="14" y="14" width="22" height="7" fill={c}/>;})()}
            {(()=>{const hc=HAT_STYLES.find(h=>h.id===ch.hat)?.color;if(!hc||ch.hat==="none")return null;if(ch.hat==="cap")return<><rect x="12" y="6" width="26" height="10" fill={hc}/><rect x="10" y="3" width="30" height="5" fill={hc}/></>;if(ch.hat==="straw")return<><rect x="16" y="4" width="18" height="14" fill={hc}/><ellipse cx="25" cy="18" rx="18" ry="6" fill={hc}/></>;if(ch.hat==="beanie")return<path d="M14 14 Q14 4 25 4 Q36 4 36 14" fill={hc}/>;return null;})()}
            <rect x="18" y="26" width="4" height="4" fill="#2a1a0a"/>
            <rect x="28" y="26" width="4" height="4" fill="#2a1a0a"/>
          </svg>
        </div>
        {[["Skin Tone",SKIN_TONES,"skin"],[null,OUTFIT_COLORS,"outfit"],[null,HAIR_STYLES,"hair"]].map(([lbl,arr,key])=>(
          <div key={key}>
            {lbl&&<p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>{lbl}</p>}
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {arr.map(o=><Swatch key={o.id} active={ch[key]===o.id} color={o.color||o.body} onClick={()=>setCh(c=>({...c,[key]:o.id}))}/>)}
            </div>
          </div>
        ))}
        <div>
          <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>Hat</p>
          <div style={{ display:"flex",gap:6 }}>
            {HAT_STYLES.map(h=><button key={h.id} onClick={()=>setCh(c=>({...c,hat:h.id}))} style={{ padding:"6px 10px",borderRadius:8,cursor:"pointer",background:ch.hat===h.id?"rgba(200,230,120,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${ch.hat===h.id?"rgba(200,230,120,0.4)":"rgba(255,255,255,0.08)"}`,color:ch.hat===h.id?"rgba(200,230,120,0.9)":"rgba(245,230,200,0.5)",fontFamily:"monospace",fontSize:11 }}>{h.label}</button>)}
          </div>
        </div>
        <button onClick={()=>{onCharacterUpdate?.(ch);onClose();}} style={{ width:"100%",padding:"14px",borderRadius:10,cursor:"pointer",background:"rgba(200,230,120,0.1)",border:"1px solid rgba(200,230,120,0.3)",color:"rgba(200,230,120,0.9)",fontSize:13,fontFamily:"monospace" }}>save look →</button>
      </div>
    );
  }

  const tabContent = {
    inventory:  <InventoryTab/>,
    chest:      <ChestTab/>,
    crafting:   <CraftingTab/>,
    equipment:  <EquipmentTab/>,
    farming:    <FarmingTab/>,
    character:  <CharacterTab/>,
  };

  return (
    <div ref={overlayRef} style={{ position:"absolute",inset:0,background:"rgba(4,12,4,0.86)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,backdropFilter:"blur(2px)" }} onClick={onClose}>
      <div style={{ background:"#111a0b",border:"1px solid rgba(180,220,100,0.22)",borderRadius:18,width:540,maxWidth:"97vw",height:"88vh",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"monospace",color:"#f5e6c8",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:0 }}>
          <div style={{ fontSize:11,color:"rgba(200,230,120,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",paddingBottom:14 }}>🌿 hearthroot — menu</div>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"rgba(255,255,255,0.3)",fontSize:12,fontFamily:"monospace",cursor:"pointer",padding:"3px 9px",marginBottom:14 }}>✕  esc</button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 2px" }}>
          {TABS.map(tab=>{const active=activeTab===tab.id;return(
            <button key={tab.id} onClick={()=>onTabChange(tab.id)} style={{ flex:"1 1 auto",minWidth:"30%",padding:"8px 10px",background:active?"rgba(200,230,120,0.07)":"transparent",border:"none",borderBottom:`2px solid ${active?"rgba(200,230,120,0.8)":"transparent"}`,color:active?"rgba(200,230,120,0.95)":"rgba(245,230,200,0.4)",fontSize:11,fontFamily:"monospace",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap" }}>
              <span style={{ fontSize:13 }}>{tab.icon}</span>{tab.label}
            </button>
          );})}
        </div>
        {activeTab==="inventory"&&<HotbarDropZone/>}
        <div ref={contentRef} style={{ flex:1,minHeight:0,overflowY:"auto",padding:"18px 20px",scrollbarWidth:"thin",scrollbarColor:"rgba(200,230,120,0.15) transparent" }}>
          {tabContent[activeTab]}
        </div>
        <div style={{ padding:"8px 18px",borderTop:"1px solid rgba(255,255,255,0.05)",fontSize:9,color:"rgba(245,230,200,0.2)",textAlign:"center",letterSpacing:"0.08em" }}>
          Tab / Esc to close  ·  bag = yours  ·  chest = shared
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomesteadView({
  room,
  // Player personal inventory
  playerInventory,
  onPlayerInventoryUpdate,
  hotbarSlots,
  onHotbarSlotsUpdate,
  // Shared chest
  chest, chestOpen,
  onOpenChest, onCloseChest, onChestUpdate,
  // Equipment & character
  equipment, onEquipItem,
  character, onCharacterUpdate,
  // Hotbar
  hotbar, onHotbarChange,
  // World
  placedObjects: placedObjectsProp, onObjectsUpdate,
  // Town system
  town,
  // Navigation
  onStartRun, onJoinRun,
  canStartRun = true,
}) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const keysRef    = useRef({});
  const stateRef   = useRef(null);
  // ── Farming / world state ──────────────────────────────────────────────────
  // Declare early so we can replay farmPlots into tileMap during init
  const {
    farmPlots, tickCrops, tillTile, untillTile, plantSeed, harvestCrop, waterPlot, WATER_BOOST_SECONDS,
    nodeState, tickNodes, getNodeState, hitOreNode, hitTree, tickTreeRespawns, fishAtSpot,
  } = useHomesteadState(room?.id);

  // Build tileMap with persisted farmPlots already applied so tilled/planted tiles
  // survive a reload without a flash-of-grass on first frame.
  const tileMapRef = useRef(null);
  if (!tileMapRef.current) {
    const tm = buildTileMap();
    const plots = farmPlots.current;
    for (const [key, plot] of Object.entries(plots)) {
      const [col, row] = key.split(",").map(Number);
      if (!tm[row]) continue;
      tm[row][col] = plot.seedId ? T.PLANTED : T.TILLED;
    }
    tileMapRef.current = tm;
  }
  const objectsRef = useRef(defaultObjects());

  // Refs for values read by the game loop / stable callbacks
  const playerInvRef    = useRef(playerInventory);
  const chestRef        = useRef(chest);
  const characterRef    = useRef(character);
  const equipmentRef    = useRef(equipment);
  const hotbarRef       = useRef(hotbar);
  const hotbarSlotsRef  = useRef(hotbarSlots ?? HOTBAR_BASE_SLOTS);

  useEffect(() => { playerInvRef.current   = playerInventory; }, [playerInventory]);
  useEffect(() => { chestRef.current       = chest; }, [chest]);
  useEffect(() => { characterRef.current   = character; }, [character]);
  useEffect(() => { equipmentRef.current   = equipment; }, [equipment]);
  useEffect(() => { hotbarRef.current      = hotbar; }, [hotbar]);
  useEffect(() => { hotbarSlotsRef.current = hotbarSlots ?? HOTBAR_BASE_SLOTS; }, [hotbarSlots]);

  const [gold, setGold] = useState(() => { try { return JSON.parse(localStorage.getItem("hearthroot_gold")??"0"); } catch { return 0; } });
  const [partnerOnline,    setPartnerOnline]    = useState(false);
  const partnerOnlineRef = useRef(false);
  useEffect(() => { partnerOnlineRef.current = partnerOnline; }, [partnerOnline]);
  const [runJoinPrompt,    setRunJoinPrompt]    = useState(null);
  const [tabMenuOpen,      setTabMenuOpen]      = useState(false);
  const [activeTab,        setActiveTab]        = useState("inventory");
  const [ghostPlacement,   setGhostPlacement]   = useState(null);
  const [townOpen,         setTownOpen]         = useState(false);
  const [atCraftingStation,setAtCraftingStation]= useState(false);
  const [selectedHotbarIdx,setSelectedHotbarIdx]= useState(0);
  const selectedHotbarIdxRef = useRef(0);
  const ghostRef = useRef(null);
  const partnerAppearanceRef = useRef({ character:null, equipment:null });
  const canStartRunRef = useRef(canStartRun);
  useEffect(() => { canStartRunRef.current = canStartRun; }, [canStartRun]);

  // ── Town / NPC UI state ────────────────────────────────────────────────────
  const [treasuryOpen,   setTreasuryOpen]   = useState(false);
  const [talkingNPC,     setTalkingNPC]     = useState(null);  // NPC object | null

  // Sleep / day-cycle UI
  // sleepPhase: null | 'confirm' | 'waiting_partner' | 'partner_requesting' | 'both_ready'
  const [sleepPhase, setSleepPhase] = useState(null);
  const sleepPhaseRef = useRef(null);
  useEffect(() => { sleepPhaseRef.current = sleepPhase; }, [sleepPhase]);

  // Run-locked modal: shown when player tries to use the run board but has already run today
  const [showRunLocked, setShowRunLocked] = useState(false);
  const townRef = town?.townRef;  // ref to NPC array for game loop reads
  // NPC position sync timer — flush NPC positions back to town state every 500ms
  const npcSyncTimerRef = useRef(0);
  const treasuryOpenRef      = useRef(false);
  const talkingNPCRef        = useRef(null);
  const townOpenRef          = useRef(false);
  const atCraftingStationRef = useRef(false);
  useEffect(() => { treasuryOpenRef.current      = treasuryOpen;        }, [treasuryOpen]);
  useEffect(() => { talkingNPCRef.current        = talkingNPC;          }, [talkingNPC]);
  useEffect(() => { townOpenRef.current          = townOpen;            }, [townOpen]);
  useEffect(() => { atCraftingStationRef.current = atCraftingStation;   }, [atCraftingStation]);

  // ── Sell toast queue ───────────────────────────────────────────────────────
  const [sellToasts, setSellToasts] = useState([]);
  const sellToastTimersRef = useRef({});

  const pushSellToast = useCallback(({ icon, label, qty, gold: goldEarned }) => {
    injectSellToastStyle();
    const id = `${label}_${Date.now()}_${Math.random()}`;
    const toast = { id, icon, label, qty, gold: goldEarned, addedAt: Date.now() };
    setSellToasts(prev => [...prev, toast]);

    // Schedule fade start (re-render to pick up fading class) then removal
    const fadeTimer = setTimeout(() => {
      setSellToasts(prev => prev.map(t => t.id === id ? { ...t, addedAt: Date.now() - (TOAST_DURATION_MS - TOAST_FADE_MS) } : t));
    }, TOAST_DURATION_MS - TOAST_FADE_MS);

    const removeTimer = setTimeout(() => {
      setSellToasts(prev => prev.filter(t => t.id !== id));
      delete sellToastTimersRef.current[id];
    }, TOAST_DURATION_MS + 50);

    sellToastTimersRef.current[id] = { fadeTimer, removeTimer };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(sellToastTimersRef.current).forEach(({ fadeTimer, removeTimer }) => {
        clearTimeout(fadeTimer); clearTimeout(removeTimer);
      });
    };
  }, []);

  useEffect(() => { if (placedObjectsProp?.length > 0) objectsRef.current = placedObjectsProp; }, [placedObjectsProp]);
  useEffect(() => { ghostRef.current = ghostPlacement; }, [ghostPlacement]);
  useEffect(() => { selectedHotbarIdxRef.current = selectedHotbarIdx; }, [selectedHotbarIdx]);

  const onEquipItemRef = useRef(onEquipItem);
  useEffect(() => { onEquipItemRef.current = onEquipItem; }, [onEquipItem]);
  const onObjectsUpdateRef = useRef(onObjectsUpdate);
  useEffect(() => { onObjectsUpdateRef.current = onObjectsUpdate; }, [onObjectsUpdate]);

  // Auto-equip tools when hotbar selection changes
  useEffect(() => {
    const slot = (hotbarRef.current ?? [])[selectedHotbarIdx];
    if (slot && EQUIPPABLE[slot.item]) onEquipItemRef.current?.(slot.item);
  }, [selectedHotbarIdx]);

  const saveGold = useCallback((g) => {
    setGold(g);
    try { localStorage.setItem("hearthroot_gold", JSON.stringify(g)); } catch {}
  }, []);

  // ── Interact handler (harvest → player inventory) ──────────────────────────
  const handleInteract = useCallback(() => {
    const target = stateRef.current?.interactTarget;
    const state  = stateRef.current;
    if (!target && !state) return;

    const equipStats = getEquipStats(equipmentRef.current);

    // Hoe tilling
    if (equipStats.canHoe && !target) {
      const facingMap = { down:[0,1], up:[0,-1], left:[-1,0], right:[1,0] };
      const [fdx,fdy] = facingMap[state.facing] ?? [0,1];
      const tc = Math.floor(state.px/TILE) + fdx;
      const tr = Math.floor(state.py/TILE) + fdy;
      if (tillTile(tc, tr, tileMapRef.current)) {
        sendFarmUpdatedRef.current?.(farmPlots.current);
        return;
      }
    }

    // Hoe on empty tilled soil → revert to grass
    if (equipStats.canHoe && target?.type === "tilled_plot") {
      if (untillTile(target.tx, target.ty, tileMapRef.current)) {
        sendFarmUpdatedRef.current?.(farmPlots.current);
        return;
      }
    }

    if (!target) return;

    // Seed planting — seeds must be in player inventory
    if (target.type === "tilled_plot") {
      const seedInHotbar = (hotbarRef.current??[]).find(s=>s&&SEEDS[s.item]);
      if (seedInHotbar) {
        // plantSeed normally expects a plain { [id]: qty } inv — we adapt
        const flatInv = { ...(playerInvRef.current?.items ?? {}) };
        const newFlatInv = plantSeed(target.tx, target.ty, seedInHotbar.item, tileMapRef.current, flatInv);
        if (newFlatInv) {
          onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: newFlatInv });
          sendFarmUpdatedRef.current?.(farmPlots.current);
          // Update the hotbar slot to reflect the new qty (clear it if 0)
          const remaining = newFlatInv[seedInHotbar.item] ?? 0;
          const newHotbar = [...(hotbarRef.current ?? [])];
          const slotIdx = newHotbar.findIndex(s => s?.item === seedInHotbar.item);
          if (slotIdx !== -1) {
            newHotbar[slotIdx] = remaining > 0 ? { ...newHotbar[slotIdx], qty: remaining } : null;
            onHotbarChange?.(newHotbar);
          }
          return;
        }
      }
    }

    // Watering can — water a tilled or planted plot
    if (equipStats.canWater && (target.type === "tilled_plot" || target.type === "planted_crop" || target.type === "ready_crop")) {
      if (waterPlot(target.tx, target.ty)) {
        sendFarmUpdatedRef.current?.(farmPlots.current);
        return;
      }
    }

    // Harvest → goes to player inventory
    if (target.type === "ready_crop") {
      const flatInv = { ...(playerInvRef.current?.items ?? {}) };
      const result = harvestCrop(target.tx, target.ty, tileMapRef.current, flatInv);
      if (result) {
        onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: result.inventory });
        sendFarmUpdatedRef.current?.(farmPlots.current);
        return;
      }
    }

    // Ore node → player inventory
    if (target.type === OBJ.ORE_NODE) {
      if (!equipStats.canMine) return;
      const flatInv = { ...(playerInvRef.current?.items ?? {}) };
      const result = hitOreNode(target, equipStats, flatInv);
      if (result) {
        onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: result.inventory });
        // Sync node depletion state to partner
        sendFarmUpdatedRef.current?.(farmPlots.current, nodeState.current);
        return;
      }
    }

    // Fishing → player inventory
    if (target.type === OBJ.FISH_SPOT) {
      if (!equipStats.canFish) return;
      const flatInv = { ...(playerInvRef.current?.items ?? {}) };
      const result = fishAtSpot(flatInv);
      if (result) {
        onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: result.inventory });
        return;
      }
    }

    // Tree chopping → player inventory
    if (target.type === OBJ.TREE && target.choppable) {
      if (!equipStats.canChop) return;
      const flatInv = { ...(playerInvRef.current?.items ?? {}) };
      const result = hitTree(target.id, objectsRef.current, flatInv, (objs) => {
        objectsRef.current = objs; onObjectsUpdate?.(objs);
      });
      if (result) {
        onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: result.inventory });
        // If fully chopped, tell partner to remove the tree object
        const updatedTree = objectsRef.current.find(o => o.id === target.id);
        if (updatedTree?.chopped) {
          sendObjectRemovedRef.current?.(target.id);
        }
        return;
      }
    }

    // Hammer — demolish any placed building, return it to player inventory
    if (equipStats.canDemolish && target.isPlaceable) {
      const itemId = target.type; // placed object type == item id
      const newObjects = objectsRef.current.filter(o => o.id !== target.id);
      objectsRef.current = newObjects;
      onObjectsUpdate?.(newObjects);
      sendObjectRemovedRef.current?.(target.id);
      // Return the item to player inventory
      const flatInv = { ...(playerInvRef.current?.items ?? {}) };
      flatInv[itemId] = (flatInv[itemId] ?? 0) + 1;
      onPlayerInventoryUpdate?.({ ...playerInvRef.current, items: flatInv });
      return;
    }

    // Standard interactables
    if (target.type === OBJ.CHEST)  { setActiveTab("chest"); setTabMenuOpen(true); }
    if (target.type === "storage_chest") { setActiveTab("chest"); setTabMenuOpen(true); }
    if (target.type === OBJ.HOUSE)  {
      // Open the sleep confirm dialog — partner must also confirm to advance the day
      setSleepPhase("confirm");
    }
    if (target.type === OBJ.BOARD)  {
      if (!canStartRun) { setShowRunLocked(true); return; }
      try { localStorage.setItem("hearthroot_player_pos", JSON.stringify({ px: state.px, py: state.py, facing: state.facing })); } catch {}
      onStartRun?.();
    }
    if (target.type === "crafting_station") { setAtCraftingStation("crafting_station"); setActiveTab("crafting"); setTabMenuOpen(true); }
    if (["fire_pit", "furnace", "anvil", "potion_stand"].includes(target.type)) {
      setAtCraftingStation(target.type); setActiveTab("crafting"); setTabMenuOpen(true);
    }
    if (target.type === OBJ.TOWN_ENTER) setTownOpen(true);

    // ── Town buildings ──────────────────────────────────────────────────────
    if (target.type === OBJ.BUILDERS_TABLE) {
      setAtCraftingStation("builders_table"); setActiveTab("crafting"); setTabMenuOpen(true);
    }
    if (target.type === OBJ.TREASURY_CHEST) setTreasuryOpen(true);
    if (target.type === OBJ.TOWN_HALL) {
      // Town hall opens the assign panel if no mayor yet; otherwise just a flavour open
      setTalkingNPC(null);  // ensure NPC dialog is closed
      setTreasuryOpen(false);
      // If there's an unassigned resident, open their dialog to the assign tab
      const residents = townRef?.current?.npcs?.filter(n => !n.waitingAtBorder && !n.assignment) ?? [];
      if (residents.length > 0) setTalkingNPC({ ...residents[0], _forceTab: "assign" });
    }

    // ── NPC interaction ─────────────────────────────────────────────────────
    if (target.type === OBJ.NPC) {
      setTalkingNPC(target._npcData ?? null);
    }
  }, [tillTile, untillTile, plantSeed, harvestCrop, waterPlot, hitOreNode, hitTree, fishAtSpot, onPlayerInventoryUpdate, onStartRun, onObjectsUpdate, canStartRun]);

  // ── Active hotbar slot use ─────────────────────────────────────────────────
  const handleUseActiveSlot = useCallback(() => {
    if (ghostRef.current) return;
    const idx  = selectedHotbarIdxRef.current;
    const slot = (hotbarRef.current ?? [])[idx];
    if (!slot) return;

    if (ITEMS[slot.item]?.category === "placeable") {
      const info = PLACEABLES[slot.item];
      if (!info) return;
      const ghost = { id:slot.item, info, rotation:0, gtx:12, gty:12, gw:info.w, gh:info.h };
      setGhostPlacement(ghost); ghostRef.current = ghost;
      return;
    }

    if (EQUIPPABLE[slot.item]) { handleInteract(); return; }

    // Consumable — item now lives on hotbar, just decrement hotbar qty
    if (HOTBAR_ITEMS[slot.item]) {
      const newHotbar = [...(hotbarRef.current ?? [])];
      const newQty = (slot.qty ?? 1) - 1;
      newHotbar[idx] = newQty > 0 ? { ...slot, qty: newQty } : null;
      onHotbarChange?.(newHotbar);
    }
  }, [handleInteract, onPlayerInventoryUpdate, onHotbarChange]);

  // ── Sleep / day-cycle logic ───────────────────────────────────────────────────
  // Ref-stable wrappers so executeSleep/handleSleepConfirm never go stale.
  const sendSleepConfirmedRef = useRef(null);
  const sendSleepCancelledRef = useRef(null);
  const sendSleepRequestedRef = useRef(null);

  const executeSleep = useCallback((broadcast = false) => {
    town?.incrementDay?.();
    town?.checkArrivals?.();
    setSleepPhase(null);
    if (broadcast) sendSleepConfirmedRef.current?.();
  }, [town]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when the local player clicks "sleep" on the modal
  const handleSleepConfirm = useCallback(() => {
    const current = sleepPhaseRef.current;
    if (current === 'confirm') {
      if (!partnerOnlineRef.current) {
        // Solo — just sleep immediately
        executeSleep(false);
      } else {
        // Co-op — broadcast our request and wait
        setSleepPhase('waiting_partner');
        sendSleepRequestedRef.current?.();
      }
    } else if (current === 'partner_requesting') {
      // Partner was waiting — we confirmed, execute and broadcast confirm
      executeSleep(true);
    }
  }, [executeSleep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSleepCancel = useCallback(() => {
    setSleepPhase(null);
    sendSleepCancelledRef.current?.();
  }, []);

  // ── Realtime handlers ──────────────────────────────────────────────────────
  const onChestUpdateRef = useRef(onChestUpdate);
  useEffect(() => { onChestUpdateRef.current = onChestUpdate; }, [onChestUpdate]);
  const onPlayerInventoryUpdateRef = useRef(onPlayerInventoryUpdate);
  useEffect(() => { onPlayerInventoryUpdateRef.current = onPlayerInventoryUpdate; }, [onPlayerInventoryUpdate]);
  const onHotbarChangeRef = useRef(onHotbarChange);
  useEffect(() => { onHotbarChangeRef.current = onHotbarChange; }, [onHotbarChange]);

  const handlers = useRef({
    onPlayerMove: ({ x, y, facing, jumpVY }) => {
      const s = stateRef.current;
      if (s) {
        // Begin a new lerp from current render position to the newly received target
        s.partnerFromX   = s.partnerVisible ? s.partnerRenderX : x;
        s.partnerFromY   = s.partnerVisible ? s.partnerRenderY : y;
        s.partnerToX     = x;
        s.partnerToY     = y;
        s.partnerLerpT   = 0;
        s.partnerLerpDur = 0.12; // slightly longer than broadcast interval to absorb jitter
        s.partnerX       = x;   // raw target, used for step detection
        s.partnerY       = y;
        s.partnerFacing  = facing;
        s.partnerVisible = true;
        if (jumpVY) s.partnerJumpVY = jumpVY;
      }
    },
    onPartnerConnected: () => {
      // A partner just joined — push our current farm and node state so they're
      // immediately in sync rather than seeing a stale/empty world.
      sendFarmUpdatedRef.current?.(farmPlots.current, nodeState.current);
    },
    onPlayerReady: () => setPartnerOnline(true),
    onPlayerAppearance: ({ character:ch, equipment:eq }) => { partnerAppearanceRef.current = { ...partnerAppearanceRef.current, character:ch, equipment:eq }; },
    onChestUpdated: ({ inventory:inv }) => {
      chestRef.current = inv;
      onChestUpdateRef.current?.(inv);
    },
    onObjectPlaced: ({ obj }) => {
      const existing = objectsRef.current.findIndex(o => o.id === obj.id);
      const next = existing !== -1
        ? objectsRef.current.map(o => o.id === obj.id ? obj : o)
        : [...objectsRef.current, obj];
      objectsRef.current = next;
      onObjectsUpdateRef.current?.(next);
    },
    onObjectRemoved: ({ id }) => {
      const next = objectsRef.current.filter(o=>o.id!==id);
      objectsRef.current = next;
      onObjectsUpdateRef.current?.(next);
    },
    onFarmUpdated: ({ plots, nodeState: remoteNodeState }) => {
      // Apply remote farm plots to our tileMap.
      // First pass: reset every tile that WAS tilled/planted back to grass so
      // harvested/removed plots don't linger on the receiver's map.
      const tm = tileMapRef.current;
      const localPlots = farmPlots.current;
      for (const key of Object.keys(localPlots)) {
        const [col, row] = key.split(",").map(Number);
        if (tm[row] && !plots[key]) tm[row][col] = T.GRASS;
      }
      // Second pass: stamp the authoritative remote state
      for (const [key, plot] of Object.entries(plots)) {
        const [col, row] = key.split(",").map(Number);
        if (!tm[row]) continue;
        tm[row][col] = plot.seedId ? T.PLANTED : T.TILLED;
      }
      // Persist and update the ref so crop ticking works locally
      // Use room-scoped keys to match useHomesteadState
      const roomId = room?.id;
      if (roomId) {
        try { localStorage.setItem(`hearthroot_farm_${roomId}`, JSON.stringify(plots)); } catch {}
      }
      farmPlots.current = plots;

      // Apply remote node state (ore depletion, tree chop) if included
      if (remoteNodeState) {
        if (roomId) {
          try { localStorage.setItem(`hearthroot_nodes_${roomId}`, JSON.stringify(remoteNodeState)); } catch {}
        }
        nodeState.current = remoteNodeState;
      }
    },
    onPlayerStateSync: ({ equipment: eq, heldItem: hi }) => {
      // Only update partner's visual equipment and held item (for rendering above head)
      // Do NOT overwrite local inventory/hotbar — those belong to this player
      if (eq) partnerAppearanceRef.current = { ...partnerAppearanceRef.current, equipment: eq };
      if (hi !== undefined) partnerAppearanceRef.current = { ...partnerAppearanceRef.current, heldItem: hi };
    },
    onTownStateUpdated: ({ town_state }) => {
      // Partner's client spawned a new NPC (or other town mutation) — apply it locally.
      // We do NOT re-save or re-broadcast from here to avoid loops.
      town?.applyRemoteTownState?.(town_state);
    },
    onRunQueued: ({ runType, seed }) => setRunJoinPrompt({ runType, seed }),
    onRunCancelled: () => setRunJoinPrompt(null),

    // ── Sleep / day cycle ───────────────────────────────────────────────────
    // Partner pressed [F] on the house and confirmed sleep — are we also ready?
    onSleepRequested: () => {
      if (sleepPhaseRef.current === 'waiting_partner') {
        // We were already waiting — both ready, execute immediately and broadcast confirm
        town?.incrementDay?.();
        town?.checkArrivals?.();
        setSleepPhase(null);
        // We fire sleep_confirmed so the partner's onSleepConfirmed triggers their side
        sendSleepConfirmedRef.current?.();
      } else {
        setSleepPhase('partner_requesting');
      }
    },
    // Partner cancelled their sleep request
    onSleepCancelled: () => {
      setSleepPhase(p => (p === 'partner_requesting' || p === 'both_ready') ? null : p);
    },
    // Both confirmed — execute the sleep on this client too
    onSleepConfirmed: () => {
      town?.incrementDay?.();
      town?.checkArrivals?.();
      setSleepPhase(null);
    },
  }).current;

  const { sendPlayerMove, sendPlayerReady, sendPlayerAppearance, sendObjectPlaced, sendObjectRemoved, sendFarmUpdated, sendPlayerStateSync, sendChestUpdated, sendTownStateUpdated, sendSleepRequested, sendSleepCancelled, sendSleepConfirmed } = useHearthroom(room?.id??null, handlers);

  // Wire sendTownStateUpdated into the town hook so checkArrivals can broadcast.
  // We do this via a ref setter so it survives across re-renders without needing
  // town to be recreated.
  useEffect(() => {
    town?.setSendBroadcast?.(sendTownStateUpdated);
  }, [sendTownStateUpdated]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendObjectPlacedRef  = useRef(sendObjectPlaced);
  const sendObjectRemovedRef = useRef(sendObjectRemoved);
  // Wire sleep send refs (defined after useHearthroom)
  useEffect(() => { sendSleepConfirmedRef.current = sendSleepConfirmed; }, [sendSleepConfirmed]);
  useEffect(() => { sendSleepCancelledRef.current = sendSleepCancelled; }, [sendSleepCancelled]);
  useEffect(() => { sendSleepRequestedRef.current = sendSleepRequested; }, [sendSleepRequested]);
  const sendFarmUpdatedRef   = useRef(sendFarmUpdated);
  const sendPlayerStateSyncRef = useRef(sendPlayerStateSync);
  const sendChestUpdatedRef  = useRef(sendChestUpdated);
  useEffect(() => { sendObjectPlacedRef.current  = sendObjectPlaced;   }, [sendObjectPlaced]);
  useEffect(() => { sendObjectRemovedRef.current = sendObjectRemoved;  }, [sendObjectRemoved]);
  useEffect(() => { sendFarmUpdatedRef.current   = sendFarmUpdated;    }, [sendFarmUpdated]);
  useEffect(() => { sendPlayerStateSyncRef.current = sendPlayerStateSync; }, [sendPlayerStateSync]);
  useEffect(() => { sendChestUpdatedRef.current  = sendChestUpdated;   }, [sendChestUpdated]);

  // Wraps onChestUpdate so every local chest mutation also broadcasts to the partner.
  const broadcastChestUpdate = useCallback((newChest) => {
    onChestUpdate?.(newChest);
    sendChestUpdatedRef.current?.(newChest);
  }, [onChestUpdate]);
  useEffect(() => { sendPlayerReady(); }, []); // eslint-disable-line
  useEffect(() => { sendPlayerAppearance(character, equipment, hotbar); }, [character, equipment, hotbar]); // eslint-disable-line

  // Broadcast equipment + current held item together so partner state is always consistent
  useEffect(() => {
    const slot = (hotbar ?? [])[selectedHotbarIdx];
    sendPlayerStateSync({ equipment, heldItem: slot?.item ?? null });
  }, [equipment, selectedHotbarIdx, hotbar]); // eslint-disable-line

  // ── Key handlers ────────────────────────────────────────────────────────────
  // Keep the latest handler in a ref so the game-loop effect never needs to
  // re-run (and reset the player position) just because tabMenuOpen changed.
  const tabMenuOpenRef   = useRef(tabMenuOpen);
  useEffect(() => { tabMenuOpenRef.current = tabMenuOpen; }, [tabMenuOpen]);
  const handleInteractRef = useRef(handleInteract);
  useEffect(() => { handleInteractRef.current = handleInteract; }, [handleInteract]);
  const onCloseChestRef  = useRef(onCloseChest);
  useEffect(() => { onCloseChestRef.current = onCloseChest; }, [onCloseChest]);

  const onKeyDownImpl = useCallback((e) => {
    keysRef.current[e.key] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    if (e.key==="f"||e.key==="F") {
      // Close any open panel first; only interact if nothing was open
      if (treasuryOpenRef.current)      { setTreasuryOpen(false); return; }
      if (talkingNPCRef.current)        { setTalkingNPC(null);    return; }
      if (townOpenRef.current)          { setTownOpen(false);     return; }
      if (atCraftingStationRef.current) { setAtCraftingStation(false); setTabMenuOpen(false); return; }
      if (tabMenuOpenRef.current)       { setTabMenuOpen(false);  setAtCraftingStation(false); return; }
      handleInteractRef.current();
    }
    if (e.key==="Tab")   { e.preventDefault(); if (tabMenuOpenRef.current) setAtCraftingStation(false); setTabMenuOpen(v=>!v); }
    if (e.key==="c"||e.key==="C") { if (tabMenuOpenRef.current) setAtCraftingStation(false); setTabMenuOpen(v=>!v); }
    if (e.key==="Escape") {
      if (ghostRef.current) { ghostRef.current=null; setGhostPlacement(null); return; }
      if (talkingNPCRef.current) { setTalkingNPC(null); return; }
      if (treasuryOpenRef.current) { setTreasuryOpen(false); return; }
      onCloseChestRef.current?.(); setTabMenuOpen(false); setAtCraftingStation(false); setTownOpen(false);
    }
    const visSlots = Math.min(hotbarSlotsRef.current, HOTBAR_SIZE);
    if (e.key==="q"||e.key==="Q") setSelectedHotbarIdx(i=>{const n=(i-1+visSlots)%visSlots;selectedHotbarIdxRef.current=n;return n;});
    if (e.key==="e"||e.key==="E") {
      // E cycles hotbar only
      setSelectedHotbarIdx(i=>{const n=(i+1)%visSlots;selectedHotbarIdxRef.current=n;return n;});
    }
    if (e.key===" " && stateRef.current && stateRef.current.jumpZ === 0) {
      stateRef.current.jumpVY = -220;
      // Broadcast the jump immediately — do not wait for the 80ms throttle.
      // jumpVY goes positive via gravity within ~300ms, so the throttled path
      // would send jumpVY=0 and the partner would never see the jump.
      sendPlayerMove(stateRef.current.px, stateRef.current.py, stateRef.current.facing, -220);
      stateRef.current.lastBroadcast = performance.now();
    }
  }, []); // stable — reads latest values via refs

  const onKeyDownRef = useRef(onKeyDownImpl);
  // Stable event listener that always delegates to the latest impl
  const onKeyDown = useCallback((e) => onKeyDownRef.current(e), []);
  const onKeyUp   = useCallback((e) => { delete keysRef.current[e.key]; }, []);

  // ── One-time player state init (must not re-run or it resets position) ──────
  useEffect(() => {
    if (!stateRef.current) {
      let savedPx = 8*TILE, savedPy = 9*TILE, savedFacing = "down";
      try {
        const saved = JSON.parse(localStorage.getItem("hearthroot_player_pos") ?? "null");
        if (saved?.px != null) { savedPx = saved.px; savedPy = saved.py; savedFacing = saved.facing ?? "down"; }
      } catch {}
      stateRef.current = {
        px:savedPx, py:savedPy, facing:savedFacing,
        step:0, stepTimer:0, interactTarget:null,
        camX:0, camY:0, lastTime:performance.now(), lastBroadcast:0,
        partnerX:0, partnerY:0, partnerFacing:"down", partnerVisible:false,
        partnerStep:0, partnerStepTimer:0, partnerPrevX:0, partnerPrevY:0,
        // Interpolation: smoothly glide between received network snapshots
        partnerFromX:0, partnerFromY:0,
        partnerToX:0,   partnerToY:0,
        partnerLerpT:1, partnerLerpDur:0.1,
        partnerRenderX:0, partnerRenderY:0,
        jumpZ:0, jumpVY:0,
        partnerJumpZ:0, partnerJumpVY:0,
      };
    }
  }, []); // eslint-disable-line

  // ── Game loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    const onWheel = (e) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive:false });

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime)/1000, 0.05);
      state.lastTime = ts;
      const t = ts/1000;

      let dx=0, dy=0;
      if (keysRef.current["ArrowLeft"] ||keysRef.current["a"]||keysRef.current["A"]) { dx-=1; state.facing="left"; }
      if (keysRef.current["ArrowRight"]||keysRef.current["d"]||keysRef.current["D"]) { dx+=1; state.facing="right"; }
      if (keysRef.current["ArrowUp"]   ||keysRef.current["w"]||keysRef.current["W"]) { dy-=1; state.facing="up"; }
      if (keysRef.current["ArrowDown"] ||keysRef.current["s"]||keysRef.current["S"]) { dy+=1; state.facing="down"; }
      if (dx!==0&&dy!==0) { dx*=0.707; dy*=0.707; }

      const SPEED = 120;
      const entity = { x: state.px, y: state.py, speed: SPEED, w: PLAYER_W, h: PLAYER_H };
      moveEntity(entity, dx, dy, dt, tileMapRef.current, objectsRef.current);
      state.px = entity.x; state.py = entity.y;
      if (dx!==0||dy!==0) { state.stepTimer+=dt; if(state.stepTimer>0.18){state.step=(state.step+1)%4;state.stepTimer=0;} }

      // Jump physics
      if (state.jumpZ !== 0 || state.jumpVY !== 0) {
        state.jumpVY += 600*dt;
        state.jumpZ  += state.jumpVY*dt;
        if (state.jumpZ >= 0) { state.jumpZ=0; state.jumpVY=0; }
      }

      // Partner jump physics
      if (state.partnerJumpZ !== 0 || state.partnerJumpVY !== 0) {
        state.partnerJumpVY += 600*dt;
        state.partnerJumpZ  += state.partnerJumpVY*dt;
        if (state.partnerJumpZ >= 0) { state.partnerJumpZ=0; state.partnerJumpVY=0; }
      }

      const cam = { x: state.camX, y: state.camY };
      updateCamera(cam, state.px, state.py, W, H);
      state.camX = cam.x; state.camY = cam.y;
      const camX = Math.floor(state.camX), camY = Math.floor(state.camY);

      // Tick world state
      const nowMs = performance.now();
      tickCrops(nowMs);
      const nodeStateNow = tickNodes(objectsRef.current, nowMs);
      tickTreeRespawns(objectsRef.current, nowMs, (newObjs) => {
        // Find which trees were just restored and tell the partner
        const prev = objectsRef.current;
        const restored = newObjs.filter(o => o.choppable && !o.chopped && prev.find(p => p.id === o.id && p.chopped));
        objectsRef.current = newObjs;
        onObjectsUpdateRef.current?.(newObjs);
        for (const tree of restored) {
          sendObjectPlacedRef.current?.(tree);
        }
      });

      // ── Tick NPCs ──────────────────────────────────────────────────────────
      const npcs = townRef?.current?.npcs;
      if (npcs?.length) {
        updateNPCs(npcs, objectsRef.current, tileMapRef.current, dt);
        // Sync positions back to town state every 500ms (not every frame)
        npcSyncTimerRef.current = (npcSyncTimerRef.current ?? 0) + dt;
        if (npcSyncTimerRef.current >= 0.5) {
          npcSyncTimerRef.current = 0;
          town?.syncNPCPositions(npcs);
        }
      }

      // Interact target
      state.interactTarget = findInteractTarget(
        state.px, state.py, state.facing,
        tileMapRef.current, objectsRef.current, farmPlots.current,
        (id) => nodeStateNow[id] ?? { depleted:false, hp:3 }
      );

      // ── NPC proximity interact target ──────────────────────────────────────
      // Only override world-object target if NPC is closer
      if (npcs?.length && !state.interactTarget) {
        const nearNPC = findNearbyNPC(state.px, state.py, npcs);
        if (nearNPC) {
          state.interactTarget = {
            type: OBJ.NPC,
            id:   nearNPC.id,
            label: `[F] Talk to ${nearNPC.name}`,
            _npcData: nearNPC,
          };
        }
      }

      // Broadcast movement
      state.lastBroadcast = (state.lastBroadcast||0);
      if (nowMs - state.lastBroadcast > 80 && (dx!==0||dy!==0||state.jumpVY!==0)) {
        sendPlayerMove(state.px, state.py, state.facing, state.jumpVY < 0 ? state.jumpVY : 0);
        state.lastBroadcast = nowMs;
      }

      // Persist position every ~3s so returning from a run restores it
      state.lastPosSave = (state.lastPosSave||0);
      if (nowMs - state.lastPosSave > 3000) {
        try { localStorage.setItem("hearthroot_player_pos", JSON.stringify({ px: state.px, py: state.py, facing: state.facing })); } catch {}
        state.lastPosSave = nowMs;
      }

      // Draw
      ctx.clearRect(0,0,W,H);
      for (let r=0;r<WORLD_ROWS;r++) for (let c=0;c<WORLD_COLS;c++) {
        const tx=c*TILE-camX, ty=r*TILE-camY;
        if (tx>-TILE&&tx<W+TILE&&ty>-TILE&&ty<H+TILE) drawTile(ctx,tileMapRef.current[r][c],tx,ty,TILE,tileNoise,r,c,t);
      }
      drawTownArea(ctx,camX,camY,W,H,t);
      const sortedObj=[...objectsRef.current].sort((a,b)=>(a.ty+a.h)-(b.ty+b.h));
      const targetId = state.interactTarget?.id ?? null;
      for (const obj of sortedObj) {
        const st = nodeStateNow[obj.id];
        const px2=obj.tx*TILE-camX, py2=obj.ty*TILE-camY;
        if (px2>-TILE*4&&px2<W+TILE*4&&py2>-TILE*4&&py2<H+TILE*4) drawObject(ctx,obj,px2,py2,TILE,t,st,targetId);
      }
      // Draw crops + water-drop overlays
      if (farmPlots.current) for (const [key,plot] of Object.entries(farmPlots.current)) {
        const [c,r]=key.split(",").map(Number);
        const sx=c*TILE-camX, sy=r*TILE-camY;
        if (sx<-TILE||sx>W+TILE||sy<-TILE||sy>H+TILE) continue;
        if (plot.seedId) drawCrop(ctx,plot,sx,sy,TILE,t);
        // Water-drop badge on any watered plot (tilled or planted)
        if (plot.wateredAt) drawWaterDrop(ctx,sx,sy,TILE,nowMs,plot.wateredAt);
      }
      // Draw partner
      if (state.partnerVisible) {
  const partnerChar = partnerAppearanceRef.current?.character ?? defaultCharacter();

  // Advance lerp — smoothly glide from last known position to new network snapshot
  if (state.partnerLerpT < 1) {
    state.partnerLerpT = Math.min(1, state.partnerLerpT + dt / Math.max(state.partnerLerpDur, 0.001));
    // Ease-out: feels more natural and masks late packets
    const ease = 1 - Math.pow(1 - state.partnerLerpT, 2);
    state.partnerRenderX = state.partnerFromX + (state.partnerToX - state.partnerFromX) * ease;
    state.partnerRenderY = state.partnerFromY + (state.partnerToY - state.partnerFromY) * ease;
  }

  // Walk animation: based on how fast the render position is moving
  const pdx = state.partnerRenderX - state.partnerPrevX;
  const pdy = state.partnerRenderY - state.partnerPrevY;
  const partnerMoving = Math.abs(pdx) > 0.3 || Math.abs(pdy) > 0.3;
  if (partnerMoving) {
    state.partnerStepTimer += dt;
    if (state.partnerStepTimer > 0.18) { state.partnerStep = (state.partnerStep + 1) % 4; state.partnerStepTimer = 0; }
  } else {
    state.partnerStep = 0; state.partnerStepTimer = 0;
  }
  state.partnerPrevX = state.partnerRenderX;
  state.partnerPrevY = state.partnerRenderY;

  const pscr = { x: state.partnerRenderX - camX, y: state.partnerRenderY - camY };
  const partnerHeldItem = partnerAppearanceRef.current?.heldItem ?? null;
  drawPlayer(ctx, pscr.x, pscr.y, state.partnerFacing, state.partnerStep, partnerChar, t, state.partnerJumpZ, true, partnerHeldItem);
      }
      // Draw NPCs
      if (npcs?.length) {
        for (const npc of npcs) {
          if (npc.waitingAtBorder) continue;
          const nx = npc.x - camX, ny = npc.y - camY;
          if (nx < -TILE*2 || nx > W+TILE*2 || ny < -TILE*2 || ny > H+TILE*2) continue;
          // Highlight ring when this NPC is the interact target
          const isNPCTarget = state.interactTarget?.type === "npc" && state.interactTarget?.id === npc.id;
          if (isNPCTarget) {
            ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(nx, ny + 10, 12, 5, 0, 0, Math.PI*2); ctx.stroke();
          }
          // Draw NPC as a slightly tinted player sprite with a name tag above
          const roster = NPC_ROSTER[npc.npcId] ?? NPC_ROSTER.generic;
          // Use a fixed neutral character appearance for NPCs
          const npcChar = { hair:"short", skin:"medium", outfit:"green", hat:"none" };
          drawPlayer(ctx, nx, ny, npc.facing, Math.floor(npc.step) % 4, npcChar, t, 0, false);
          // Name tag
          ctx.save();
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(245,230,200,0.85)";
          ctx.fillText(npc.name, nx, ny - 6);
          // Mood indicator
          const moodIcon = npc.mood === "happy" ? "😊" : npc.mood === "unhappy" ? "😟" : "";
          if (moodIcon) { ctx.font = "9px serif"; ctx.fillText(moodIcon, nx + 12, ny - 4); }
          ctx.restore();
        }
      }
      // Draw player
      const localHeldItem = (hotbarRef.current ?? [])[selectedHotbarIdxRef.current]?.item ?? null;
      drawPlayer(ctx,state.px-camX,state.py-camY,state.facing,state.step,characterRef.current,t,state.jumpZ,false,localHeldItem);
      // Ghost placement
      const ghost=ghostRef.current;
      if (ghost) {
        const result=drawGhostPlacement(ctx,ghost,state.facing,Math.floor(state.px/TILE),Math.floor(state.py/TILE),camX,camY);
        if (result) ghostRef.current={...ghost,...result};
      }
      // HUD — show player bag used/total
      const inv = playerInvRef.current;
      // Override board label when player has already run today
      const hudTarget = (state.interactTarget?.type === "board" && !canStartRunRef.current)
        ? { ...state.interactTarget, label: "Already ran today — sleep to reset" }
        : state.interactTarget;
      drawHUD(ctx,W,H,inv?.items??{},hudTarget,t,gold);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("wheel",   onWheel);
    };
  }, [room, sendPlayerMove, tickCrops, tickNodes, tickTreeRespawns, onObjectsUpdate, gold]); // eslint-disable-line

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0d0d0a", position:"relative", overflow:"hidden", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
        onClick={()=>{ if(!tabMenuOpen && !townOpen && !treasuryOpen && !talkingNPC && !ghostRef.current) handleUseActiveSlot(); }}
      />
      <PartnerWidget joinCode={room?.join_code??""} partnerOnline={partnerOnline}/>

      <SellToastStack toasts={sellToasts} />

      {sleepPhase && (
        <SleepModal
          phase={sleepPhase}
          partnerOnline={partnerOnline}
          onConfirm={handleSleepConfirm}
          onCancel={handleSleepCancel}
        />
      )}

      {showRunLocked && (
        <RunLockedModal onClose={() => setShowRunLocked(false)} />
      )}

      {runJoinPrompt && !tabMenuOpen && (
        <RunJoinPrompt runType={runJoinPrompt.runType}
          onJoin={()=>{ setRunJoinPrompt(null); onJoinRun?.(runJoinPrompt.seed,runJoinPrompt.runType); }}
          onDecline={()=>setRunJoinPrompt(null)}
        />
      )}

      {townOpen && (
        <TownPanel
          playerInventory={playerInventory}
          chest={chest}
          gold={gold}
          activeRewards={town?.questRewards ?? []}
          marenDiscountActive={getMarenDiscountActive(town?.townState)}
          unlockedItemIds={getUnlockedItemIds(town?.townState?.npcs)}
          onBuyToInventory={(id, price) => {
            if (gold < price) return;
            if (!canFitItem(playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS }, id)) return;
            saveGold(gold - price);
            const items = { ...(playerInvRef.current?.items ?? {}), [id]: ((playerInvRef.current?.items?.[id] ?? 0) + 1) };
            onPlayerInventoryUpdate?.({ ...playerInvRef.current, items });
          }}
          onBuyToChest={(id, price) => {
            if (gold < price) return;
            saveGold(gold - price);
            broadcastChestUpdate(mergeIntoChest(normalizeChest(chestRef.current), { [id]: 1 }));
          }}
          onSellFromInventory={(id, price) => {
            const items = { ...(playerInvRef.current?.items ?? {}) };
            if (!items[id] || items[id] < 1) return;
            items[id]--;
            if (items[id] <= 0) delete items[id];
            saveGold(gold + price);
            onPlayerInventoryUpdate?.({ ...playerInvRef.current, items });
          }}
          onSellFromChest={(id, price) => {
            const newChest = spendFromChest(normalizeChest(chestRef.current), { [id]: 1 });
            if (!newChest) return;
            saveGold(gold + price);
            broadcastChestUpdate(newChest);
          }}
          onSellToast={pushSellToast}
          onClose={()=>setTownOpen(false)}
        />
      )}

      {treasuryOpen && (
        <TreasuryPanel
          town={town}
          playerInventory={playerInventory}
          onPlayerInventoryUpdate={onPlayerInventoryUpdate}
          onClose={() => setTreasuryOpen(false)}
        />
      )}

      {talkingNPC && (
        <NPCDialogPanel
          npc={talkingNPC}
          town={town}
          placedObjects={placedObjectsProp ?? objectsRef.current}
          playerInventory={playerInventory}
          onPlayerInventoryUpdate={onPlayerInventoryUpdate}
          gold={gold}
          onGoldUpdate={saveGold}
          onClose={() => setTalkingNPC(null)}
        />
      )}

      {tabMenuOpen && (
        <TabMenu
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={()=>{ setTabMenuOpen(false); setAtCraftingStation(false); }}
          playerInventory={playerInventory}
          onPlayerInventoryUpdate={onPlayerInventoryUpdate}
          hotbarSlots={hotbarSlots ?? HOTBAR_BASE_SLOTS}
          onHotbarSlotsUpdate={onHotbarSlotsUpdate}
          chest={chest}
          onChestUpdate={broadcastChestUpdate}
          equipment={equipment}
          onEquipItem={onEquipItem}
          hotbar={hotbar??[]}
          onHotbarChange={onHotbarChange}
          onCraftWithInventory={onPlayerInventoryUpdate}
          character={character}
          onCharacterUpdate={onCharacterUpdate}
          farmPlots={farmPlots.current}
          atCraftingStation={atCraftingStation}
          unlockedItemIds={getUnlockedItemIds(town?.townState?.npcs)}
          onStartGhostPlace={(id,info)=>{
            setTabMenuOpen(false); setAtCraftingStation(false);
            const ghost={ id, info, rotation:0, gtx:12, gty:12, gw:info.w, gh:info.h };
            setGhostPlacement(ghost); ghostRef.current=ghost;
          }}
        />
      )}

      {ghostPlacement && (
        <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:10, zIndex:20, background:"rgba(10,18,6,0.88)", border:"1px solid rgba(200,230,120,0.4)", borderRadius:14, padding:"10px 16px", fontFamily:"monospace", boxShadow:"0 4px 24px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:20 }}>{ghostPlacement.info.icon}</span>
          <span style={{ fontSize:12, color:"rgba(200,230,120,0.8)" }}>{ghostPlacement.info.label}</span>
          <span style={{ fontSize:10, color:"rgba(245,230,200,0.3)", marginLeft:2 }}>move to position</span>
          <button onClick={()=>setGhostPlacement(g=>{const n={...g,rotation:(g.rotation+1)%4};ghostRef.current=n;return n;})} style={{ background:"rgba(200,230,120,0.08)",border:"1px solid rgba(200,230,120,0.25)",borderRadius:8,color:"rgba(200,230,120,0.9)",fontSize:14,fontFamily:"monospace",cursor:"pointer",padding:"4px 10px" }}>↻</button>
          <button onClick={()=>{
            const g=ghostRef.current; if(!g) return;
            // If the player already has this placeable in their inventory, consume 1 of it.
            // Otherwise fall back to spending the raw recipe cost (e.g. placing directly from crafting panel).
            const inv = playerInvRef.current;
            const hasItemInInv = (inv?.items?.[g.id] ?? 0) > 0;
            // Also check hotbar — item may have been moved there from inventory
            const hotbarSlotIdx = (hotbarRef.current ?? []).findIndex(s => s?.item === g.id);
            const hasItemInHotbar = hotbarSlotIdx >= 0;
            const hasItem = hasItemInInv || hasItemInHotbar;
            let newInv;
            if (hasItemInInv) {
              newInv = spendFromPlayerInventory(inv, { [g.id]: 1 });
            } else if (hasItemInHotbar) {
              // Item is on hotbar — consume from hotbar slot
              newInv = inv; // inventory unchanged
              const newHotbar = [...(hotbarRef.current ?? [])];
              const hotbarSlot = newHotbar[hotbarSlotIdx];
              const newQty = (hotbarSlot.qty ?? 1) - 1;
              newHotbar[hotbarSlotIdx] = newQty > 0 ? { ...hotbarSlot, qty: newQty } : null;
              onHotbarChange?.(newHotbar);
            } else {
              const cost = { ...(g.info.cost ?? {}) };
              newInv = spendFromPlayerInventory(inv, cost);
            }
            if (!newInv) return; // can't afford
            onPlayerInventoryUpdate?.(newInv);
            const newObj={ id:`${g.id}_${Date.now()}`, type:g.id, tx:g.gtx, ty:g.gty, w:g.gw, h:g.gh, solid:g.info.solid??false, interact:g.info.interact??false, label:g.info.interact?(g.info.interactLabel??`[F] ${g.info.label}`):g.info.label, isPlaceable:true };
            const newObjects=[...objectsRef.current, newObj];
            objectsRef.current=newObjects;
            onObjectsUpdate?.(newObjects);
            sendObjectPlacedRef.current?.(newObj);
            // Auto-assign any NPC whose preferredJob matches this building type
            town?.autoAssignPreferredJobs?.(g.id);
            // Clear the hotbar slot if it held this item and qty is now 0 (inv path only; hotbar path clears above)
            if (hasItemInInv) {
              const remaining = (newInv?.items?.[g.id] ?? 0);
              const newHotbar = [...(hotbar ?? [])];
              let changed = false;
              for (let i = 0; i < newHotbar.length; i++) {
                if (newHotbar[i]?.item === g.id && remaining <= 0) { newHotbar[i] = null; changed = true; break; }
              }
              if (changed) onHotbarChange?.(newHotbar);
            }
            ghostRef.current=null; setGhostPlacement(null);
          }} style={{ background:"rgba(200,230,120,0.14)",border:"1px solid rgba(200,230,120,0.5)",borderRadius:8,color:"rgba(200,230,120,1)",fontSize:12,fontFamily:"monospace",cursor:"pointer",padding:"5px 14px",fontWeight:"bold" }}>okay ✓</button>
          <button onClick={()=>{ghostRef.current=null;setGhostPlacement(null);}} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"rgba(255,255,255,0.35)",fontSize:11,fontFamily:"monospace",cursor:"pointer",padding:"4px 8px" }}>✕</button>
        </div>
      )}

      <HotbarBar
        hotbar={hotbar??[]}
        hotbarSlots={hotbarSlots ?? HOTBAR_BASE_SLOTS}
        equipment={equipment}
        selectedIdx={selectedHotbarIdx}
        onSelectIdx={(idx)=>{ setSelectedHotbarIdx(idx); selectedHotbarIdxRef.current=idx; }}
        onOpenMenu={(tab)=>{setActiveTab(tab??"inventory");setTabMenuOpen(true);}}
        onUseSlot={(idx)=>{
          const slot=(hotbar??[])[idx];
          const isNewSlot = idx !== selectedHotbarIdx;
          setSelectedHotbarIdx(idx); selectedHotbarIdxRef.current=idx;
          if(!slot) return;
          if(EQUIPPABLE[slot.item]) { onEquipItem?.(slot.item); return; }
          if(isNewSlot) return;
          if(ITEMS[slot.item]?.category==="placeable") {
            const info=PLACEABLES[slot.item]; if(!info) return;
            const ghost={id:slot.item,info,rotation:0,gtx:12,gty:12,gw:info.w,gh:info.h};
            setGhostPlacement(ghost); ghostRef.current=ghost;
          } else if(HOTBAR_ITEMS[slot.item]) {
            const newHotbar=[...(hotbar??[])];
            const newQty=(slot.qty??1)-1;
            newHotbar[idx]=newQty>0?{...slot,qty:newQty}:null;
            onHotbarChange?.(newHotbar);
          }
        }}
      />
    </div>
  );
}