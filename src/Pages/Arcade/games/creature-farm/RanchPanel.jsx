// src/Pages/Arcade/games/creature-farm/RanchPanel.jsx
//
// The Ranch panel — managing the farm with menus instead of walking around.
//   Overview   coins, storage, what needs attention, "while you were away"
//   Creatures  needs, skills, job, buddy for every creature
//   Workshops  build/upgrade, recipes, crafters, progress
//   Market     contracts board, prices (they move), sell/buy, Hauler rules
//   Buildings  trough, shed, warehouse, beds, market stall
//   Storage    everything you've got, how full each store is, the trough
//
// Used two ways (see CreatureFarm.jsx):
//   layout="manager"  Manager mode: big panel, the farm keeps running beside it
//   layout="drawer"   Walk mode: the "Ranch" button opens it as a drawer
// No emojis: icons are drawn in code.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../../ui";
import { SPECIES, CROPS } from "./species";
import { drawCreature, drawBowl, drawSun, drawItemIcon, drawSprout, drawEgg } from "./drawFarm";
import { movesFor, ABILITIES as MOVES } from "./wilds/wildsSim";
import { RARITY_INFO, HATCHERY_MAX, hatcheryCost, eggPreview, typeLabel, typeCounts, GROW_SECS, growRate, canAfford, hatcherySpeed, hatcheryUpgrade } from "./eggs";
import { plotCost, PLOT_COUNT } from "./farmWorld";
import {
  JOBS, SKILLS, SKILL_NAMES, BUILDINGS, STORE_ITEMS, stateOf, STATE_TEXT, canManage, chemistry,
  nextUpgrade, troughCap, storageCap, warehouseCap, capFor, xpForNext, plotsPerFarmhand,
  ITEMS, ITEM_KEYS, ITEM_GROUPS, PRODUCT_OF, WORKSHOPS, nextWorkshop, wsSpeed, skillFactor, hasGoods,
  priceOf, buyPriceOf, canBuy, fmtCoins, makesGoods, PRODUCE_SECS, CONTRACT_MAX, missingInputs, usable, FOOD_RESERVE,
  forecast, jobRate, farmhandShare, PRODUCE_HAPPY, STOP_HAPPY, STOP_HUNGER,
  inMeadow, housedCount, penSlots, penCost, rehomePrice,
} from "./ranch";

// Manager mode panel width (the farm view uses the rest of the screen).
export const MANAGER_PANEL_W = "min(100%, max(58%, 560px))";

const TABS = [["overview", "Overview"], ["forecast", "Forecast"], ["creatures", "Creatures"], ["workshops", "Workshops"], ["hatchery", "Hatchery"], ["market", "Market"], ["buildings", "Buildings"], ["storage", "Storage"]];

export default function RanchPanel({ world, W, myId, nameOf, colorOf, layout = "drawer", tab: tab0 = "overview", onClose, onSwitchMode, onFollow, reportKey }) {
  const [tab, setTab] = useState(tab0);
  useEffect(() => setTab(tab0), [tab0]);
  const coins = Math.floor(world.coins || 0);
  const isManager = layout === "manager";
  const now = W.now ? W.now() : Date.now();
  const alerts = alertsFor(world, now);

  const shell = isManager
    ? { position: "absolute", top: 48, right: 0, bottom: 0, width: MANAGER_PANEL_W, zIndex: 40, borderTopLeftRadius: 16 }
    : { position: "absolute", top: 48, right: 0, bottom: 0, width: "min(100%, 460px)", zIndex: 45, borderTopLeftRadius: 16 };

  return (
    <div style={{ ...shell, background: "rgba(18,14,34,0.97)", borderLeft: "1px solid rgba(255,255,255,0.12)", color: C.text, display: "flex", flexDirection: "column", fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif", boxShadow: "-8px 0 24px rgba(0,0,0,0.35)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontWeight: 900, fontSize: 18, flex: 1 }}>{isManager ? "Ranch Manager" : "Ranch"}</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 900, color: "#ffd65a", fontSize: 16 }}><CoinIcon /> {coins}</span>
        {onSwitchMode && <button onClick={onSwitchMode} style={btn()}>{isManager ? "Walk around" : "Manager mode"}</button>}
        {!isManager && <button onClick={onClose} style={btn()}>close</button>}
      </div>
      {/* tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", overflowX: "auto" }}>
        {TABS.map(([id, label]) => {
          const n = id === "overview" ? alerts.length : id === "market" ? (world.contracts || []).length : 0;
          return (
            <button key={id} onClick={() => setTab(id)} style={btn(tab === id, { padding: "7px 12px", whiteSpace: "nowrap" })}>
              {label}{n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {tab === "overview" && <Overview world={world} now={now} alerts={alerts} setTab={setTab} reportKey={reportKey} />}
        {tab === "forecast" && <Forecast world={world} now={now} setTab={setTab} />}
        {tab === "creatures" && <Creatures world={world} W={W} myId={myId} nameOf={nameOf} colorOf={colorOf} onFollow={onFollow} />}
        {tab === "workshops" && <Workshops world={world} W={W} myId={myId} />}
        {tab === "hatchery" && <Hatchery world={world} W={W} myId={myId} now={now} />}
        {tab === "market" && <Market world={world} W={W} now={now} />}
        {tab === "buildings" && <Buildings world={world} W={W} />}
        {tab === "storage" && <Storage world={world} W={W} setTab={setTab} />}
      </div>
    </div>
  );
}

// ── What needs attention ──────────────────────────────────────────────────────
export function alertsFor(w, now = Date.now()) {
  const out = [];
  const cs = Object.values(w.creatures || {});
  const by = (s) => cs.filter(c => stateOf(c) === s);
  const starving = by("starving"), sad = by("sad"), idle = by("idle");
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (w.trough?.[k] || 0), 0);
  const feeders = cs.filter(c => c.job === "feeder" && stateOf(c) === "working").length;
  if (starving.length) out.push({ level: "bad", text: `${names(starving)} ${starving.length > 1 ? "are" : "is"} too hungry to work`, tab: "storage" });
  if (sad.length) out.push({ level: "bad", text: `${names(sad)} ${sad.length > 1 ? "are" : "is"} too sad to work — a Groomer or some petting would help`, tab: "creatures" });
  if (inTrough === 0 && cs.length) out.push({ level: feeders ? "warn" : "bad", text: feeders ? "The trough is empty — your Feeder needs food in storage" : "The trough is empty — fill it or make someone a Feeder", tab: "storage" });
  if (!w.buildings?.stall && cs.some(c => c.job === "hauler")) out.push({ level: "bad", text: "Your Hauler has nowhere to sell — build the Market Stall", tab: "buildings" });
  for (const [key, st] of Object.entries(w.workshops || {})) {
    if (!st?.level || st.on === false) continue;
    const ws = WORKSHOPS[key];
    const crafters = cs.filter(c => c.job === "crafter" && c.station === key);
    const miss = missingInputs(w, ws.needs).map(([k]) => ITEMS[k].name.toLowerCase());
    if (crafters.length && miss.length) out.push({ level: "warn", text: `The ${ws.name} is waiting for ${miss.join(" and ")}`, tab: "workshops" });
    else if (!crafters.length) out.push({ level: "info", text: `Nobody works at the ${ws.name}`, tab: "workshops" });
  }
  const full = ITEM_KEYS.filter(k => (w.food?.[k] || 0) >= capFor(w, k));
  if (full.length) out.push({ level: "warn", text: `${full.map(k => ITEMS[k].name).slice(0, 3).join(", ")}${full.length > 3 ? ` and ${full.length - 3} more` : ""} ${full.length > 1 ? "are" : "is"} full${w.buildings?.stall ? " (the stall sells the extra)" : " — extra gets wasted"}`, tab: "storage" });
  for (const ct of w.contracts || []) if (ct.until - now < 2 * 3600e3) out.push({ level: "warn", text: `Contract for ${ct.n} ${ITEMS[ct.item].name.toLowerCase()} ends in ${timeLeft(ct.until - now)} (${ct.got}/${ct.n})`, tab: "market" });
  const meadow = by("meadow"), hungryOut = meadow.filter(c => c.hunger < 30);
  const freeSpots = penSlots(w) - housedCount(w);
  if (hungryOut.length) out.push({ level: "bad", text: `${names(hungryOut)} ${hungryOut.length > 1 ? "are" : "is"} going hungry in the meadow — feed by hand, give a pen spot, or find a new home`, tab: "creatures" });
  if (meadow.length && freeSpots > 0) out.push({ level: "warn", text: `You have ${freeSpots} free pen spot${freeSpots > 1 ? "s" : ""} and ${meadow.length} waiting in the meadow`, tab: "creatures" });
  else if (meadow.length) out.push({ level: "info", text: `${meadow.length} waiting in the meadow for a pen spot (pen ${housedCount(w)}/${penSlots(w)})`, tab: "buildings" });
  if (idle.length) out.push({ level: "info", text: `${names(idle)} ${idle.length > 1 ? "have" : "has"} no job`, tab: "creatures" });
  for (const [i, h] of (w.hatcheries || []).entries()) {
    if (h.egg?.stage === "hatching" && !cs.some(c => c.job === "carer" && c.station === h.id)) out.push({ level: "warn", text: `The egg in Hatchery ${i + 1} needs a Carer to keep it warm`, tab: "hatchery" });
  }
  if ((w.eggs || []).length && (w.hatcheries || []).some(h => !h.egg)) out.push({ level: "info", text: `You have ${w.eggs.length} wild egg${w.eggs.length > 1 ? "s" : ""} waiting for a Hatchery`, tab: "hatchery" });
  const babiesOut = cs.filter(c => c.grow != null && stateOf(c) === "meadow");
  if (babiesOut.length) out.push({ level: "warn", text: `${names(babiesOut)} can't grow up in the meadow: babies need a pen spot`, tab: "buildings" });
  return out;
}
function names(list) {
  const n = list.map(c => c.name);
  return n.length <= 2 ? n.join(" and ") : `${n.slice(0, 2).join(", ")} and ${n.length - 2} more`;
}
function timeLeft(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 120 ? `${Math.round(m / 60)}h` : m >= 60 ? `1h ${m - 60}m` : `${m}m`;
}

function Overview({ world, now, alerts, setTab, reportKey }) {
  const cs = Object.values(world.creatures || {});
  const count = (s) => cs.filter(c => stateOf(c) === s).length;
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (world.trough?.[k] || 0), 0);
  const makers = cs.filter(makesGoods).length;
  // "while you were away" — each player sees it once
  const rep = world.report;
  const [seenTo, setSeenTo] = useState(() => { try { return Number(localStorage.getItem(reportKey)) || 0; } catch { return 0; } });
  const showReport = rep && rep.to > seenTo;
  const dismiss = () => { try { localStorage.setItem(reportKey, String(rep.to)); } catch { /* storage blocked */ } setSeenTo(rep.to); };
  const goods = ITEM_KEYS.filter(k => ITEMS[k].group !== "food" && (world.food?.[k] || 0) >= 1);

  return (
    <>
      {showReport && <AwayReport rep={rep} onDismiss={dismiss} />}
      <Card>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Stat label="creatures" value={cs.length} />
          <Stat label="pen spots used" value={`${housedCount(world)}/${penSlots(world)}`} color={housedCount(world) >= penSlots(world) ? "#ffcf8a" : C.text} />
          <Stat label="working" value={count("working")} color={C.good} />
          <Stat label="resting" value={count("resting")} />
          <Stat label="making goods" value={makers} color={makers ? "#ffc4e6" : C.dim} />
          <Stat label="need help" value={count("starving") + count("sad")} color={count("starving") + count("sad") ? C.bad : C.dim} />
        </div>
        <Bar label="Trough" value={inTrough} max={troughCap(world)} color="#ffb347" noWarn />
        {STORE_ITEMS.map(k => <Bar key={k} label={ITEMS[k].name} value={Math.floor(world.food?.[k] || 0)} max={storageCap(world)} color={ITEMS[k].color} icon={<ItemIcon kind={k} />} />)}
        {goods.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12 }}>
            {goods.map(k => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ItemIcon kind={k} size={16} /> {Math.floor(world.food[k])}</span>)}
          </div>
        )}
      </Card>
      <Card title="Needs attention">
        {alerts.length === 0
          ? <div style={{ color: C.good, fontSize: 14 }}>Everything is running smoothly.</div>
          : alerts.map((a, i) => (
            <button key={i} onClick={() => setTab(a.tab)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              background: a.level === "bad" ? "rgba(255,93,115,0.15)" : a.level === "warn" ? "rgba(255,179,71,0.15)" : "rgba(255,255,255,0.05)",
              color: a.level === "bad" ? "#ff9aa8" : a.level === "warn" ? "#ffcf8a" : C.dim }}>{a.text}</button>
          ))}
      </Card>
      <Tips world={world} />
    </>
  );
}

