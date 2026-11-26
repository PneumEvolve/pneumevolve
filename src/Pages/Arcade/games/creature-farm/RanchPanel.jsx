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

import React, { useEffect, useRef, useState } from "react";
import { C } from "../../ui";
import { SPECIES } from "./species";
import { drawCreature, drawBowl, drawSun, drawItemIcon } from "./drawFarm";
import {
  JOBS, SKILLS, SKILL_NAMES, BUILDINGS, STORE_ITEMS, stateOf, STATE_TEXT, canManage, chemistry,
  nextUpgrade, troughCap, storageCap, warehouseCap, capFor, xpForNext, plotsPerFarmhand,
  ITEMS, ITEM_KEYS, ITEM_GROUPS, PRODUCT_OF, WORKSHOPS, nextWorkshop, wsSpeed, skillFactor, hasGoods,
  priceOf, buyPriceOf, trendOf, canBuy, fmtCoins, makesGoods, PRODUCE_SECS, CONTRACT_MAX,
} from "./ranch";

// Manager mode panel width (the farm view uses the rest of the screen).
export const MANAGER_PANEL_W = "min(100%, max(58%, 560px))";

const TABS = [["overview", "Overview"], ["creatures", "Creatures"], ["workshops", "Workshops"], ["market", "Market"], ["buildings", "Buildings"], ["storage", "Storage"]];

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
        {tab === "creatures" && <Creatures world={world} W={W} myId={myId} nameOf={nameOf} colorOf={colorOf} onFollow={onFollow} />}
        {tab === "workshops" && <Workshops world={world} W={W} myId={myId} />}
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
    const miss = Object.entries(ws.needs).filter(([k, n]) => (w.food?.[k] || 0) < n).map(([k]) => ITEMS[k].name.toLowerCase());
    if (crafters.length && miss.length) out.push({ level: "warn", text: `The ${ws.name} is waiting for ${miss.join(" and ")}`, tab: "workshops" });
    else if (!crafters.length) out.push({ level: "info", text: `Nobody works at the ${ws.name}`, tab: "workshops" });
  }
  const full = ITEM_KEYS.filter(k => (w.food?.[k] || 0) >= capFor(w, k));
  if (full.length) out.push({ level: "warn", text: `${full.map(k => ITEMS[k].name).slice(0, 3).join(", ")}${full.length > 3 ? ` and ${full.length - 3} more` : ""} ${full.length > 1 ? "are" : "is"} full${w.buildings?.stall ? " (the stall sells the extra)" : " — extra gets wasted"}`, tab: "storage" });
  for (const ct of w.contracts || []) if (ct.until - now < 2 * 3600e3) out.push({ level: "warn", text: `Contract for ${ct.n} ${ITEMS[ct.item].name.toLowerCase()} ends in ${timeLeft(ct.until - now)} (${ct.got}/${ct.n})`, tab: "market" });
  if (idle.length) out.push({ level: "info", text: `${names(idle)} ${idle.length > 1 ? "have" : "has"} no job`, tab: "creatures" });
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
  else if (!jobs.size) tip = "Give a creature a job in the Creatures tab. A Farmhand harvests and replants food crops for you.";
  else if (!jobs.has("feeder")) tip = "Make someone a Feeder so the trough fills itself from storage.";
  else if (!world.buildings?.stall) tip = "Save up 150 coins for the Market Stall: it sells whatever won't fit in storage, and Haulers sell there.";
  else if (!built.length) tip = "Build the Jam Kitchen (Workshops tab). 4 berries become a jar of jam that sells for much more.";
  else if (!jobs.has("crafter")) tip = "Make someone a Crafter at your workshop. Creatures with high Craft work faster.";
  else if (!jobs.has("hauler")) tip = "A Hauler takes goods to the stall for you: it fills contracts, then sells anything above your keep amounts (Market tab).";
  else if (!world.workshops?.kiln?.level) tip = "Happy creatures make goods: Pebblets make pebbles, Emberpups make embers. The Kiln turns them into bricks, and bricks unlock bigger upgrades.";
  else if (!jobs.has("groomer")) tip = "Only happy creatures (50+) make goods. A Groomer keeps everyone's spirits up.";
  else tip = "Prices move every hour, and selling a lot of one thing pushes its price down. Spread your selling around, and watch for arrows going up.";
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
        {rep.levelUps?.length > 0 && <div style={{ color: C.good }}>Skills up: {rep.levelUps.slice(0, 6).join(", ")}{rep.levelUps.length > 6 ? ` +${rep.levelUps.length - 6} more` : ""}</div>}
      </div>
      <button onClick={onDismiss} style={btn(true, { alignSelf: "flex-start" })}>Got it</button>
    </Card>
  );
}

