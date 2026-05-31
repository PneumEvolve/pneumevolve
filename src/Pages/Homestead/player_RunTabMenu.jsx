// src/Pages/Homestead/player_RunTabMenu.jsx
//
// Run-mode tab menu (My Bag / Chest / Crafting / Equipment), shared by every
// run scene. Previously three near-identical copies lived inline in
// ForestRun, MiningRun, and FruitRun — each ~700 lines. This is the
// canonical version (taken from ForestRun, which was the most complete).
// Capabilities currently vary only by data — runs without upgrades just
// render an empty upgrades section.
//
// Open from the run by mounting this component when a "menu open" flag is
// set. While mounted, the host's game loop should pause.

import React, { useState, useRef, useEffect } from "react";
import {
  ITEMS, ITEM_ICONS,
  EQUIPPABLE, HOTBAR_ITEMS, PLACEABLES, UPGRADES,
  expandedHandRecipes, canCraftByKey, craftItemByKey, resolveHandRecipeKey,
  applyUpgrade, getEquipStats, getWeaponDurability,
  HOTBAR_SIZE, HOTBAR_BASE_SLOTS, INVENTORY_BASE_SLOTS,
  normalizeChest, chestToMap,
  getToolMaxDurability, isInstancedTool,
  getToolInstances, equipToolInstance,
} from "./Items";
import { ItemIcon } from "./ItemIcon";
import { StatPill } from "./player_StatPill";
import { pickTabs, RUN_TAB_IDS } from "./player_tabs";

const RUN_TABS = pickTabs(RUN_TAB_IDS);