function Tips({ world }) {
  const cs = Object.values(world.creatures || {});
  const jobs = new Set(cs.map(c => c.job).filter(Boolean));
  const built = Object.keys(world.workshops || {}).filter(k => world.workshops[k].level);
  let tip;
  if (!cs.length) tip = "Pick your first creature to get started.";
  else if ((world.plots?.length || 1) < 4) tip = "You start with a single plot. More land is cheap at first: buy plots in the Buildings tab, or walk to the FOR SALE plot next to your field.";
  else if (!jobs.size) tip = "Give a creature a job in the Creatures tab. A Farmhand harvests and replants food crops for you.";
  else if (!jobs.has("feeder")) tip = "Make someone a Feeder so the trough fills itself from storage.";
  else if (!world.buildings?.stall) tip = "Save up 150 coins for the Market Stall: it sells whatever won't fit in storage, and Haulers sell there.";
  else if (!built.length) tip = "Build a workshop (Workshops tab): the Jam Kitchen turns 4 berries into jam, the Juice Press turns 4 carrots into juice. Both sell for much more.";
  else if (!jobs.has("crafter")) tip = "Make someone a Crafter at your workshop. Creatures with high Craft work faster.";
  else if (!jobs.has("hauler")) tip = "A Hauler takes goods to the stall for you: it fills contracts, then sells anything above your keep amounts (Market tab).";
  else if (!world.workshops?.kiln?.level) tip = "Happy creatures make goods: Pebblets make pebbles, Emberpups make embers. The Kiln turns them into bricks, and bricks unlock bigger upgrades.";
  else if (!jobs.has("groomer")) tip = "Only happy creatures (50+) make goods. A Groomer keeps everyone's spirits up.";
  else tip = "Workshop goods are worth far more than what goes into them: a brick sells for 20, a lantern for 40. Contracts pay about double.";
  return <Card title="Tip"><div style={{ fontSize: 13, color: C.dim }}>{tip}</div></Card>;
}

function AwayReport({ rep, onDismiss }) {
  const mins = Math.round((rep.to - rep.from) / 60000);
  const span = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
  const list = (obj) => Object.entries(obj || {}).filter(([, n]) => n >= 1).map(([k, n]) => `${Math.floor(n)} ${ITEMS[k]?.name.toLowerCase() || k}`).join(", ");
  const gathered = list(Object.fromEntries(Object.entries(rep.gained || {}).filter(([k]) => ITEMS[k]?.group !== "made")));
  const made = list(rep.made);
  const wasted = list(rep.wasted);
  return (
    <Card title={`While you were away (${span})`} accent="#ffd65a">
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        {gathered ? <div>Gathered and made by creatures: {gathered}</div> : <div style={{ color: C.dim }}>Nothing was gathered.</div>}
        {made && <div>Workshops made: {made}</div>}
        {rep.harvests > 0 && <div>{rep.harvests} harvests by your Farmhands</div>}
        <div>{rep.meals} meals eaten{rep.buddyMeals ? ` (${rep.buddyMeals} brought by buddies)` : ""}</div>
        {rep.hauled > 0 && <div style={{ color: "#ffd65a" }}>Haulers sold goods for {Math.floor(rep.hauled)} coins</div>}
        {rep.contracts > 0 && <div style={{ color: "#ffd65a" }}>{rep.contracts} contract{rep.contracts > 1 ? "s" : ""} finished for {Math.floor(rep.contractCoins)} coins</div>}
        {rep.autoSold > 0 && <div style={{ color: "#ffd65a" }}>The stall sold extra goods for {Math.floor(rep.autoSold)} coins</div>}
        {wasted && <div style={{ color: "#ffcf8a" }}>Storage was full: {wasted} went to waste</div>}
        {rep.laid > 0 && <div style={{ color: "#ff9ac6" }}>{rep.laid} egg{rep.laid > 1 ? "s were" : " was"} laid</div>}
        {rep.hatched?.length > 0 && <div style={{ color: "#ffd65a" }}>Hatched: {rep.hatched.join(", ")}!</div>}
        {rep.grownUp?.length > 0 && <div style={{ color: C.good }}>All grown up: {rep.grownUp.join(", ")}</div>}
        {rep.levelUps?.length > 0 && <div style={{ color: C.good }}>Skills up: {rep.levelUps.slice(0, 6).join(", ")}{rep.levelUps.length > 6 ? ` +${rep.levelUps.length - 6} more` : ""}</div>}
      </div>
      <button onClick={onDismiss} style={btn(true, { alignSelf: "flex-start" })}>Got it</button>
    </Card>
  );
}

// ── Creatures ─────────────────────────────────────────────────────────────────
const FILTERS = [["all", "All"], ["mine", "Mine"], ["help", "Need help"], ["idle", "No job"], ["meadow", "Meadow"]];
// Sorting: by a skill (best first), or by how they're doing.
const SORTS = [["", "Default"], ...SKILLS.map(s => [s, SKILL_NAMES[s]]), ["happy", "Happiest"], ["hungry", "Hungriest"]];
function Creatures({ world, W, myId, nameOf, colorOf, onFollow }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState(() => { try { return localStorage.getItem("ranch_sort") || ""; } catch { return ""; } });
  const [open, setOpen] = useState(null);
  const chooseSort = (v) => { setSortBy(v); try { localStorage.setItem("ranch_sort", v); } catch { /* storage blocked */ } };
  const all = Object.values(world.creatures || {});
  const list = all.filter(c =>
    filter === "mine" ? c.owner === myId :
    filter === "help" ? ["starving", "sad"].includes(stateOf(c)) :
    filter === "idle" ? stateOf(c) === "idle" :
    filter === "meadow" ? stateOf(c) === "meadow" : true);
  if (sortBy === "happy") list.sort((a, b) => b.happy - a.happy);
  else if (sortBy === "hungry") list.sort((a, b) => a.hunger - b.hunger);
  else if (sortBy) list.sort((a, b) => (b.skills?.[sortBy] || 1) - (a.skills?.[sortBy] || 1) || (b.xp?.[sortBy] || 0) - (a.xp?.[sortBy] || 0));
  const myRules = (world.rules || {})[myId] || {};
  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.dim }}>Ranch Rules (your creatures):</span>
        <button data-rule="autoJob" disabled={!W.canAct} onClick={() => W.dispatch({ type: "set_rule", rule: "autoJob", on: !myRules.autoJob })} title="Creatures of yours with no job get whatever the farm needs most: Feeder if the trough runs low, Groomer if spirits are low, Farmhands for untended plots, a Crafter for any workshop nobody runs, a Hauler once there's a stall, otherwise Forager. Best skill gets picked."
          style={btn(!!myRules.autoJob, { padding: "4px 9px", fontSize: 11 })}>{myRules.autoJob ? "Auto jobs: on" : "Auto jobs: off"}</button>
        <button data-rule="autoHouse" disabled={!W.canAct} onClick={() => W.dispatch({ type: "set_rule", rule: "autoHouse", on: !myRules.autoHouse })} title="Your creatures waiting in the meadow move into free pen spots by themselves (babies first). Turn it off if you want to keep someone in the meadow."
          style={btn(!!myRules.autoHouse, { padding: "4px 9px", fontSize: 11 })}>{myRules.autoHouse ? "Auto pen spots: on" : "Auto pen spots: off"}</button>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {FILTERS.map(([id, label]) => <button key={id} onClick={() => setFilter(id)} style={btn(filter === id, { padding: "5px 10px", fontSize: 12 })}>{label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.dim, marginRight: 2 }}>Sort:</span>
        {SORTS.map(([id, label]) => <button key={id || "def"} onClick={() => chooseSort(id)} style={btn(sortBy === id, { padding: "4px 8px", fontSize: 11 })}>{label}</button>)}
      </div>
      {list.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Nobody here.</div>}
      {list.map(c => (
        <CreatureCard key={c.id} c={c} world={world} W={W} myId={myId} nameOf={nameOf} colorOf={colorOf} onFollow={onFollow}
          open={open === c.id} onToggle={() => setOpen(o => (o === c.id ? null : c.id))} />
      ))}
    </>
  );
}

// Tiny skill chips on every card: "Fo 3  Ca 1  Fa 4 …". The skill its job uses is highlighted.
const SKILL_SHORT = { forage: "Fo", care: "Ca", farm: "Fa", craft: "Cr", haul: "Ha", fight: "Fi" };
const SKILL_JOBS = { forage: "Forager", care: "Feeder, Groomer", farm: "Farmhand", craft: "Crafter", haul: "Hauler", fight: "the Wilds" };
function SkillChips({ c }) {
  const used = c.job ? JOBS[c.job]?.skill : null;
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
      {SKILLS.map(s => {
        const lvl = c.skills?.[s] || 1, on = s === used;
        const hue = lvl >= 8 ? "#ffd65a" : lvl >= 5 ? "#c9a7ff" : lvl >= 3 ? "#9fd0ff" : "rgba(243,236,255,0.55)";
        return (
          <span key={s} title={`${SKILL_NAMES[s]} ${lvl} (used by ${SKILL_JOBS[s]})`}
            style={{ fontSize: 10, fontWeight: 800, padding: "1px 5px", borderRadius: 6, background: on ? "rgba(255,204,77,0.22)" : "rgba(255,255,255,0.06)", border: `1px solid ${on ? "rgba(255,204,77,0.6)" : "transparent"}`, color: C.dim, whiteSpace: "nowrap" }}>
            {SKILL_SHORT[s]} <span style={{ color: hue }}>{lvl}</span>
          </span>
        );
      })}
    </div>
  );
}