// ── Creatures ─────────────────────────────────────────────────────────────────
const FILTERS = [["all", "All"], ["mine", "Mine"], ["help", "Need help"], ["idle", "No job"]];
function Creatures({ world, W, myId, nameOf, colorOf, onFollow }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const all = Object.values(world.creatures || {});
  const list = all.filter(c =>
    filter === "mine" ? c.owner === myId :
    filter === "help" ? ["starving", "sad"].includes(stateOf(c)) :
    filter === "idle" ? stateOf(c) === "idle" : true);
  return (
    <>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {FILTERS.map(([id, label]) => <button key={id} onClick={() => setFilter(id)} style={btn(filter === id, { padding: "5px 10px", fontSize: 12 })}>{label}</button>)}
      </div>
      {list.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Nobody here.</div>}
      {list.map(c => (
        <CreatureCard key={c.id} c={c} world={world} W={W} myId={myId} nameOf={nameOf} colorOf={colorOf} onFollow={onFollow}
          open={open === c.id} onToggle={() => setOpen(o => (o === c.id ? null : c.id))} />
      ))}
    </>
  );
}

function jobLabel(c) {
  if (!c.job) return null;
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
          {product && (
            <div style={{ fontSize: 12, color: C.dim, display: "flex", alignItems: "center", gap: 6 }}>
              <ItemIcon kind={product} size={18} />
              {makesGoods(c)
                ? `Makes ${ITEMS[product].name.toLowerCase()}: about 1 every ${Math.round(PRODUCE_SECS / 60 / (c.happy / 100) / (c.traits.rare ? 2 : 1))} min while happy${c.traits.rare ? " (golden: double)" : ""}.`
                : `Makes ${ITEMS[product].name.toLowerCase()}, but only when happy (50+) and fed.`}
            </div>
          )}
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
            <div style={sub}>Job {!mine && <span style={{ color: C.faint }}>(only {nameOf(c.owner)} or someone it trusts can change this)</span>}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <button disabled={!can} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: null })} style={btn(!c.job, { padding: "6px 10px", fontSize: 12, opacity: mine ? 1 : 0.5 })}>None</button>
              {Object.entries(JOBS).map(([id, j]) => {
                const blocked = id === "crafter" && !built.length;
                return (
                  <button key={id} disabled={!can || blocked} title={blocked ? "Build a workshop first" : j.desc} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: id })}
                    style={btn(c.job === id, { padding: "6px 10px", fontSize: 12, opacity: mine && !blocked ? 1 : 0.4 })}>
                    {j.name} <span style={{ color: C.faint }}>{c.skills[j.skill] || 1}</span>
                  </button>
                );
              })}
            </div>
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
            {c.job && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{JOBS[c.job].desc}{c.job === "farmhand" ? ` Looks after ${plotsPerFarmhand(c)} plot${plotsPerFarmhand(c) > 1 ? "s" : ""}.` : ""}{c.job === "hauler" && !world.buildings?.stall ? " Needs the Market Stall." : ""}</div>}
            {!built.length && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Crafter unlocks once you build a workshop.</div>}
          </div>
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
            <select disabled={!can} value={c.buddy || ""} onChange={(e) => W.dispatch({ type: "set_buddy", cid: c.id, buddy: e.target.value || null })}
              style={{ marginTop: 4, padding: "7px 8px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: C.text, border: "1px solid rgba(255,255,255,0.15)", fontFamily: "inherit", width: "100%" }}>
              <option value="">no buddy</option>
              {others.map(o => {
                const ch = chemistry(c, o);
                return <option key={o.id} value={o.id}>{o.name} ({SPECIES[o.species].name}, {o.traits.personality}){ch > 0 ? " — clicks!" : ch < 0 ? " — clashes" : ""}</option>;
              })}
            </select>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Buddies who forage or feed bring food when the trough runs dry. A buddy with Care 5+ keeps the other happy. Pairs that click work faster; pairs that clash get grumpy.</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Workshops ─────────────────────────────────────────────────────────────────
function Workshops({ world, W, myId }) {
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
        const miss = Object.entries(ws.needs).filter(([k, n]) => (world.food?.[k] || 0) < n);
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
                  {candidates.length > 0 && (
                    <select disabled={!W.canAct} value="" onChange={(e) => e.target.value && W.dispatch({ type: "set_job", cid: e.target.value, job: "crafter", station: key })}
                      style={{ padding: "4px 6px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: C.text, border: "1px solid rgba(255,255,255,0.15)", fontFamily: "inherit", fontSize: 12 }}>
                      <option value="">+ add a crafter</option>
                      {candidates.slice().sort((a, b) => (b.skills.craft || 1) - (a.skills.craft || 1)).map(c => <option key={c.id} value={c.id}>{c.name} (Craft {c.skills.craft || 1}{c.job ? `, now ${jobLabel(c)}` : ""})</option>)}
                    </select>
                  )}
                  <span style={{ flex: 1 }} />
                  <button disabled={!W.canAct} onClick={() => W.dispatch({ type: "ws_toggle", key })} style={btn(false, { padding: "4px 10px", fontSize: 12 })}>{st.on === false ? "Start" : "Pause"}</button>
                </div>
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
        const have = Math.floor(world.food?.[k] || 0);
        return (
          <React.Fragment key={k}>
            {i > 0 && <span style={{ color: C.faint }}>+</span>}
            <span title={`${ITEMS[k].name}: you have ${have}`} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: have >= n ? C.text : "#ff9aa8" }}>{n}<ItemIcon kind={k} size={16} /></span>
          </React.Fragment>
        );
      })}
      <span style={{ color: C.faint, margin: "0 2px" }}>makes</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>1<ItemIcon kind={ws.makes} size={16} /> {ITEMS[ws.makes].name}</span>
      <span style={{ color: C.faint }}>· {Math.round(ws.secs / 60)} min at Craft 1</span>
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
          Prices change every hour; arrows show where they're heading. Selling lots of one thing pushes its price down for a while.
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
  const price = priceOf(world, k), base = ITEMS[k].price;
  const trend = trendOf(world, k, now);
  const keep = world.keep?.[k];
  const buyP = buyPriceOf(world, k);
  const room = Math.floor(capFor(world, k) - have);
  const step = ITEMS[k].group === "made" ? 5 : 10;
  const setKeep = (v) => W.dispatch({ type: "set_keep", kind: k, keep: v });
  const pct = Math.round((price / base) * 100);
  return (
    <div data-item={k} style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ItemIcon kind={k} size={24} />
        <span style={{ fontWeight: 800, flex: 1 }}>{ITEMS[k].name} <span style={{ color: C.dim, fontWeight: 700, fontSize: 12 }}>· have {have}</span></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 900, color: pct >= 110 ? C.good : pct <= 80 ? "#ff9aa8" : C.text }}>
          <Trend dir={trend} /> <CoinIcon size={13} /> {fmtCoins(price)} <span style={{ fontSize: 11, color: C.faint, fontWeight: 700 }}>{pct}%</span>
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
  return Object.entries(BUILDINGS).map(([key, b]) => {
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
  });
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
function Trend({ dir }) {
  return <Canvas size={12} deps={[dir]} draw={(ctx, s) => {
    ctx.fillStyle = dir > 0 ? "#7ee081" : dir < 0 ? "#ff7a6b" : "rgba(243,236,255,0.35)";
    ctx.beginPath();
    if (dir > 0) { ctx.moveTo(s / 2, 1); ctx.lineTo(s - 1, s - 2); ctx.lineTo(1, s - 2); }
    else if (dir < 0) { ctx.moveTo(1, 2); ctx.lineTo(s - 1, 2); ctx.lineTo(s / 2, s - 1); }
    else { ctx.rect(1, s / 2 - 1.5, s - 2, 3); }
    ctx.fill();
  }} />;
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