export function RunTabMenu({
  activeTab, onTabChange, onClose,
  playerInventory, onPlayerInventoryUpdate,
  hotbarSlots, onHotbarSlotsUpdate,
  chest,
  equipment, onEquipItem, onEquipmentUpdate,
  hotbar, onHotbarChange,
  onDropItem, // (itemId, qty) — drops to the ground at the player's feet
}) {
  const [craftMsg, setCraftMsg]     = useState(null);
  const [dragOverSlot, setDragOver] = useState(null);
  const [chestTab, setChestTab]     = useState("resources");
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const playerItems = playerInventory?.items ?? {};
  const hotbarItemIds = new Set((hotbar ?? []).filter(Boolean).map(s => s.item));
  const usedSlotsCount = Object.entries(playerItems)
    .filter(([, v]) => v > 0)
    .reduce((sum, [k, v]) => {
      const item = ITEMS[k];
      if (item && item.stackable === false) {
        // Non-stackable: inventory qty is tracked separately from the hotbar copy,
        // so the remaining qty here is exactly what's still in the bag — count it.
        return sum + v;
      }
      // Stackable: the whole stack moves to the hotbar, so a hotbar entry means
      // it no longer occupies a bag slot.
      return sum + (hotbarItemIds.has(k) ? 0 : 1);
    }, 0);
  const totalSlots = playerInventory?.slots ?? INVENTORY_BASE_SLOTS;

  // Block spacebar scroll while menu open
  useEffect(() => {
    const block = (e) => { if (e.key===" "||e.code==="Space") e.preventDefault(); };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // Confine wheel events so the world behind doesn't scroll
  useEffect(() => {
    const overlay = overlayRef.current, content = contentRef.current;
    if (!overlay || !content) return;
    const blockOverlay = (e) => e.preventDefault();
    overlay.addEventListener("wheel", blockOverlay, { passive:false });
    const handleContent = (e) => {
      const atTop = content.scrollTop <= 0;
      const atBottom = content.scrollTop+content.clientHeight >= content.scrollHeight-1;
      if ((e.deltaY < 0 && !atTop)||(e.deltaY > 0 && !atBottom)) e.stopPropagation();
    };
    content.addEventListener("wheel", handleContent, { passive:true });
    return () => { overlay.removeEventListener("wheel", blockOverlay); content.removeEventListener("wheel", handleContent); };
  }, []);

  function assignToHotbarSlot(itemId, slotIdx, iid = null) {
    const invQty = (playerItems[itemId] ?? 0) > 0 ? playerItems[itemId] : undefined;
    const isStackable = ITEMS[itemId]?.stackable !== false;
    const isInstanced = isInstancedTool(itemId);
    const newHotbar = [...(hotbar ?? [])];
    const displaced = newHotbar[slotIdx];
    let newInv = playerInventory ?? { items: {}, slots: INVENTORY_BASE_SLOTS };
    const newItems = { ...(newInv.items ?? {}) };
    const newToolInstances = { ...(newInv.toolInstances ?? {}) };

    const returnHotbarSlotToInventory = (slot) => {
      if (!slot) return;
      if (isInstancedTool(slot.item) && slot.iid) {
        const arr = newToolInstances[slot.item] ?? [];
        newToolInstances[slot.item] = [...arr, { iid: slot.iid, dur: slot.dur ?? getToolMaxDurability(slot.item) }];
        newItems[slot.item] = (newItems[slot.item] ?? 0) + 1;
      } else {
        newItems[slot.item] = (newItems[slot.item] ?? 0) + (slot.qty ?? 1);
      }
    };

    // ── INSTANCED TOOLS ─────────────────────────────────────────────────────
    if (isInstanced) {
      const invInstances = newToolInstances[itemId] ?? [];
      let pickIdx = iid ? invInstances.findIndex(t => t.iid === iid) : 0;
      if (pickIdx < 0) pickIdx = 0;
      const picked = invInstances[pickIdx];
      if (!picked) return;

      if (displaced?.item === itemId && displaced?.iid === picked.iid) {
        if (onEquipmentUpdate) {
          const patched = equipToolInstance(equipment, itemId, picked.iid);
          if (patched !== equipment) onEquipmentUpdate(patched);
        }
        return;
      }

      returnHotbarSlotToInventory(displaced);

      const remaining = invInstances.filter((_, i) => i !== pickIdx);
      if (remaining.length === 0) delete newToolInstances[itemId];
      else newToolInstances[itemId] = remaining;
      const bagCount = (newItems[itemId] ?? 0) - 1;
      if (bagCount > 0) newItems[itemId] = bagCount;
      else delete newItems[itemId];

      newHotbar[slotIdx] = { item: itemId, iid: picked.iid, dur: picked.dur };

      if (onEquipmentUpdate) {
        const patched = equipToolInstance(equipment, itemId, picked.iid);
        if (patched !== equipment) onEquipmentUpdate(patched);
      }

      onPlayerInventoryUpdate?.({ ...newInv, items: newItems, toolInstances: newToolInstances });
      onHotbarChange?.(newHotbar);
      return;
    }

    // ── STACKABLE ITEMS ─────────────────────────────────────────────────────
    if (isStackable) {
      const moveQty = invQty ?? 1;
      if (displaced?.item === itemId) {
        const mergedQty = (displaced.qty ?? 0) + moveQty;
        newHotbar[slotIdx] = { item: itemId, qty: mergedQty };
        const remaining = (invQty ?? 0) - moveQty;
        if (remaining > 0) newItems[itemId] = remaining;
        else delete newItems[itemId];
      } else {
        newHotbar[slotIdx] = { item: itemId, qty: moveQty };
        const remaining = (invQty ?? 0) - moveQty;
        if (remaining > 0) newItems[itemId] = remaining;
        else if (newItems[itemId] > 0) delete newItems[itemId];
        if (displaced?.item && displaced.item !== itemId) returnHotbarSlotToInventory(displaced);
      }
      onPlayerInventoryUpdate?.({ ...newInv, items: newItems, toolInstances: newToolInstances });
      onHotbarChange?.(newHotbar);
      return;
    }

    // ── Non-instanced non-stackable fallback ────────────────────────────────
    newHotbar[slotIdx] = { item: itemId, qty: 1 };
    const remaining = (invQty ?? 0) - 1;
    if (remaining > 0) newItems[itemId] = remaining;
    else delete newItems[itemId];
    if (displaced?.item && displaced.item !== itemId) returnHotbarSlotToInventory(displaced);
    onPlayerInventoryUpdate?.({ ...newInv, items: newItems, toolInstances: newToolInstances });
    onHotbarChange?.(newHotbar);
  }

  // ── Hotbar drop zone (shown in My Bag tab) ──────────────────────────────────
  function HotbarDropZone() {
    const visible = Math.min(hotbarSlots ?? HOTBAR_BASE_SLOTS, HOTBAR_SIZE);
    return (
      <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#0f1709" }}>
        <p style={{ fontSize:9, color:"rgba(245,230,200,0.22)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:7 }}>hotbar — drag any item onto a slot</p>
        <div style={{ display:"flex", gap:5 }}>
          {Array.from({ length: visible }).map((_, idx) => {
            const slot = (hotbar ?? [])[idx];
            const isOver = dragOverSlot===idx;
            const isEq = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot]===slot?.item;
            return (
              <div key={idx}
                onDrop={e=>{e.preventDefault();const n=e.dataTransfer.getData("hotbar_item");const iid=e.dataTransfer.getData("hotbar_iid")||null;if(n)assignToHotbarSlot(n,idx,iid);setDragOver(null);}}
                onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";setDragOver(idx);}}
                onDragLeave={()=>setDragOver(null)}
                style={{ width:50, height:54, borderRadius:9, background:isOver?"rgba(200,230,120,0.18)":slot?"rgba(10,18,6,0.7)":"rgba(255,255,255,0.03)", border:`2px solid ${isOver?"rgba(200,230,120,0.9)":isEq?"rgba(100,200,255,0.5)":slot?"rgba(200,230,120,0.3)":"rgba(255,255,255,0.1)"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, position:"relative", transition:"all 0.1s" }}>
                {slot ? (
                  <>
                    <ItemIcon id={slot.item} size={22} />
                    <span style={{ fontSize:8, color:"rgba(200,230,120,0.6)", lineHeight:1, fontFamily:"monospace", maxWidth:46, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ITEMS[slot.item]?.label?.toLowerCase()?.slice(0,6)??slot.item}</span>
                    {slot.qty!=null&&<span style={{ fontSize:9, color:"rgba(200,230,120,0.7)" }}>{slot.qty}</span>}
                    {isEq&&<div style={{ position:"absolute", top:3, right:3, width:6, height:6, borderRadius:"50%", background:"rgba(100,200,255,0.9)" }}/>}
                    <button onClick={()=>{
                      const n=[...(hotbar??[])];
                      const s=n[idx];
                      n[idx]=null;
                      onHotbarChange?.(n);
                      if (s?.item) {
                        const inv = playerInventory ?? { items: {}, slots: INVENTORY_BASE_SLOTS };
                        const newItems = { ...(inv.items ?? {}) };
                        const newToolInstances = { ...(inv.toolInstances ?? {}) };
                        if (isInstancedTool(s.item) && s.iid) {
                          const arr = newToolInstances[s.item] ?? [];
                          newToolInstances[s.item] = [...arr, { iid: s.iid, dur: s.dur ?? getToolMaxDurability(s.item) }];
                          newItems[s.item] = (newItems[s.item] ?? 0) + 1;
                        } else {
                          newItems[s.item] = (newItems[s.item] ?? 0) + (s.qty ?? 1);
                        }
                        onPlayerInventoryUpdate?.({ ...inv, items: newItems, toolInstances: newToolInstances });
                      }
                    }} style={{ position:"absolute", top:-5, right:-5, width:15, height:15, borderRadius:"50%", background:"rgba(255,80,80,0.8)", border:"none", color:"#fff", fontSize:9, cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
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

  // Helper: remove `qty` of itemId from the player inventory.
  // For instanced tools (axes etc.) we also remove `qty` instances from
  // inventory.toolInstances so the instance registry stays in sync with the
  // bag count — otherwise dropping a tool leaves a ghost iid behind.
  function removeFromBag(itemId, qty) {
    const inv = playerInventory ?? { items: {}, slots: INVENTORY_BASE_SLOTS };
    const items = { ...(inv.items ?? {}) };
    const have = items[itemId] ?? 0;
    const removed = Math.min(have, qty);
    if (removed <= 0) return null;
    items[itemId] = have - removed;
    if (items[itemId] <= 0) delete items[itemId];

    let toolInstances = inv.toolInstances;
    if (isInstancedTool(itemId) && toolInstances?.[itemId]?.length) {
      const arr = toolInstances[itemId];
      const remaining = arr.slice(0, Math.max(0, arr.length - removed));
      toolInstances = { ...toolInstances };
      if (remaining.length === 0) delete toolInstances[itemId];
      else toolInstances[itemId] = remaining;
    }

    onPlayerInventoryUpdate?.({ ...inv, items, toolInstances });
    return removed;
  }

  function dropFromBag(itemId, qty) {
    const removed = removeFromBag(itemId, qty);
    if (removed > 0) onDropItem?.(itemId, removed);
  }

  // ── Tab: My Bag ─────────────────────────────────────────────────────────────
  function InventoryTab() {
    const allItems = Object.entries(playerItems).filter(([,v])=>v>0);
    const resources   = allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]&&!PLACEABLES[k]&&!UPGRADES[k]);
    const consumables = allItems.filter(([k])=>!!HOTBAR_ITEMS[k]);
    const gear        = allItems.filter(([k])=>!!EQUIPPABLE[k]);
    const upgrades    = allItems.filter(([k])=>!!UPGRADES[k]);

    const itemStyle = { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, cursor:"grab", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", userSelect:"none" };

    function DropButtons({ id, qty }) {
      return (
        <div style={{ display:"flex", alignItems:"center", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid rgba(255,100,80,0.22)", flexShrink:0 }}>
          <button
            title="Drop 1"
            onClick={(e)=>{e.stopPropagation();dropFromBag(id,1);}}
            style={{ fontSize:10, padding:"3px 8px", cursor:"pointer", background:"rgba(255,100,80,0.06)", border:"none", borderRight: qty > 1 ? "1px solid rgba(255,100,80,0.18)" : "none", color:"rgba(255,150,130,0.85)", fontFamily:"monospace", lineHeight:1.4 }}
          >drop</button>
          {qty > 1 && (
            <button
              title={`Drop all (${qty})`}
              onClick={(e)=>{e.stopPropagation();dropFromBag(id,qty);}}
              style={{ fontSize:10, padding:"3px 6px", cursor:"pointer", background:"rgba(255,100,80,0.10)", border:"none", color:"rgba(255,160,140,0.8)", fontFamily:"monospace", lineHeight:1.4 }}
            >all</button>
          )}
        </div>
      );
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
            <p style={{ fontSize:10, color:"rgba(255,120,80,0.7)", marginTop:6 }}>Bag full — drop items below to free up space.</p>
          )}
        </div>

        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>bag is empty</p>}

        {resources.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Resources</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:6 }}>
              {resources.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", cursor:"grab" }}>
                  <ItemIcon id={id} size={22} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:9, color:"rgba(245,230,200,0.4)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:15, color:"rgba(200,230,120,0.9)" }}>{qty}</div>
                  </div>
                  <DropButtons id={id} qty={qty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Consumables — drag to hotbar to use mid-fight</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {consumables.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  onClick={()=>{const ei=(hotbar??[]).findIndex(s=>!s);const si=ei>=0?ei:0;assignToHotbarSlot(id,si);}}
                  style={{ ...itemStyle, background:"rgba(255,200,80,0.07)", border:"1px solid rgba(255,200,80,0.25)" }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>×{qty} · drag → hotbar</div>
                  </div>
                  <DropButtons id={id} qty={qty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {gear.filter(([id])=>EQUIPPABLE[id]?.slot==="weapon").length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Tools &amp; Weapons — drag to hotbar</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {gear.filter(([id])=>EQUIPPABLE[id]?.slot==="weapon").flatMap(([id]) => {
                // One card per real instance in the bag. Each instance has a
                // stable iid and its own durability. Tools that already moved
                // to the hotbar don't show up here — they live on the hotbar.
                const maxDur = ITEMS[id]?.maxDurability ?? null;
                const instances = getToolInstances(playerInventory, id);
                if (instances.length === 0) return [];
                const cardCount = instances.length;
                return instances.map((inst, idx) => {
                  const isActive = equipment?.weapon === id && equipment?.activeIid === inst.iid;
                  const curDur   = inst.dur ?? maxDur;
                  const label    = cardCount > 1 ? `${ITEMS[id]?.label ?? id} #${idx + 1}` : (ITEMS[id]?.label ?? id);
                  return (
                    <div key={inst.iid}
                      draggable
                      onDragStart={e=>{
                        e.dataTransfer.setData("hotbar_item", id);
                        e.dataTransfer.setData("hotbar_iid", inst.iid);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => {
                        const empty = (hotbar??[]).findIndex(s=>!s);
                        const target = empty >= 0 ? empty : 0;
                        assignToHotbarSlot(id, target, inst.iid);
                      }}
                      style={{ ...itemStyle, cursor:"pointer", background:"rgba(200,230,120,0.05)", border:`1px solid ${isActive?"rgba(100,200,255,0.45)":"rgba(200,230,120,0.2)"}` }}>
                      <ItemIcon id={id} size={26} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{label}</div>
                        <div style={{ fontSize:10, color: isActive?"rgba(100,200,255,0.7)":"rgba(255,255,255,0.3)" }}>
                          {isActive ? "✓ equipped" : "click / drag → equip this one"}
                        </div>
                        {curDur != null && maxDur != null && (
                          <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:50, height:4, background:"rgba(0,0,0,0.4)", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ width:`${(curDur/maxDur)*100}%`, height:"100%", background:(curDur/maxDur)>0.5?"#80d860":(curDur/maxDur)>0.25?"#e8c840":"#e04840" }} />
                            </div>
                            <span style={{ fontSize:8, color:"rgba(200,230,160,0.5)", fontFamily:"monospace" }}>{curDur}/{maxDur}</span>
                          </div>
                        )}
                      </div>
                      <DropButtons id={id} qty={1} />
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}

        {gear.filter(([id])=>EQUIPPABLE[id]?.slot!=="weapon").length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Armor &amp; Accessories — click to equip</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {gear.filter(([id])=>EQUIPPABLE[id]?.slot!=="weapon").map(([id, qty]) => {
                const eq = EQUIPPABLE[id]; const isEq = equipment?.[eq?.slot]===id;
                return (
                  <div key={id}
                    draggable
                    onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                    onClick={()=>onEquipItem?.(id)}
                    style={{ ...itemStyle, cursor:"pointer", background:"rgba(200,230,120,0.05)", border:"1px solid rgba(200,230,120,0.2)" }}>
                    <ItemIcon id={id} size={26} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                      <div style={{ fontSize:10, color:isEq?"rgba(100,200,255,0.7)":"rgba(255,255,255,0.3)" }}>{isEq?"✓ equipped":"click to equip"}</div>
                    </div>
                    <DropButtons id={id} qty={qty} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upgrades.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Upgrades — click to apply</p>
            {upgrades.map(([id, qty]) => {
              const it = ITEMS[id];
              return (
                <div key={id} onClick={() => {
                  const { inv: newInv, hotbarSlots: newHbs } = applyUpgrade(playerInventory, hotbarSlots ?? HOTBAR_BASE_SLOTS, id);
                  onPlayerInventoryUpdate?.(newInv);
                  onHotbarSlotsUpdate?.(newHbs);
                }} style={{ ...itemStyle, cursor:"pointer", background:"rgba(120,80,200,0.08)", border:"1px solid rgba(120,80,200,0.25)" }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"rgba(180,150,230,0.9)" }}>{it?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{it?.description}</div>
                  </div>
                  <span style={{ fontSize:11, color:"rgba(120,80,200,0.8)", fontFamily:"monospace" }}>use</span>
                  <DropButtons id={id} qty={qty} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Chest (read-only, at home) ─────────────────────────────────────────
  function ChestTab() {
    const allItems = Object.entries(chestToMap(normalizeChest(chest))).filter(([,v])=>v>0);
    const resources   = allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]&&!PLACEABLES[k]);
    const consumables = allItems.filter(([k])=>!!HOTBAR_ITEMS[k]);
    const gear        = allItems.filter(([k])=>!!EQUIPPABLE[k]);
    const placeables  = allItems.filter(([k])=>!!PLACEABLES[k]);

    const subTabs = [
      { id:"resources",   label:"Resources",   list: resources },
      { id:"consumables", label:"Food",        list: consumables },
      { id:"gear",        label:"Gear",        list: gear },
      { id:"placeables",  label:"Placeables",  list: placeables },
    ].filter(s => s.list.length > 0);

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.12)", fontSize:10, color:"rgba(180,200,100,0.55)", lineHeight:1.6 }}>
          📦 Your shared chest is back at the homestead. You can see what's in it, but you can't deposit or withdraw from out here in the forest.
        </div>

        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>chest is empty</p>}

        {subTabs.length > 0 && (
          <>
            <div style={{ display:"flex", gap:2, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {subTabs.map(st => (
                <button key={st.id} onClick={() => setChestTab(st.id)} style={{ padding:"7px 11px", background:"transparent", border:"none", borderBottom:`2px solid ${chestTab===st.id?"rgba(180,200,100,0.7)":"transparent"}`, color:chestTab===st.id?"rgba(180,200,100,0.9)":"rgba(245,230,200,0.32)", fontSize:10, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                  {st.label} ({st.list.length})
                </button>
              ))}
            </div>
            {(subTabs.find(s => s.id === chestTab)?.list ?? []).map(([id, qty]) => {
              const it = ITEMS[id];
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.12)" }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"rgba(180,200,100,0.85)" }}>{it?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>×{qty} at home</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // ── Tab: Crafting (hand-craft only, no station in the forest) ───────────────
  function CraftingTab() {
    function handleCraft(key) {
      const newInv = craftItemByKey(key, playerInventory);
      if (newInv) {
        onPlayerInventoryUpdate?.(newInv);
        const outputId = resolveHandRecipeKey(key);
        setCraftMsg(`Crafted ${ITEMS[outputId]?.label??outputId}!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    const handCraftables = expandedHandRecipes();
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
          {Object.entries(playerItems).filter(([,v])=>v>0).map(([id,qty])=>(
            <span key={id} style={{ fontSize:10,padding:"3px 7px",borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(245,230,200,0.6)" }}>
              {ITEM_ICONS[id]??""} {qty} {ITEMS[id]?.label??id}
            </span>
          ))}
        </div>
        <div style={{ padding:"14px",borderRadius:12,background:"rgba(200,230,120,0.04)",border:"1px solid rgba(200,230,120,0.15)" }}>
          <p style={{ fontSize:10,color:"rgba(200,230,120,0.5)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12 }}>⚒ craft by hand</p>
          {handCraftables.length === 0 && <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>nothing to hand-craft</p>}
          {handCraftables.map(([key, recipe]) => {
            const outputId = resolveHandRecipeKey(key);
            const craftable = canCraftByKey(key, playerInventory);
            const it = ITEMS[outputId];
            return (
              <div key={key} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:craftable?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${craftable?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}`,opacity:craftable?1:0.5,marginTop:8 }}>
                <ItemIcon id={outputId} size={26} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??outputId}</div>
                  <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)" }}>
                    {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;return <span key={ing} style={{ marginRight:8,color:have>=qty?"rgba(200,230,120,0.7)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty} {ITEMS[ing]?.label??ing}</span>;})}
                  </div>
                </div>
                <button disabled={!craftable} onClick={()=>handleCraft(key)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${craftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:craftable?"rgba(200,230,120,0.1)":"transparent",color:craftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:craftable?"pointer":"default" }}>craft</button>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",textAlign:"center",fontSize:11,color:"rgba(245,230,200,0.35)" }}>
          🔒 Station recipes (smelting, cooking, brewing, gear) are only available at the homestead.
        </div>
      </div>
    );
  }

  // ── Tab: Equipment ──────────────────────────────────────────────────────────
  function EquipmentTab() {
    const stats = getEquipStats(equipment);
    const equippableInBag = Object.entries(playerItems).filter(([k,v])=>v>0&&EQUIPPABLE[k]).map(([k])=>k);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {["weapon","armor","accessory"].map(slot=>{
          const item=equipment?.[slot]; const info=item?EQUIPPABLE[item]:null;
          return(
            <div key={slot} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:item?"rgba(200,230,120,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${item?"rgba(200,230,120,0.18)":"rgba(255,255,255,0.06)"}` }}>
              <ItemIcon id={item} size={26} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.1em",textTransform:"uppercase" }}>{slot}</div>
                <div style={{ fontSize:13,color:item?"rgba(200,230,120,0.85)":"rgba(255,255,255,0.18)" }}>{info?.label??"empty"}</div>
                {info&&<div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{Object.entries(info.stats??{}).map(([k,v])=>`${k}:${v}`).join("  ")}</div>}
                {item && slot === "weapon" && (() => {
                  const dur = getWeaponDurability(equipment, playerInventory, hotbar);
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
                <ItemIcon id={name} size={26} />
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

  const tabContent = {
    inventory: <InventoryTab/>,
    chest:     <ChestTab/>,
    crafting:  <CraftingTab/>,
    equipment: <EquipmentTab/>,
  };

  return (
    <div ref={overlayRef} style={{ position:"absolute",inset:0,background:"rgba(4,12,4,0.86)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,backdropFilter:"blur(2px)",overflow:"hidden" }} onClick={onClose}>
      <div style={{ background:"#111a0b",border:"1px solid rgba(180,220,100,0.22)",borderRadius:18,width:540,maxWidth:"97vw",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"monospace",color:"#f5e6c8",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:0 }}>
          <div style={{ fontSize:11,color:"rgba(200,230,120,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",paddingBottom:14 }}>🌲 forest — menu</div>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"rgba(255,255,255,0.3)",fontSize:12,fontFamily:"monospace",cursor:"pointer",padding:"3px 9px",marginBottom:14 }}>✕  esc</button>
        </div>
        <div style={{ display:"flex",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 6px",scrollbarWidth:"none" }}>
          {RUN_TABS.map(tab=>{const active=activeTab===tab.id;return(
            <button key={tab.id} onClick={()=>onTabChange(tab.id)} style={{ flex:"0 0 auto",padding:"10px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${active?"rgba(200,230,120,0.8)":"transparent"}`,color:active?"rgba(200,230,120,0.95)":"rgba(245,230,200,0.4)",fontSize:12,fontFamily:"monospace",cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
              {tab.icon}
            </button>
          );})}
        </div>
        {activeTab==="inventory" && <HotbarDropZone/>}
        <div ref={contentRef} style={{ flex:1,overflowY:"auto",padding:"18px 20px",scrollbarWidth:"thin",scrollbarColor:"rgba(200,230,120,0.15) transparent" }}>
          {tabContent[activeTab]}
        </div>
        <div style={{ padding:"8px 18px",borderTop:"1px solid rgba(255,255,255,0.05)",fontSize:9,color:"rgba(245,230,200,0.2)",textAlign:"center",letterSpacing:"0.08em" }}>
          Tab / Esc to close  ·  drop items to free up bag slots
        </div>
      </div>
      {craftMsg && (
        <div style={{
          position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
          zIndex:30, pointerEvents:"none",
          background:"rgba(10,20,8,0.92)", border:"1px solid rgba(200,230,120,0.35)",
          borderRadius:10, padding:"8px 18px",
          fontFamily:"monospace", fontSize:13, color:"rgba(200,230,120,0.95)",
          boxShadow:"0 4px 18px rgba(0,0,0,0.55)", whiteSpace:"nowrap",
        }}>
          ✓ {craftMsg}
        </div>
      )}
    </div>
  );
}