function jobLabel(c) {
  if (!c.job) return null;
  if (c.job === "carer") return `Carer at Hatchery ${String(c.station || "").replace(/\D/g, "") || 1}`;
  return c.job === "crafter" && WORKSHOPS[c.station] ? `Crafter at the ${WORKSHOPS[c.station].name}` : JOBS[c.job].name;
}

function CreatureCard({ c, world, W, myId, nameOf, colorOf, onFollow, open, onToggle }) {
  const sp = SPECIES[c.species];
  const st = stateOf(c);
  const mine = canManage(c, myId);
  const buddy = c.buddy ? world.creatures[c.buddy] : null;
  const chem = buddy ? chemistry(c, buddy) : 0;
  const stColor = st === "working" ? C.good : st === "starving" || st === "sad" ? C.bad : C.dim;
  const others = Object.values(world.creatures).filter(o => o.id !== c.id);
  const product = PRODUCT_OF[c.species];
  const built = Object.keys(WORKSHOPS).filter(k => world.workshops?.[k]?.level);
  const can = mine && W.canAct;
  return (
    <Card>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <Portrait species={c.species} traits={c.traits} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            {c.name} <span style={{ color: C.dim, fontWeight: 700, fontSize: 12 }}>{c.traits.rare ? "golden " : ""}{sp.name} · {c.traits.personality}</span>
          </div>
          {(c.genes || c.grow != null) && <div style={{ fontSize: 11, color: "#c9a7ff", fontWeight: 700 }}>{typeLabel(c)}{c.grow != null ? ` · baby, ${Math.round(c.grow * 100)}% grown` : ""}</div>}
          <div style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: stColor, fontWeight: 800 }}>{c.job && st === "working" ? jobLabel(c) : STATE_TEXT[st]}</span>
            {c.job && st !== "working" && <span style={{ color: C.dim }}>({jobLabel(c)})</span>}
            <span style={{ color: colorOf(c.owner) }}>{nameOf(c.owner)}</span>
            {buddy && <span style={{ color: chem > 0 ? C.good : chem < 0 ? C.bad : C.dim }}>buddy: {buddy.name}{chem > 0 ? " (clicks)" : chem < 0 ? " (clashes)" : ""}</span>}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
            <MiniBar value={c.hunger} color="#ffb347" title="hunger" />
            <MiniBar value={c.happy} color="#ff7aa8" title="happiness" />
            <MiniBar value={c.energy ?? 100} color="#6fd3ff" title="energy" />
            {product && <span title={makesGoods(c) ? `making ${ITEMS[product].name.toLowerCase()}` : "too unhappy to make anything"} style={{ opacity: makesGoods(c) ? 1 : 0.3, display: "inline-flex" }}><ItemIcon kind={product} size={15} /></span>}
          </div>
          <SkillChips c={c} />
        </div>
        <span style={{ color: C.faint, fontSize: 12 }}>{open ? "less" : "more"}</span>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center", fontSize: 12 }}>
            <span>Hunger</span><Bar value={c.hunger} max={100} color="#ffb347" compact />
            <span>Happy</span><Bar value={c.happy} max={100} color="#ff7aa8" compact />
            <span>Energy</span><Bar value={c.energy ?? 100} max={100} color="#6fd3ff" compact />
          </div>
          {product && <MakingCard c={c} product={product} />}
          {c.job === "crafter" && WORKSHOPS[c.station] && world.workshops?.[c.station]?.level && <CraftingCard c={c} world={world} />}
          <div>
            <div style={sub}>Skills (grow by doing the job)</div>
            {SKILLS.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 3 }}>
                <span style={{ width: 52 }}>{SKILL_NAMES[s]}</span>
                <span style={{ display: "inline-flex", gap: 2 }}>
                  {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i < (c.skills[s] || 1) ? "#c9a7ff" : "rgba(255,255,255,0.1)" }} />)}
                </span>
                <span style={{ color: C.dim }}>{c.skills[s] || 1}{(c.skills[s] || 1) < 10 ? ` · ${Math.floor(((c.xp?.[s] || 0) / xpForNext(c.skills[s] || 1)) * 100)}% to next` : " · max"}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={sub}>Wilds moves <span style={{ color: C.faint, textTransform: "none", letterSpacing: 0 }}>(slots open at Fight 1, 3, 5, 8; more genes of a type = more of its moves)</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
              {movesFor(c).map((m, k) => (
                <div key={k} style={{ fontSize: 12, opacity: m.open ? 1 : 0.45 }} title={MOVES[m.k].desc}>
                  <b>{MOVES[m.k].name}</b> <span style={{ color: C.dim }}>{SPECIES[m.type]?.name}{m.open ? "" : ` · opens at Fight ${m.unlock}`}</span>
                  <span style={{ display: "block", fontSize: 11, color: C.faint }}>{MOVES[m.k].desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={sub}>Job {!mine && <span style={{ color: C.faint }}>(only {nameOf(c.owner)} or someone it trusts can change this)</span>}</div>
            {c.grow != null && <div style={{ fontSize: 12, color: "#ffcf8a", marginTop: 4 }}>Too young to work. Grows up in about {clock(((1 - c.grow) * GROW_SECS) / growRate(c))}{stateOf(c) === "meadow" ? " once it has a pen spot (babies don't grow in the meadow)" : ", faster when it's fed and happy"}.</div>}
            {c.nest && <div style={{ fontSize: 12, color: "#ff9ac6", marginTop: 4 }}>Nesting in Hatchery {String(c.nest).replace(/\D/g, "")}. Back to work once the egg is laid.</div>}
            {c.grow == null && !c.nest && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <button disabled={!can} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: null })} style={btn(!c.job, { padding: "6px 10px", fontSize: 12, opacity: mine ? 1 : 0.5 })}>None</button>
              {Object.entries(JOBS).filter(([id, j]) => !j.hidden || c.job === id).map(([id, j]) => {
                const blocked = (id === "crafter" && !built.length) || j.hidden;
                return (
                  <button key={id} disabled={!can || blocked} title={j.hidden ? "Set from the Hatchery tab" : blocked ? "Build a workshop first" : j.desc} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: id })}
                    style={btn(c.job === id, { padding: "6px 10px", fontSize: 12, opacity: mine && !blocked ? 1 : 0.4 })}>
                    {j.name} <span style={{ color: C.faint }}>{c.skills[j.skill] || 1}</span>
                  </button>
                );
              })}
            </div>}
            {c.job === "crafter" && built.length > 1 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.dim }}>Works at:</span>
                {built.map(k => (
                  <button key={k} disabled={!can} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: "crafter", station: k })} style={btn(c.station === k, { padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 })}>
                    <ItemIcon kind={WORKSHOPS[k].makes} size={14} /> {WORKSHOPS[k].name}
                  </button>
                ))}
              </div>
            )}
            {c.job === "farmhand" && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.dim }}>Plants:</span>
                {[["auto", "Auto (what you have less of)"], ["berry", "Berries"], ["carrot", "Carrots"]].map(([k, label]) => (
                  <button key={k} data-plant={k} disabled={!can} onClick={() => W.dispatch({ type: "set_plant", cid: c.id, plant: k })}
                    title={k === "auto" ? "Plants berries or carrots, whichever you have fewer of in storage" : `Always plants ${label.toLowerCase()}`}
                    style={btn((c.plant || "auto") === k, { padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 })}>
                    {k !== "auto" && <ItemIcon kind={k} size={14} />} {label}
                  </button>
                ))}
              </div>
            )}
            {c.job && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{JOBS[c.job].desc}{c.job === "hauler" && !world.buildings?.stall ? " Needs the Market Stall." : ""}</div>}
            {c.job && (() => {
              const r = jobRate(world, c);
              if (!r) return null;
              return (
                <div style={{ fontSize: 12, marginTop: 4, color: "#c9a7ff", fontWeight: 700 }}>
                  {r.text ? `Right now it ${r.text}.` : `Right now it ${r.what} every ${clock(r.every)} (about ${Math.round(r.perHour)} an hour${r.coins ? `, ${Math.round(r.coins)} coins` : ""}) while working.`}
                  {stateOf(c) !== "working" && <span style={{ color: "#ffcf8a" }}> Not working at the moment: {STATE_TEXT[stateOf(c)]}.</span>}
                </div>
              );
            })()}
            {!built.length && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Crafter unlocks once you build a workshop.</div>}
          </div>
          <Housing c={c} world={world} W={W} mine={mine} myId={myId} />
          {onFollow && mine && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button disabled={!W.canAct} onClick={() => onFollow(c.id)} style={btn(c.follow === myId, { padding: "6px 10px", fontSize: 12 })}>
                {c.follow === myId ? "Stop following me" : "Follow me"}
              </button>
              <span style={{ fontSize: 11, color: C.dim }}>{c.follow ? "Followers take a break from their job." : "Your follower joins you on runs."}</span>
            </div>
          )}
          <div>
            <div style={sub}>Buddy</div>
            {/* buddy picker: chips (native dropdowns look broken in dark mode on Windows) — clicks first, clashes last */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <button disabled={!can} onClick={() => W.dispatch({ type: "set_buddy", cid: c.id, buddy: null })} style={btn(!c.buddy, { padding: "5px 10px", fontSize: 12, opacity: can ? 1 : 0.5 })}>no buddy</button>
              {others.slice().sort((a, b) => chemistry(c, b) - chemistry(c, a)).map(o => {
                const ch = chemistry(c, o), on = c.buddy === o.id;
                return (
                  <button key={o.id} disabled={!can} onClick={() => W.dispatch({ type: "set_buddy", cid: c.id, buddy: o.id })}
                    title={`${SPECIES[o.species].name}, ${o.traits.personality}${o.buddy && o.buddy !== c.id ? ` (now buddies with ${world.creatures[o.buddy]?.name})` : ""}`}
                    style={btn(on, { padding: "3px 10px 3px 4px", fontSize: 12, opacity: can ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 4,
                      borderColor: !on && ch > 0 ? "rgba(126,224,129,0.55)" : !on && ch < 0 ? "rgba(255,122,107,0.45)" : undefined })}>
                    <Portrait species={o.species} traits={o.traits} size={22} />
                    {o.name}
                    <span style={{ fontWeight: 700, color: on ? "#3a2a00" : ch > 0 ? C.good : ch < 0 ? C.bad : C.faint }}>{ch > 0 ? "clicks" : ch < 0 ? "clashes" : o.traits.personality}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Buddies who forage or feed bring food when the trough runs dry. A buddy with Care 5+ keeps the other happy. Pairs that click work faster; pairs that clash get grumpy.</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// Pen spot + "Find a new home" for one creature.
function Housing({ c, world, W, mine, myId }) {
  const [confirm, setConfirm] = useState(false);
  const full = housedCount(world) >= penSlots(world);
  const starter = Object.values(world.starters || {}).includes(c.id);
  const price = rehomePrice(c);
  return (
    <div>
      <div style={sub}>Pen spot <span style={{ color: C.faint }}>({housedCount(world)}/{penSlots(world)} used)</span></div>
      {c.housed ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.good, flex: 1 }}>Has a spot: eats from the trough, rests, works and makes goods.</span>
          <button disabled={!mine || !W.canAct} onClick={() => W.dispatch({ type: "house", cid: c.id, on: false })} style={btn(false, { padding: "5px 10px", fontSize: 12, opacity: mine ? 1 : 0.5 })}>Move to the meadow</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: c.follow ? C.dim : "#ffcf8a" }}>
            {c.follow ? "No spot, but it's following someone, so it eats and tags along fine." : "Waiting in the meadow: still gets hungry and sad, can't reach the trough, doesn't work or make goods. Feed it by hand, give it a spot, or find it a new home."}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button disabled={!mine || !W.canAct || full} onClick={() => W.dispatch({ type: "house", cid: c.id })} style={btn(!full && mine, { padding: "5px 10px", fontSize: 12, opacity: mine && !full ? 1 : 0.5 })}>Give a pen spot</button>
            {full && <span style={{ fontSize: 11, color: C.dim }}>Pen full: build a spot (Buildings tab, {penCost(penSlots(world) + 1)} coins) or move someone out.</span>}
          </div>
        </div>
      )}
      {c.owner === myId && !starter && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          {!confirm
            ? <button disabled={!W.canAct} onClick={() => setConfirm(true)} style={btn(false, { padding: "5px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 })}>Find a new home <CoinIcon size={12} /> +{price}</button>
            : <>
                <span style={{ fontSize: 12 }}>Say goodbye to {c.name} for {price} coins? It goes to a happy new home.</span>
                <button disabled={!W.canAct} onClick={() => { W.dispatch({ type: "rehome", cid: c.id }); setConfirm(false); }} style={btn(true, { padding: "5px 10px", fontSize: 12 })}>Yes, goodbye {c.name}</button>
                <button onClick={() => setConfirm(false)} style={btn(false, { padding: "5px 10px", fontSize: 12 })}>Keep</button>
              </>}
        </div>
      )}
      {starter && c.owner === myId && <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>Starters stay on the farm forever.</div>}
    </div>
  );
}

// "Making pebbles · next one in 12 min" with a progress bar (species goods).
function MakingCard({ c, product }) {
  const on = makesGoods(c);
  const frac = Math.max(0, Math.min(1, c.made || 0));
  const rate = (c.happy / 100) * (c.traits.rare ? 2 : 1);              // items per PRODUCE_SECS
  const secsLeft = on && rate > 0 ? ((1 - frac) * PRODUCE_SECS) / rate : null;
  const name = ITEMS[product].name.toLowerCase();
  const why = inMeadow(c) ? "no pen spot" : c.hunger < 10 ? "too hungry" : `needs happiness 50+ (now ${Math.floor(c.happy)})`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
      <ItemIcon kind={product} size={30} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          Making {name}
          <span style={{ fontWeight: 700, color: on ? C.good : "#ffcf8a", marginLeft: 6 }}>
            {on ? `next one in ${clock(secsLeft)}` : `paused: ${why}`}
          </span>
        </div>
        <Bar value={frac * 100} max={100} color={on ? ITEMS[product].color : "rgba(255,255,255,0.25)"} compact noWarn />
        <div style={{ fontSize: 11, color: C.dim }}>
          {on ? `About 1 every ${clock(PRODUCE_SECS / rate)} at this happiness${c.traits.rare ? " (golden: double speed)" : ""}. Happier = faster.` : inMeadow(c) ? "Creatures only make goods with a pen spot. Progress is kept." : "Progress is kept; it picks up again once it's happy and fed."}
        </div>
      </div>
    </div>
  );
}

// For Crafters: what their workshop is making and when the next one is done.
function CraftingCard({ c, world }) {
  const key = c.station, ws = WORKSHOPS[key], st = world.workshops[key];
  const cs = Object.values(world.creatures).filter(o => o.job === "crafter" && o.station === key && stateOf(o) === "working");
  const speed = cs.reduce((n, o) => n + skillFactor(o.skills.craft || 1) * (o.buddy && chemistry(o, world.creatures[o.buddy]) > 0 ? 1.15 : 1), 0) * wsSpeed(st.level);
  const miss = missingInputs(world, ws.needs).map(([k]) => ITEMS[k].name.toLowerCase());
  const frac = Math.max(0, Math.min(1, st.progress || 0));
  const status = st.on === false ? "workshop paused" : miss.length ? `waiting for ${miss.join(" and ")}` : stateOf(c) !== "working" ? STATE_TEXT[stateOf(c)] : speed > 0 ? `next one in ${clock(((1 - frac) * ws.secs) / speed)}` : "";
  const ok = st.on !== false && !miss.length && stateOf(c) === "working";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
      <ItemIcon kind={ws.makes} size={30} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          Crafting {ITEMS[ws.makes].name.toLowerCase()} at the {ws.name}
          <span style={{ fontWeight: 700, color: ok ? C.good : "#ffcf8a", marginLeft: 6 }}>{status}</span>
        </div>
        <Bar value={frac * 100} max={100} color={ok ? "#8ee06a" : "#ff9a5d"} compact noWarn />
        {cs.length > 1 && <div style={{ fontSize: 11, color: C.dim }}>Working with {cs.filter(o => o.id !== c.id).map(o => o.name).join(", ")}.</div>}
      </div>
    </div>
  );
}
function clock(secs) {
  if (secs == null || !isFinite(secs)) return "—";
  const s = Math.max(0, Math.ceil(secs));
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  return `${s}s`;
}

// ── Forecast ──────────────────────────────────────────────────────────────────
// Runs the farm forward on a copy (same rules as the real thing) and shows
// where it ends up if nobody changes anything.
const HORIZONS = [[1800, "30 min"], [7200, "2 hours"], [8 * 3600, "8 hours"], [24 * 3600, "24 hours"]];
function Forecast({ world, now, setTab }) {
  const [secs, setSecs] = useState(1800);
  const bucket = Math.floor(now / 10000);                // refresh every 10 seconds
  const fc = useMemo(() => forecast(world, secs, now), [secs, bucket]); // eslint-disable-line react-hooks/exhaustive-deps
  const { sim, rep } = fc;
  const label = HORIZONS.find(h => h[0] === secs)[1];
  const cs0 = Object.values(world.creatures || {}), cs1 = cs0.map(c => sim.creatures[c.id]);
  const avg = (list, f) => list.length ? list.reduce((n, c) => n + f(c), 0) / list.length : 0;
  const happy0 = avg(cs0, c => c.happy), happy1 = avg(cs1, c => c.happy);
  const fed0 = avg(cs0, c => c.hunger), fed1 = avg(cs1, c => c.hunger);
  const noGoods = cs1.filter(c => !makesGoods(c) && !inMeadow(c));
  const sad = cs1.filter(c => c.happy < STOP_HAPPY && !inMeadow(c)), starving = cs1.filter(c => c.hunger < STOP_HUNGER && !inMeadow(c));   // meadow ones get their own warning
  const groomers = cs0.filter(c => c.job === "groomer");
  const trough0 = STORE_ITEMS.reduce((n, k) => n + (world.trough?.[k] || 0), 0), trough1 = STORE_ITEMS.reduce((n, k) => n + (sim.trough?.[k] || 0), 0);
  const coinsIn = rep.hauled + rep.autoSold + rep.contractCoins;
  // every item that moved or that you hold
  const keys = ITEM_KEYS.filter(k => (world.food?.[k] || 0) >= 1 || (sim.food?.[k] || 0) >= 1 || rep.produced[k] || rep.used[k] || rep.made[k]);
  const n = (v) => Math.round(v || 0);
  const flow = (k) => [
    ["gathered", n(rep.produced[k]) - n(rep.made[k])], ["made", n(rep.made[k])], ["used by workshops", -n(rep.used[k])],
    ["to the trough", -n(rep.toTrough[k])], ["eaten", -n(rep.eaten[k])], ["sold", -n(rep.sold[k])], ["contracts", -n(rep.delivered[k])], ["wasted (full)", -n(rep.wasted[k])],
  ].filter(([, v]) => v);
  const built = Object.keys(WORKSHOPS).filter(k => world.workshops?.[k]?.level);
  const verdict = [];
  const outHungry = cs1.filter(c => inMeadow(c) && c.hunger < STOP_HUNGER);
  if (outHungry.length) verdict.push({ bad: true, text: `${names(outHungry)} ${outHungry.length > 1 ? "are" : "is"} in the meadow with no pen spot and will be starving. Feed by hand, give a spot, or find a new home.`, tab: "creatures" });
  if (starving.length) verdict.push({ bad: true, text: `${names(starving)} will be too hungry to work. ${cs0.some(c => c.job === "feeder") ? "Your Feeder can't keep up, or storage runs out of food" : "Nobody is filling the trough: make someone a Feeder"}.`, tab: "creatures" });
  if (sad.length) verdict.push({ bad: true, text: `${names(sad)} will be too sad to work${groomers.length ? " (more Groomers, or better Care, would help)" : " (a Groomer would help)"}.`, tab: "creatures" });
  else if (noGoods.length) verdict.push({ text: `${names(noGoods)} will drop under ${PRODUCE_HAPPY} happiness or get hungry and stop making goods.`, tab: "creatures" });
  for (const k of built) {
    const b = rep.busy[k] || 0, wt = rep.waiting[k] || 0;
    if (wt > 0 && wt >= 0.25 * (b + wt)) {
      const miss = Object.keys(WORKSHOPS[k].needs).filter(x => (sim.food?.[x] || 0) < WORKSHOPS[k].needs[x] + (ITEMS[x].group === "food" ? FOOD_RESERVE : 0)).map(x => ITEMS[x].name.toLowerCase());
      verdict.push({ text: `The ${WORKSHOPS[k].name} will sit waiting ${Math.round((wt / (b + wt)) * 100)}% of the time${miss.length ? ` for ${miss.join(" and ")}` : ""}: supply can't keep up with your Crafters.`, tab: "workshops" });
    }
  }
  const wastedAny = Object.values(rep.wasted).some(v => v >= 1);
  if (wastedAny) verdict.push({ text: `Some goods will hit the storage limit and be lost${world.buildings?.stall ? "" : ": the Market Stall would sell them instead"}.`, tab: world.buildings?.stall ? "buildings" : "buildings" });
  if (!verdict.length) verdict.push({ good: true, text: "Everything keeps running smoothly for this long." });

  return (
    <>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.dim, marginRight: 4 }}>If nothing changes, in</span>
        {HORIZONS.map(([v, l]) => <button key={v} onClick={() => setSecs(v)} style={btn(secs === v, { padding: "5px 10px", fontSize: 12 })}>{l}</button>)}
      </div>
      <Card title={`In ${label}`}>
        {verdict.map((v, i) => (
          <button key={i} onClick={() => v.tab && setTab(v.tab)} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "none", cursor: v.tab ? "pointer" : "default", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            background: v.good ? "rgba(126,224,129,0.12)" : v.bad ? "rgba(255,93,115,0.15)" : "rgba(255,179,71,0.15)", color: v.good ? C.good : v.bad ? "#ff9aa8" : "#ffcf8a" }}>{v.text}</button>
        ))}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
          <Change label="coins earned" from={null} to={coinsIn} plus />
          <Change label="average happiness" from={happy0} to={happy1} />
          <Change label="average fullness" from={fed0} to={fed1} />
          <Change label="in the trough" from={trough0} to={trough1} />
        </div>
        {coinsIn > 0 && <div style={{ fontSize: 11, color: C.dim }}>Coins: {[rep.hauled && `${n(rep.hauled)} from your Hauler`, rep.autoSold && `${n(rep.autoSold)} from the stall selling extra`, rep.contractCoins && `${n(rep.contractCoins)} from contracts`].filter(Boolean).join(", ")}.</div>}
      </Card>
      <Card title="Creatures">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cs0.map(c => {
            const e = sim.creatures[c.id];
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <Portrait species={c.species} traits={c.traits} size={22} />
                <span style={{ width: 70, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <span style={{ width: 92, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.job ? jobLabel(c).replace("Crafter at the ", "") : "no job"}</span>
                <MoodArrow label="happy" a={c.happy} b={e.happy} color="#ff7aa8" />
                <MoodArrow label="fed" a={c.hunger} b={e.hunger} color="#ffb347" />
                <span style={{ color: stateOf(e) === "working" ? C.good : ["sad", "starving"].includes(stateOf(e)) ? C.bad : C.dim, whiteSpace: "nowrap" }}>{STATE_TEXT[stateOf(e)]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.dim }}>Happy 50+ makes goods; under 20 stops working. Hungry under 10 stops working.</div>
      </Card>
      <FarmForecast world={world} rep={rep} label={label} setTab={setTab} />
      {built.length > 0 && (
        <Card title="Workshops">
          {built.map(k => {
            const ws = WORKSHOPS[k], b = rep.busy[k] || 0, wt = rep.waiting[k] || 0, crew = cs0.some(c => c.job === "crafter" && c.station === k);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <ItemIcon kind={ws.makes} size={22} />
                <span style={{ flex: 1 }}><b>{ws.name}</b>: makes {n(rep.made[ws.makes])} {ITEMS[ws.makes].name.toLowerCase()}</span>
                {!crew ? <span style={{ color: C.faint }}>no Crafter</span>
                  : <span style={{ color: wt > b * 0.33 ? "#ffcf8a" : C.good }}>busy {Math.round((b / Math.max(1, b + wt)) * 100)}%{wt > 0 ? `, waiting ${Math.round((wt / Math.max(1, b + wt)) * 100)}%` : ""}</span>}
              </div>
            );
          })}
        </Card>
      )}
      <Card title="Storage">
        {keys.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>Nothing moves.</div>}
        {keys.map(k => {
          const a = Math.floor(world.food?.[k] || 0), b = Math.floor(sim.food?.[k] || 0), d = b - a, cap = capFor(world, k);
          return (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <ItemIcon kind={k} size={20} />
                <span style={{ flex: 1, fontWeight: 800 }}>{ITEMS[k].name}</span>
                <span style={{ color: C.dim }}>{a} → <b style={{ color: C.text }}>{b}</b>/{cap}</span>
                <span style={{ minWidth: 48, textAlign: "right", fontWeight: 900, color: d > 0 ? C.good : d < 0 ? C.bad : C.faint }}>{d > 0 ? "+" : ""}{d}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, paddingLeft: 28 }}>
                {flow(k).map(([l, v]) => `${v > 0 ? "+" : ""}${v} ${l}`).join(" · ") || "no change"}
              </div>
            </div>
          );
        })}
      </Card>
      <div style={{ fontSize: 11, color: C.faint }}>This runs the same rules the farm uses, on a copy, assuming nobody changes anything and no new creatures arrive. It updates every 10 seconds.</div>
    </>
  );
}
// Where the food and goods come from, and how the field is covered.
function FarmForecast({ world, rep, label, setTab }) {
  const src = rep.src || {};
  const list = (o) => Object.entries(o || {}).filter(([, n]) => n >= 1).map(([k, n]) => `${Math.round(n)} ${ITEMS[k].name.toLowerCase()}`).join(", ");
  const coinsOf = (o) => Object.entries(o || {}).reduce((a, [k, n]) => a + n * (ITEMS[k]?.price || 0), 0);
  const cs = Object.values(world.creatures || {});
  const foragers = cs.filter(c => c.job === "forager"), hands = cs.filter(c => c.job === "farmhand");
  const owned = world.plots?.length || 0, lures = (world.plots || []).filter(p => p && CROPS[p.kind]?.type !== "food").length;
  const covered = Math.min(owned - lures, hands.reduce((n, c) => n + farmhandShare(world, c).plots, 0));
  const untended = Math.max(0, owned - lures - covered);
  const rows = [
    ["Farmhands", hands.length, `${rep.harvests} harvests: ${list(src.farm) || "nothing"}`, coinsOf(src.farm)],
    ["Foragers", foragers.length, list(src.forage) || "nothing", coinsOf(src.forage)],
    ["Creature goods", null, list(src.goods) || "nothing", coinsOf(src.goods)],
    ["Workshops", null, list(src.craft) || "nothing", coinsOf(src.craft)],
  ];
  return (
    <Card title={`Farm and gathering · next ${label}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(([name, n, what, coins]) => (
          <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
            <span style={{ width: 112, fontWeight: 800 }}>{name}{n != null ? <span style={{ color: C.dim, fontWeight: 700 }}> ({n})</span> : null}</span>
            <span style={{ flex: 1, color: C.dim }}>{what}</span>
            <span style={{ color: "#ffd65a", fontWeight: 800, whiteSpace: "nowrap" }}>{coins >= 1 ? `≈ ${Math.round(coins)} coins` : ""}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: untended ? "#ffcf8a" : C.dim, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>Field: {owned} plot{owned === 1 ? "" : "s"}{lures ? ` (${lures} with lure crops)` : ""}, Farmhands cover {covered}.</span>
        {untended > 0 && <span>{untended} food plot{untended > 1 ? "s" : ""} nobody looks after (ripe crops wait for you). A Farmhand or more Farm levels would help.</span>}
        {untended === 0 && hands.length > 0 && hands.some(c => farmhandShare(world, c).plots < plotsPerFarmhand(c)) && <button onClick={() => setTab("buildings")} style={btn(false, { padding: "3px 8px", fontSize: 11 })}>Farmhands have spare time: buy more land</button>}
      </div>
      <div style={{ fontSize: 11, color: C.faint }}>Coin values are what everything would sell for. Food also feeds your creatures and workshops.</div>
    </Card>
  );
}

function Change({ label, from, to, plus }) {
  const d = from == null ? to : to - from;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 18, fontWeight: 900, color: plus ? "#ffd65a" : d > 0.5 ? C.good : d < -0.5 ? C.bad : C.text }}>
        {from == null ? `+${Math.round(to)}` : `${Math.round(from)} → ${Math.round(to)}`}
      </span>
      <span style={{ fontSize: 11, color: C.dim }}>{label}</span>
    </div>
  );
}
function MoodArrow({ label, a, b, color }) {
  return (
    <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: 3, width: 96 }}>
      <span style={{ width: 34, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, b))}%`, background: b < 20 ? C.bad : color }} />
      </span>
      <span style={{ color: b < a - 2 ? C.bad : b > a + 2 ? C.good : C.dim, fontWeight: 700 }}>{Math.round(a)}→{Math.round(b)}</span>
    </span>
  );
}

// ── Hatchery ──────────────────────────────────────────────────────────────────
// Make an egg from two creatures (both nest until it's laid, then the better
// carer keeps it warm), or hatch a wild egg from the Wilds.
export function EggIcon({ rarity = "common", size = 18 }) {
  return <Canvas size={size} deps={[rarity, size]} draw={(ctx, s) => drawEgg(ctx, s / 2, s * 0.94, s * 0.4, rarity, 0, 0)} />;
}
function CostChips({ cost, world }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {Object.entries(cost).map(([k, n]) => {
        const ok = (world.food?.[k] || 0) >= n;
        return <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: ok ? C.text : C.bad, fontWeight: 800, fontSize: 12 }}><ItemIcon kind={k} size={14} />{n}</span>;
      })}
    </span>
  );
}
function Hatchery({ world, W, myId, now }) {
  const hs = world.hatcheries || [];
  const cs = Object.values(world.creatures || {});
  const n = hs.length, next = n < HATCHERY_MAX ? hatcheryCost(n) : null;
  const canBuild = next && W.canAct && (world.coins || 0) >= next.coins && (!next.brick || (world.food?.brick || 0) >= next.brick);
  const dex = Object.keys(world.dex || {});
  return (
    <>
      <div style={{ fontSize: 12, color: C.dim }}>
        Pick two creatures to make an egg. They nest together (no work) until it's laid, then the one with the better Care keeps it warm as its Carer.
        Babies get 2 of each parent's 4 genes: two purebreds always make a half-and-half baby, and the type with the most genes decides how it looks and what it does.
        Babies need a pen spot to grow up, and grow faster when fed and happy.
      </div>
      {hs.map((h, i) => <HatcheryCard key={h.id} h={h} i={i} world={world} W={W} myId={myId} cs={cs} />)}
      {(world.eggs || []).length > 0 && (
        <Card title={`Wild eggs · ${world.eggs.length}`}>
          {world.eggs.map(e => {
            const free = hs.find(h => !h.egg);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <EggIcon rarity={e.rarity} size={28} />
                <span style={{ flex: 1 }}><b style={{ color: RARITY_INFO[e.rarity].color }}>{RARITY_INFO[e.rarity].name}</b> wild egg · hatches in about {clock(RARITY_INFO[e.rarity].hatch)} with a Care 1 Carer</span>
                <button disabled={!free || !W.canAct} onClick={() => W.dispatch({ type: "place_egg", hid: free.id, eid: e.id })} style={btn(!!free, { padding: "4px 10px", fontSize: 12 })}>{free ? "Put in a Hatchery" : "All Hatcheries busy"}</button>
              </div>
            );
          })}
        </Card>
      )}
      <Card title={n ? "More Hatcheries" : "Build a Hatchery"}>
        {next ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ flex: 1 }}>Each Hatchery holds one egg at a time ({n}/{HATCHERY_MAX} built).</span>
            <span style={{ color: (world.coins || 0) >= next.coins ? "#ffd65a" : C.bad, fontWeight: 800 }}>{next.coins} coins</span>
            {next.brick && <CostChips cost={{ brick: next.brick }} world={world} />}
            <button disabled={!canBuild} onClick={() => W.dispatch({ type: "build_hatchery" })} style={btn(!!canBuild, { padding: "6px 12px" })}>Build</button>
          </div>
        ) : <div style={{ fontSize: 12, color: C.dim }}>You've built every Hatchery ({HATCHERY_MAX}).</div>}
      </Card>
      {dex.length > 0 && (
        <Card title={`Creaturedex · ${dex.length} mix${dex.length > 1 ? "es" : ""} hatched`}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {dex.map(k => <span key={k} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>{k.split("+").map(t => SPECIES[t]?.name || t).join(" + ")} <span style={{ color: C.dim }}>×{world.dex[k]}</span></span>)}
          </div>
        </Card>
      )}
    </>
  );
}
function HatcheryCard({ h, i, world, W, myId, cs }) {
  const [pick, setPick] = useState([]);           // chosen parents (ids)
  const [carerPick, setCarerPick] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const e = h.egg;
  const grown = cs.filter(c => canManage(c, myId) && c.grow == null && !c.away);
  const parents = grown.filter(c => c.housed && !c.nest);
  const A = world.creatures[pick[0]], B = world.creatures[pick[1]];
  const toggle = (id) => setPick(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]);
  const chip = (c, on, onClick, extra) => (
    <button key={c.id} onClick={onClick} disabled={!W.canAct} style={btn(on, { padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 })}>
      <Portrait species={c.species} traits={c.traits} size={20} /> {c.name}{extra ? <span style={{ color: on ? "#3a2a00" : C.dim }}>{extra}</span> : null}
    </button>
  );
  let body;
  if (!e) {
    const preview = A && B ? eggPreview(A, B) : null;
    const rarities = preview ? [...new Set(preview.map(o => o.rarity))] : [];
    const worst = rarities.slice().sort((x, y) => Object.keys(RARITY_INFO).indexOf(y) - Object.keys(RARITY_INFO).indexOf(x))[0];
    const afford = preview && preview.every(o => canAfford(world, o.rarity));
    body = (
      <>
        <div style={{ fontSize: 12, color: C.dim }}>Empty. Pick two parents (yours or ones that trust you, with a pen spot):</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {parents.map(c => chip(c, pick.includes(c.id), () => toggle(c.id), ` ${typeCounts(c).length > 1 ? typeCounts(c).length + " types" : ""}`))}
          {!parents.length && <span style={{ fontSize: 12, color: C.faint }}>Nobody free.</span>}
        </div>
        {preview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{A.name} + {B.name} could make:</div>
            {preview.slice(0, 6).map((o, k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 38, textAlign: "right", fontWeight: 900 }}>{Math.round(o.chance * 100)}%</span>
                <span style={{ flex: 1 }}>{o.types.length === 1 ? `purebred ${SPECIES[o.types[0]].name}` : o.types.map(t => `${SPECIES[t].name} ×${o.counts[t]}`).join(" · ")}</span>
                <span style={{ color: RARITY_INFO[o.rarity].color, fontWeight: 800 }}>{RARITY_INFO[o.rarity].name}</span>
              </div>
            ))}
            {preview.length > 6 && <div style={{ fontSize: 11, color: C.dim }}>…and {preview.length - 6} rarer mixes</div>}
            <div style={{ fontSize: 11, color: C.dim }}>Skills: about the average of the parents, with a small chance of +1 (a good Carer helps). Gold parents raise the chance of a golden baby.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
              <span>Costs</span>
              {rarities.map(r => <span key={r} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><b style={{ color: RARITY_INFO[r].color }}>{RARITY_INFO[r].name}</b> {RARITY_INFO[r].coins > 0 && <span style={{ color: (world.coins || 0) >= RARITY_INFO[r].coins ? "#ffd65a" : C.bad, fontWeight: 800 }}>{RARITY_INFO[r].coins} coins</span>} <CostChips cost={RARITY_INFO[r].cost} world={world} /></span>)}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>Laying takes {rarities.map(r => clock(RARITY_INFO[r].lay)).join(" to ")}, hatching {rarities.map(r => clock(RARITY_INFO[r].hatch)).join(" to ")} (faster with a high-Care Carer). You need enough for the {RARITY_INFO[worst].name.toLowerCase()} egg; you pay for the one you get.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button disabled={!afford || !W.canAct} onClick={() => { W.dispatch({ type: "make_egg", hid: h.id, a: A.id, b: B.id, repeat, r: Math.random() }); setPick([]); }} style={btn(!!afford, { padding: "6px 14px" })}>{afford ? "Make an egg" : "Not enough coins, food or goods"}</button>
              <button onClick={() => setRepeat(v => !v)} title="When the egg hatches, these two start the next one by themselves (if they're free and you can pay)" style={btn(repeat, { padding: "4px 9px", fontSize: 11 })}>{repeat ? "Repeat this pairing: on" : "Repeat this pairing: off"}</button>
            </div>
          </div>
        )}
      </>
    );
  } else if (e.stage === "laying") {
    const pa = world.creatures[e.a], pb = world.creatures[e.b];
    const both = pa && pb && stateOf(pa) === "nesting" && stateOf(pb) === "nesting";
    const waitOn = [pa, pb].filter(c => c && stateOf(c) !== "nesting");
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          {pa && <Portrait species={pa.species} traits={pa.traits} size={30} />}{pb && <Portrait species={pb.species} traits={pb.traits} size={30} />}
          <span style={{ flex: 1 }}><b>{pa?.name}</b> and <b>{pb?.name}</b> are nesting. <span style={{ color: RARITY_INFO[e.rarity].color, fontWeight: 800 }}>{RARITY_INFO[e.rarity].name}</span> egg on the way.</span>
        </div>
        <Bar value={(e.progress || 0) * 100} max={100} color="#ff8ab8" compact />
        <div style={{ fontSize: 12, color: both ? C.dim : "#ffcf8a" }}>{both ? `Laid in about ${clock((1 - (e.progress || 0)) * RARITY_INFO[e.rarity].lay)}.` : `Paused: ${waitOn.map(c => `${c.name} is ${STATE_TEXT[stateOf(c)]}`).join(", ")}.`}</div>
        <button disabled={!W.canAct} onClick={() => W.dispatch({ type: "cancel_egg", hid: h.id })} style={btn(false, { alignSelf: "flex-start", padding: "4px 10px", fontSize: 11 })}>Call it off (you get everything back)</button>
      </>
    );
  } else {
    const carers = cs.filter(c => c.job === "carer" && c.station === h.id);
    const working = carers.filter(c => stateOf(c) === "working");
    const care = working.length ? Math.max(...working.map(c => c.skills?.care || 1)) : 0;
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
          <EggIcon rarity={e.rarity} size={40} />
          <span style={{ flex: 1 }}>
            <b style={{ color: RARITY_INFO[e.rarity].color }}>{RARITY_INFO[e.rarity].name}</b> {e.wild ? "wild egg" : "egg"}
            <span style={{ display: "block", color: C.dim }}>{working.length ? `Hatches in about ${clock(((1 - (e.progress || 0)) * RARITY_INFO[e.rarity].hatch) / skillFactor(care) / hatcherySpeed(h.level))}` : carers.length ? `Paused: ${carers[0].name} is ${STATE_TEXT[stateOf(carers[0])]}` : "Needs a Carer to keep it warm"}</span>
          </span>
        </div>
        <Bar value={(e.progress || 0) * 100} max={100} color={RARITY_INFO[e.rarity].color} compact />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
          <span>Carer:</span>
          {carers.length ? carers.map(c => <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800 }}><Portrait species={c.species} traits={c.traits} size={22} />{c.name} <span style={{ color: C.dim }}>Care {c.skills?.care || 1}</span></span>) : <span style={{ color: "#ffcf8a" }}>nobody</span>}
          <button onClick={() => setCarerPick(v => !v)} style={btn(carerPick, { padding: "3px 8px", fontSize: 11 })}>{carers.length ? "Change" : "Choose a Carer"}</button>
        </div>
        {carerPick && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {grown.filter(c => !c.nest && !(c.job === "carer" && c.station === h.id)).sort((x, y) => (y.skills?.care || 1) - (x.skills?.care || 1))
              .map(c => chip(c, false, () => { W.dispatch({ type: "set_carer", hid: h.id, cid: c.id }); setCarerPick(false); }, ` Care ${c.skills?.care || 1}`))}
          </div>
        )}
      </>
    );
  }
  const lvl = h.level || 1, up = hatcheryUpgrade(lvl);
  const canUp = up && W.canAct && (world.coins || 0) >= up.coins && Object.entries(up.goods).every(([k, n]) => (world.food?.[k] || 0) >= n);
  return (
    <Card title={`Hatchery ${i + 1} · level ${lvl}${lvl > 1 ? ` (hatches ${Math.round((hatcherySpeed(lvl) - 1) * 100)}% faster)` : ""}`}>
      {body}
      {e && e.a && (
        <button onClick={() => W.dispatch({ type: "egg_repeat", hid: h.id, on: !h.repeat })} disabled={!W.canAct} title="When this egg hatches, the same two parents start the next one by themselves (if they're free and you can pay)"
          style={btn(!!h.repeat, { alignSelf: "flex-start", padding: "3px 8px", fontSize: 11 })}>{h.repeat ? "Repeat this pairing: on" : "Repeat this pairing: off"}</button>
      )}
      {up && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, color: C.dim, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
          <span>Level {lvl + 1}: hatches {Math.round((hatcherySpeed(lvl + 1) - 1) * 100)}% faster</span>
          <span style={{ color: (world.coins || 0) >= up.coins ? "#ffd65a" : C.bad, fontWeight: 800 }}>{up.coins} coins</span>
          <CostChips cost={up.goods} world={world} />
          <button disabled={!canUp} onClick={() => W.dispatch({ type: "upgrade_hatchery", hid: h.id })} style={btn(!!canUp, { padding: "3px 10px", fontSize: 11 })}>Upgrade</button>
        </div>
      )}
    </Card>
  );
}

// ── Workshops ─────────────────────────────────────────────────────────────────
function Workshops({ world, W, myId }) {
  const [adding, setAdding] = useState(null);           // which workshop's crafter picker is open
  const coins = world.coins || 0;
  const cs = Object.values(world.creatures || {});
  return (
    <>
      <div style={{ fontSize: 12, color: C.dim }}>Workshops turn goods into better goods. A Crafter works there all day; you can also help by hand in Walk mode. Higher Craft skill and workshop level = faster.</div>
      {Object.entries(WORKSHOPS).map(([key, ws]) => {
        const st = world.workshops?.[key];
        const lvl = st?.level || 0;
        const up = nextWorkshop(world, key);
        const crafters = cs.filter(c => c.job === "crafter" && c.station === key);
        const working = crafters.filter(c => stateOf(c) === "working");
        const speed = working.reduce((n, c) => n + skillFactor(c.skills.craft || 1) * (c.buddy && chemistry(c, world.creatures[c.buddy]) > 0 ? 1.15 : 1), 0) * wsSpeed(lvl);
        const perItem = speed > 0 ? ws.secs / speed : null;
        const miss = missingInputs(world, ws.needs);
        const affordable = up && coins >= up.cost && hasGoods(world, up.goods);
        const candidates = cs.filter(c => canManage(c, myId) && !(c.job === "crafter" && c.station === key));
        return (
          <Card key={key} accent={lvl ? undefined : "rgba(255,255,255,0.06)"} data={key}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", opacity: lvl ? 1 : 0.5 }}><ItemIcon kind={ws.makes} size={32} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>{ws.name} <span style={{ color: C.dim, fontSize: 12 }}>{lvl ? `level ${lvl}/5` : "not built"}</span></div>
                <Recipe world={world} ws={ws} />
              </div>
              {up
                ? <button disabled={!W.canAct || !affordable} onClick={() => W.dispatch({ type: "ws_build", key })} style={btn(affordable, { opacity: affordable ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" })}>
                    {lvl ? "Upgrade" : "Build"} <Cost world={world} cost={up.cost} goods={up.goods} />
                  </button>
                : <span style={{ color: C.good, fontWeight: 800, fontSize: 12 }}>MAX</span>}
            </div>
            {lvl > 0 && (
              <>
                <Bar value={(st.progress || 0) * 100} max={100} color={st.stalled ? "#ff9a5d" : "#8ee06a"} compact noWarn />
                <div style={{ fontSize: 12, color: st.on === false ? C.dim : miss.length ? "#ffcf8a" : C.dim }}>
                  {st.on === false ? "Paused." :
                    miss.length ? `Waiting for ${miss.map(([k]) => ITEMS[k].name.toLowerCase()).join(" and ")}.` :
                    perItem ? `One ${ITEMS[ws.makes].name.toLowerCase().replace(/s$/, "")} every ${perItem >= 60 ? `${Math.round(perItem / 60)} min` : `${Math.round(perItem)}s`}${up ? ` · level ${up.level} makes it ${Math.round((wsSpeed(up.level) / wsSpeed(lvl) - 1) * 100)}% faster` : ""}.` :
                    crafters.length ? "Your Crafter is taking a break." : "No Crafter — nothing gets made unless you help by hand."}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: C.dim }}>Crafters:</span>
                  {crafters.length === 0 && <span style={{ color: C.faint }}>none</span>}
                  {crafters.map(c => (
                    <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
                      {c.name} <span style={{ color: C.faint }}>Craft {c.skills.craft || 1}</span>
                      {stateOf(c) !== "working" && <span style={{ color: "#ffcf8a" }}>({STATE_TEXT[stateOf(c)]})</span>}
                      {canManage(c, myId) && <button disabled={!W.canAct} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: null })} style={{ ...btn(false, { padding: "0 6px", fontSize: 11 }) }}>x</button>}
                    </span>
                  ))}
                  {candidates.length > 0 && <button disabled={!W.canAct} onClick={() => setAdding(a => (a === key ? null : key))} style={btn(adding === key, { padding: "4px 10px", fontSize: 12 })}>+ add a crafter</button>}
                  <span style={{ flex: 1 }} />
                  <button disabled={!W.canAct} onClick={() => W.dispatch({ type: "ws_toggle", key })} style={btn(false, { padding: "4px 10px", fontSize: 12 })}>{st.on === false ? "Start" : "Pause"}</button>
                </div>
                {adding === key && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 11, color: C.dim, width: "100%" }}>Pick a crafter (best Craft first):</span>
                    {candidates.slice().sort((a, b) => (b.skills.craft || 1) - (a.skills.craft || 1)).map(c => (
                      <button key={c.id} disabled={!W.canAct} onClick={() => { W.dispatch({ type: "set_job", cid: c.id, job: "crafter", station: key }); setAdding(null); }}
                        style={btn(false, { padding: "3px 10px 3px 4px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 })}>
                        <Portrait species={c.species} traits={c.traits} size={22} />
                        {c.name} <span style={{ color: "#c9a7ff" }}>Craft {c.skills.craft || 1}</span>
                        {c.job && <span style={{ color: C.faint, fontWeight: 700 }}>· {jobLabel(c)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}
    </>
  );
}
function Recipe({ world, ws }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", fontSize: 12, marginTop: 2 }}>
      {Object.entries(ws.needs).map(([k, n], i) => {
        const have = Math.floor(world.food?.[k] || 0), food = ITEMS[k].group === "food";
        return (
          <React.Fragment key={k}>
            {i > 0 && <span style={{ color: C.faint }}>+</span>}
            <span title={`${ITEMS[k].name}: you have ${have}${food ? ` (the last ${FOOD_RESERVE} are saved for your creatures)` : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: usable(world, k) >= n ? C.text : "#ff9aa8" }}>{n}<ItemIcon kind={k} size={16} /></span>
          </React.Fragment>
        );
      })}
      <span style={{ color: C.faint, margin: "0 2px" }}>makes</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>1<ItemIcon kind={ws.makes} size={16} /> {ITEMS[ws.makes].name}</span>
      <span style={{ color: C.faint }}>· {Math.round(ws.secs / 60)} min at Craft 1{Object.keys(ws.needs).some(k => ITEMS[k].group === "food") ? ` · leaves ${FOOD_RESERVE} for your creatures` : ""}</span>
    </div>
  );
}

// ── Market ────────────────────────────────────────────────────────────────────
function Market({ world, W, now }) {
  const contracts = world.contracts || [];
  const built = new Set(Object.keys(WORKSHOPS).filter(k => world.workshops?.[k]?.level).map(k => WORKSHOPS[k].makes));
  const show = (k) => ITEMS[k].group !== "made" || built.has(k) || (world.food?.[k] || 0) >= 1;
  const hauler = Object.values(world.creatures || {}).some(c => c.job === "hauler");
  return (
    <>
      <Card title="Contracts board">
        {contracts.length === 0 && <div style={{ fontSize: 13, color: C.dim }}>No contracts right now. A new one gets posted every 20 minutes or so (up to {CONTRACT_MAX}).</div>}
        {contracts.map(ct => {
          const have = Math.floor(world.food?.[ct.item] || 0);
          const need = ct.n - ct.got;
          const value = Math.round(ct.n * priceOf(world, ct.item));
          return (
            <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <ItemIcon kind={ct.item} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{ct.n} {ITEMS[ct.item].name.toLowerCase()} <span style={{ color: "#ffd65a" }}>· pays {ct.reward}</span></div>
                <div style={{ fontSize: 11, color: C.dim }}>{ct.got}/{ct.n} delivered · ends in {timeLeft(ct.until - now)} · selling them would get about {value}</div>
                <Bar value={ct.got} max={ct.n} color="#ffd65a" compact noWarn />
              </div>
              <button disabled={!W.canAct || have < 1} onClick={() => W.dispatch({ type: "deliver", id: ct.id })} style={btn(have >= need, { opacity: have ? 1 : 0.5, whiteSpace: "nowrap" })}>
                Deliver {Math.min(have, need)}
              </button>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: C.dim }}>Haulers fill contracts automatically, using only what is above your keep amount (never "hands off" items). Partial deliveries count.</div>
      </Card>
      <Card title="Prices">
        <div style={{ fontSize: 11, color: C.dim }}>
          Prices are fixed. Buying costs double the selling price (workshop goods and wild crystals can't be bought).
          {" "}{hauler ? "Your Hauler sells anything above its keep amount and leaves \"hands off\" items alone." : "A Hauler can do the selling for you, using the keep amounts below."}
        </div>
        {ITEM_GROUPS.map(([g, label]) => {
          const keys = ITEM_KEYS.filter(k => ITEMS[k].group === g && show(k));
          if (!keys.length) return null;
          return (
            <div key={g} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={sub}>{label}</div>
              {keys.map(k => <PriceRow key={k} k={k} world={world} W={W} now={now} />)}
            </div>
          );
        })}
      </Card>
    </>
  );
}
function PriceRow({ k, world, W, now }) {
  const have = Math.floor(world.food?.[k] || 0);
  const price = priceOf(world, k);
  const keep = world.keep?.[k];
  const buyP = buyPriceOf(world, k);
  const room = Math.floor(capFor(world, k) - have);
  const step = ITEMS[k].group === "made" ? 5 : 10;
  const setKeep = (v) => W.dispatch({ type: "set_keep", kind: k, keep: v });
  return (
    <div data-item={k} style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ItemIcon kind={k} size={24} />
        <span style={{ fontWeight: 800, flex: 1 }}>{ITEMS[k].name} <span style={{ color: C.dim, fontWeight: 700, fontSize: 12 }}>· have {have}</span></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 900 }}>
          <CoinIcon size={13} /> {fmtCoins(price)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        <button disabled={!W.canAct || have < 1} onClick={() => W.dispatch({ type: "sell", kind: k, n: step })} style={btn(false, { padding: "4px 8px", fontSize: 12, opacity: have ? 1 : 0.4 })}>Sell {step}</button>
        <button disabled={!W.canAct || have < 1} onClick={() => W.dispatch({ type: "sell", kind: k, n: -1 })} style={btn(false, { padding: "4px 8px", fontSize: 12, opacity: have ? 1 : 0.4 })}>Sell all</button>
        {canBuy(k) && <button disabled={!W.canAct || room < 1 || world.coins < buyP} onClick={() => W.dispatch({ type: "buy", kind: k, n: step })} style={btn(false, { padding: "4px 8px", fontSize: 12, opacity: room >= 1 && world.coins >= buyP ? 1 : 0.4, display: "inline-flex", alignItems: "center", gap: 3 })}>Buy {step} <CoinIcon size={11} /> {fmtCoins(buyP * step)}</button>}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: C.dim }}>Hauler:</span>
        <button disabled={!W.canAct} onClick={() => setKeep(keep == null ? (ITEMS[k].group === "food" ? 40 : 0) : null)} style={btn(keep == null, { padding: "4px 8px", fontSize: 11 })}>{keep == null ? "hands off" : "sells extra"}</button>
        {keep != null && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12 }}>
            keep
            <button disabled={!W.canAct} onClick={() => setKeep(Math.max(0, keep - step))} style={btn(false, { padding: "2px 7px", fontSize: 12 })}>-</button>
            <span style={{ minWidth: 26, textAlign: "center", fontWeight: 800 }}>{keep}</span>
            <button disabled={!W.canAct} onClick={() => setKeep(keep + step)} style={btn(false, { padding: "2px 7px", fontSize: 12 })}>+</button>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Buildings ─────────────────────────────────────────────────────────────────
function Land({ world, W }) {
  const owned = world.plots?.length || 1, coins = world.coins || 0;
  const next = plotCost(owned + 1);
  const planted = (world.plots || []).filter(Boolean).length;
  const hands = Object.values(world.creatures || {}).filter(c => c.job === "farmhand");
  const tended = hands.reduce((n, c) => n + plotsPerFarmhand(c), 0);
  return (
    <Card data="land">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Canvas size={40} draw={(ctx, s) => { ctx.fillStyle = "#6b4a32"; ctx.beginPath(); ctx.roundRect(4, 8, s - 8, s - 12, 5); ctx.fill(); drawSprout(ctx, s / 2, s / 2 + 2, 18); }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>Land <span style={{ color: C.dim, fontSize: 12 }}>{owned} plot{owned > 1 ? "s" : ""}{owned < PLOT_COUNT ? ` · home field ${owned}/${PLOT_COUNT}` : " · home field full, new land runs east"}</span></div>
          <div style={{ fontSize: 12, color: C.dim }}>{owned < PLOT_COUNT ? "The home field is cheap to fill. After 16 plots the farm keeps growing to the east, forever (each plot costs a bit more)." : "Every new plot extends the farm east. Walk east to see it."}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {planted}/{owned} planted · Farmhands look after {Math.min(tended, owned)} of them{tended < owned ? <span style={{ color: "#ffcf8a" }}> ({owned - tended} need you or another Farmhand)</span> : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <button disabled={!W.canAct || coins < next} onClick={() => W.dispatch({ type: "buy_plot" })} style={btn(coins >= next, { opacity: coins >= next ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" })}>
            Buy plot {owned + 1} <CoinIcon size={14} /> {next}
          </button>
        </div>
      </div>
    </Card>
  );
}

function Pen({ world, W }) {
  const slots = penSlots(world), used = housedCount(world), coins = world.coins || 0, next = penCost(slots + 1);
  const waiting = Object.values(world.creatures || {}).filter(inMeadow).length;
  return (
    <Card data="pen">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Canvas size={40} draw={(ctx, s) => {
          ctx.fillStyle = "#b07a46"; ctx.fillRect(9, 18, 22, 16);
          ctx.fillStyle = "#8a3f2f"; ctx.beginPath(); ctx.moveTo(5, 19); ctx.lineTo(20, 7); ctx.lineTo(35, 19); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#3a2516"; ctx.beginPath(); ctx.arc(20, 28, 6, Math.PI, Math.PI * 2); ctx.lineTo(26, 34); ctx.lineTo(14, 34); ctx.closePath(); ctx.fill();
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>Pen spots <span style={{ color: C.dim, fontSize: 12 }}>{used}/{slots} used{waiting ? ` · ${waiting} waiting in the meadow` : ""}</span></div>
          <div style={{ fontSize: 12, color: C.dim }}>Only creatures with a spot eat from the trough, rest, work, get groomed and make goods. Shared by both players.</div>
        </div>
        <button disabled={!W.canAct || coins < next} onClick={() => W.dispatch({ type: "buy_pen" })} style={btn(coins >= next, { opacity: coins >= next ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" })}>
          Build spot {slots + 1} <CoinIcon size={14} /> {next}
        </button>
      </div>
    </Card>
  );
}

function Buildings({ world, W }) {
  const coins = world.coins || 0;
  const effect = (key, lvl) => {
    if (key === "trough") return lvl ? `holds ${BUILDINGS.trough.caps[lvl - 1]} food` : "—";
    if (key === "shed") return lvl ? `${BUILDINGS.shed.caps[lvl - 1]} of each item` : "—";
    if (key === "warehouse") return lvl ? `${BUILDINGS.warehouse.caps[lvl - 1]} of each workshop good` : "—";
    if (key === "beds") return `${Math.round((1 + 0.5 * lvl) * 100)}% rest speed`;
    if (key === "stall") return lvl ? "open for business" : "not built";
    return "";
  };
  return [<Pen key="pen" world={world} W={W} />, <Land key="land" world={world} W={W} />, ...Object.entries(BUILDINGS).map(([key, b]) => {
    const lvl = world.buildings?.[key] || 0;
    const up = nextUpgrade(world, key);
    const affordable = up && coins >= up.cost && hasGoods(world, up.goods);
    return (
      <Card key={key}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BuildingIcon kind={key} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>{b.name} <span style={{ color: C.dim, fontSize: 12 }}>{b.max > 1 ? `level ${lvl}/${b.max}` : lvl ? "built" : ""}</span></div>
            <div style={{ fontSize: 12, color: C.dim }}>{b.desc}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>Now: {effect(key, lvl)}{up ? <span style={{ color: C.good }}> → {effect(key, up.level)}</span> : ""}</div>
          </div>
          {up
            ? <button disabled={!W.canAct || !affordable} onClick={() => W.dispatch({ type: "upgrade", key })} style={btn(affordable, { opacity: affordable ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" })}>
                {lvl ? "Upgrade" : "Build"} <Cost world={world} cost={up.cost} goods={up.goods} />
              </button>
            : <span style={{ color: C.good, fontWeight: 800, fontSize: 12 }}>MAX</span>}
        </div>
      </Card>
    );
  })];
}
// "coin 340 + brick 6" — goods you don't have enough of show in red.
function Cost({ world, cost, goods }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CoinIcon size={14} /> {cost}
      {goods && Object.entries(goods).map(([k, n]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: (world.food?.[k] || 0) >= n ? "inherit" : "#c0392b" }}>+ <ItemIcon kind={k} size={14} />{n}</span>
      ))}
    </span>
  );
}

// ── Storage ───────────────────────────────────────────────────────────────────
function Storage({ world, W, setTab }) {
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (world.trough?.[k] || 0), 0);
  return (
    <>
      <Card title="Feeding Trough">
        <Bar label="In the trough" value={inTrough} max={troughCap(world)} color="#ffb347" noWarn />
        <div style={{ fontSize: 12, color: C.dim }}>Creatures eat from the trough on their own. A Feeder keeps it topped up; you can also fill it by hand.</div>
        <button disabled={!W.canAct || inTrough >= troughCap(world)} onClick={() => W.dispatch({ type: "fill_trough" })} style={btn(true, { alignSelf: "flex-start", opacity: inTrough >= troughCap(world) ? 0.5 : 1 })}>Fill the trough</button>
      </Card>
      {ITEM_GROUPS.map(([g, label]) => {
        const keys = ITEM_KEYS.filter(k => ITEMS[k].group === g && (g === "food" || (world.food?.[k] || 0) >= 1));
        const cap = g === "made" ? warehouseCap(world) : storageCap(world);
        return (
          <Card key={g} title={`${label} · ${g === "made" ? "Warehouse" : "Storage Shed"} holds ${cap} of each`}>
            {keys.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>{g === "goods" ? "Happy creatures make these over time." : "Workshops make these."}</div>}
            {keys.map(k => <Bar key={k} label={ITEMS[k].name} value={Math.floor(world.food?.[k] || 0)} max={cap} color={ITEMS[k].color} icon={<ItemIcon kind={k} />} />)}
          </Card>
        );
      })}
      <button onClick={() => setTab("market")} style={btn(false, { alignSelf: "flex-start" })}>Sell or buy in the Market</button>
    </>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Card({ title, children, accent, data }) {
  return (
    <div data-card={data} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent || "rgba(255,255,255,0.1)"}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {title && <div style={{ fontWeight: 900, fontSize: 14, color: accent && accent.startsWith("#") ? accent : C.text }}>{title}</div>}
      {children}
    </div>
  );
}
function Stat({ label, value, color = C.text }) {
  return <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 22, fontWeight: 900, color }}>{value}</span><span style={{ fontSize: 11, color: C.dim }}>{label}</span></div>;
}
function Bar({ label, value, max, color, icon, compact, noWarn }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      {icon}{label && <span style={{ width: 86 }}>{label}</span>}
      <span style={{ flex: 1, height: compact ? 7 : 9, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: pct >= 100 && !noWarn && !compact ? "#ff9a5d" : color }} />
      </span>
      {!compact && <span style={{ color: C.dim, minWidth: 56, textAlign: "right" }}>{Math.floor(value)}/{max}</span>}
    </div>
  );
}
function MiniBar({ value, color, title }) {
  return (
    <span title={`${title} ${Math.round(value)}`} style={{ width: 46, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "inline-block" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: value < 20 ? C.bad : color }} />
    </span>
  );
}
function Canvas({ size, draw, deps = [] }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
    draw(ctx, size);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} style={{ width: size, height: size, flexShrink: 0, display: "inline-block", verticalAlign: "middle" }} />;
}
function Portrait({ species, traits, size }) {
  return <Canvas size={size} deps={[species, traits.hue, traits.rare, traits.size]} draw={(ctx, s) => {
    ctx.save(); ctx.translate(s / 2, s * 0.86); ctx.scale(s / 64, s / 64);
    drawCreature(ctx, 0, 0, species, traits, { face: 1, t: 1 });
    ctx.restore();
  }} />;
}
export function ItemIcon({ kind, size = 18 }) {
  return <Canvas size={size} deps={[kind, size]} draw={(ctx, s) => drawItemIcon(ctx, kind, s / 2, s / 2, s, 0.3)} />;
}
function CoinIcon({ size = 18 }) {
  return <Canvas size={size} deps={[size]} draw={(ctx, s) => {
    ctx.fillStyle = "#e0a82e"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e0a82e"; ctx.fillRect(s * 0.44, s * 0.28, s * 0.12, s * 0.44);
  }} />;
}
function BuildingIcon({ kind }) {
  return <Canvas size={40} deps={[kind]} draw={(ctx, s) => {
    if (kind === "trough") { ctx.save(); ctx.translate(s / 2, s / 2 + 4); drawBowl(ctx, 0, 0, 30); ctx.restore(); }
    else if (kind === "shed" || kind === "warehouse") {
      ctx.fillStyle = kind === "shed" ? "#a0703f" : "#8a8f9a"; ctx.fillRect(8, 16, 24, 18);
      ctx.fillStyle = kind === "shed" ? "#7a4a2a" : "#4f5a6b"; ctx.beginPath(); ctx.moveTo(5, 17); ctx.lineTo(20, 6); ctx.lineTo(35, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a3418"; ctx.fillRect(kind === "shed" ? 17 : 13, 23, kind === "shed" ? 7 : 14, 11);
    } else if (kind === "beds") {
      ctx.fillStyle = "#6fd3ff"; ctx.fillRect(6, 20, 28, 10);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(7, 16, 9, 6);
      ctx.fillStyle = "#8a5a34"; ctx.fillRect(5, 28, 3, 6); ctx.fillRect(32, 28, 3, 6);
    } else if (kind === "stall") {
      ctx.fillStyle = "#8a5a34"; ctx.fillRect(8, 18, 24, 16);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#e04848"; ctx.fillRect(6 + i * 7, 10, 7, 8); }
      drawSun(ctx, 20, 26, 6);
    }
  }} />;
}

const sub = { fontSize: 12, fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" };
function btn(active = false, extra = {}) {
  return {
    padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
    background: active ? C.accent : "rgba(255,255,255,0.06)", color: active ? "#1a1300" : C.text,
    border: active ? "none" : "1px solid rgba(255,255,255,0.15)", ...extra,
  };
}