// src/Pages/Arcade/games/creature-farm/RanchPanel.jsx
//
// The Ranch panel — managing the farm with menus instead of walking around.
//   Overview   coins, storage, trough, what needs attention, "while you were away"
//   Creatures  needs, skills, job, buddy for every creature
//   Buildings  trough, storage shed, beds, market stall — upgrade with coins
//   Storage    what you've got, sell it, fill the trough by hand
//
// Used two ways (see CreatureFarm.jsx):
//   layout="manager"  Manager mode: big panel, the farm keeps running beside it
//   layout="drawer"   Walk mode: the "Ranch" button opens it as a drawer
// No emojis: icons are drawn in code.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../../ui";
import { SPECIES, CROPS } from "./species";
import { drawCreature, drawCropSprite, drawHeart, drawBowl, drawSun } from "./drawFarm";
import {
  JOBS, SKILLS, SKILL_NAMES, BUILDINGS, PRICES, STORE_ITEMS, stateOf, STATE_TEXT, canManage, chemistry,
  nextUpgrade, troughCap, storageCap, xpForNext, plotsPerFarmhand,
} from "./ranch";

// Manager mode panel width (the farm view uses the rest of the screen).
export const MANAGER_PANEL_W = "min(100%, max(58%, 560px))";

const TABS = [["overview", "Overview"], ["creatures", "Creatures"], ["buildings", "Buildings"], ["storage", "Storage"]];

export default function RanchPanel({ world, W, myId, nameOf, colorOf, layout = "drawer", tab: tab0 = "overview", onClose, onSwitchMode, onFollow, reportKey }) {
  const [tab, setTab] = useState(tab0);
  useEffect(() => setTab(tab0), [tab0]);
  const coins = Math.floor(world.coins || 0);
  const isManager = layout === "manager";

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
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={btn(tab === id, { padding: "7px 12px", whiteSpace: "nowrap" })}>
            {label}{id === "overview" && alertsFor(world).length ? ` (${alertsFor(world).length})` : ""}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {tab === "overview" && <Overview world={world} W={W} setTab={setTab} reportKey={reportKey} />}
        {tab === "creatures" && <Creatures world={world} W={W} myId={myId} nameOf={nameOf} colorOf={colorOf} onFollow={onFollow} />}
        {tab === "buildings" && <Buildings world={world} W={W} />}
        {tab === "storage" && <Storage world={world} W={W} />}
      </div>
    </div>
  );
}

// ── What needs attention ──────────────────────────────────────────────────────
export function alertsFor(w) {
  const out = [];
  const cs = Object.values(w.creatures || {});
  const by = (s) => cs.filter(c => stateOf(c) === s);
  const starving = by("starving"), sad = by("sad"), idle = by("idle");
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (w.trough?.[k] || 0), 0);
  const feeders = cs.filter(c => c.job === "feeder" && stateOf(c) === "working").length;
  if (starving.length) out.push({ level: "bad", text: `${names(starving)} ${starving.length > 1 ? "are" : "is"} too hungry to work`, tab: "storage" });
  if (sad.length) out.push({ level: "bad", text: `${names(sad)} ${sad.length > 1 ? "are" : "is"} too sad to work — a Groomer or some petting would help`, tab: "creatures" });
  if (inTrough === 0 && cs.length) out.push({ level: feeders ? "warn" : "bad", text: feeders ? "The trough is empty — your Feeder needs food in storage" : "The trough is empty — fill it or make someone a Feeder", tab: "storage" });
  for (const k of STORE_ITEMS) if ((w.food?.[k] || 0) >= storageCap(w)) out.push({ level: "warn", text: `${CROPS[k].name} storage is full${w.buildings?.stall ? " (the stall is selling the extra)" : " — extra gets wasted. Sell some or upgrade the shed"}`, tab: "storage" });
  if (idle.length) out.push({ level: "info", text: `${names(idle)} ${idle.length > 1 ? "have" : "has"} no job`, tab: "creatures" });
  return out;
}
function names(list) {
  const n = list.map(c => c.name);
  return n.length <= 2 ? n.join(" and ") : `${n.slice(0, 2).join(", ")} and ${n.length - 2} more`;
}

function Overview({ world, W, setTab, reportKey }) {
  const alerts = alertsFor(world);
  const cs = Object.values(world.creatures || {});
  const count = (s) => cs.filter(c => stateOf(c) === s).length;
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (world.trough?.[k] || 0), 0);
  // "while you were away" — each player sees it once
  const rep = world.report;
  const [seenTo, setSeenTo] = useState(() => { try { return Number(localStorage.getItem(reportKey)) || 0; } catch { return 0; } });
  const showReport = rep && rep.to > seenTo;
  const dismiss = () => { try { localStorage.setItem(reportKey, String(rep.to)); } catch { /* storage blocked */ } setSeenTo(rep.to); };

  return (
    <>
      {showReport && <AwayReport rep={rep} onDismiss={dismiss} />}
      <Card>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Stat label="creatures" value={cs.length} />
          <Stat label="working" value={count("working")} color={C.good} />
          <Stat label="resting" value={count("resting")} />
          <Stat label="need help" value={count("starving") + count("sad")} color={count("starving") + count("sad") ? C.bad : C.dim} />
        </div>
        <Bar label="Trough" value={inTrough} max={troughCap(world)} color="#ffb347" />
        {STORE_ITEMS.map(k => <Bar key={k} label={CROPS[k].name} value={Math.floor(world.food?.[k] || 0)} max={storageCap(world)} color={CROPS[k].color} icon={<CropIcon kind={k} />} />)}
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
  let tip = null;
  if (!cs.length) tip = "Pick your first creature to get started.";
  else if (!jobs.size) tip = "Give a creature a job in the Creatures tab. A Farmhand harvests and replants food crops for you.";
  else if (!jobs.has("feeder")) tip = "Make someone a Feeder so the trough fills itself from storage.";
  else if (!world.buildings?.stall) tip = "Save up 150 coins for the Market Stall: it sells whatever won't fit in storage, even while you're away.";
  else if (!jobs.has("groomer")) tip = "A Groomer keeps everyone happy. Playful creatures with high Care are great at it.";
  else tip = "Try buddy pairs: a good forager feeds its buddy when the trough runs dry, and some personalities click.";
  return <Card title="Tip"><div style={{ fontSize: 13, color: C.dim }}>{tip}</div></Card>;
}

function AwayReport({ rep, onDismiss }) {
  const mins = Math.round((rep.to - rep.from) / 60000);
  const span = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
  const gained = Object.entries(rep.gained || {}).filter(([, n]) => n > 0);
  const wasted = Object.entries(rep.wasted || {}).filter(([, n]) => n > 0);
  return (
    <Card title={`While you were away (${span})`} accent="#ffd65a">
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        {gained.length ? <div>Gathered {gained.map(([k, n]) => `${Math.floor(n)} ${CROPS[k].name.toLowerCase()}`).join(", ")}</div> : <div style={{ color: C.dim }}>Nothing was gathered.</div>}
        {rep.harvests > 0 && <div>{rep.harvests} harvests by your Farmhands</div>}
        <div>{rep.meals} meals eaten{rep.buddyMeals ? ` (${rep.buddyMeals} brought by buddies)` : ""}</div>
        {rep.autoSold > 0 && <div style={{ color: "#ffd65a" }}>The stall sold extra food for {Math.floor(rep.autoSold)} coins</div>}
        {wasted.length > 0 && <div style={{ color: "#ffcf8a" }}>Storage was full: {wasted.map(([k, n]) => `${Math.floor(n)} ${CROPS[k].name.toLowerCase()}`).join(", ")} went to waste</div>}
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

function CreatureCard({ c, world, W, myId, nameOf, colorOf, onFollow, open, onToggle }) {
  const sp = SPECIES[c.species];
  const st = stateOf(c);
  const mine = canManage(c, myId);
  const buddy = c.buddy ? world.creatures[c.buddy] : null;
  const chem = buddy ? chemistry(c, buddy) : 0;
  const stColor = st === "working" ? C.good : st === "starving" || st === "sad" ? C.bad : C.dim;
  const others = Object.values(world.creatures).filter(o => o.id !== c.id);
  return (
    <Card>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <Portrait species={c.species} traits={c.traits} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            {c.name} <span style={{ color: C.dim, fontWeight: 700, fontSize: 12 }}>{c.traits.rare ? "golden " : ""}{sp.name} · {c.traits.personality}</span>
          </div>
          <div style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: stColor, fontWeight: 800 }}>{c.job && st === "working" ? JOBS[c.job].name : STATE_TEXT[st]}</span>
            {c.job && st !== "working" && <span style={{ color: C.dim }}>({JOBS[c.job].name})</span>}
            <span style={{ color: colorOf(c.owner) }}>{nameOf(c.owner)}</span>
            {buddy && <span style={{ color: chem > 0 ? C.good : chem < 0 ? C.bad : C.dim }}>buddy: {buddy.name}{chem > 0 ? " (clicks)" : chem < 0 ? " (clashes)" : ""}</span>}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <MiniBar value={c.hunger} color="#ffb347" title="hunger" />
            <MiniBar value={c.happy} color="#ff7aa8" title="happiness" />
            <MiniBar value={c.energy ?? 100} color="#6fd3ff" title="energy" />
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
          <div>
            <div style={sub}>Skills (grow by doing the job)</div>
            {SKILLS.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 3 }}>
                <span style={{ width: 52 }}>{SKILL_NAMES[s]}</span>
                <span style={{ display: "inline-flex", gap: 2 }}>
                  {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i < c.skills[s] ? "#c9a7ff" : "rgba(255,255,255,0.1)" }} />)}
                </span>
                <span style={{ color: C.dim }}>{c.skills[s]}{c.skills[s] < 10 ? ` · ${Math.floor(((c.xp?.[s] || 0) / xpForNext(c.skills[s])) * 100)}% to next` : " · max"}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={sub}>Job {!mine && <span style={{ color: C.faint }}>(only {nameOf(c.owner)} or someone it trusts can change this)</span>}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <button disabled={!mine || !W.canAct} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: null })} style={btn(!c.job, { padding: "6px 10px", fontSize: 12, opacity: mine ? 1 : 0.5 })}>None</button>
              {Object.entries(JOBS).map(([id, j]) => (
                <button key={id} disabled={!mine || !W.canAct} title={j.desc} onClick={() => W.dispatch({ type: "set_job", cid: c.id, job: id })} style={btn(c.job === id, { padding: "6px 10px", fontSize: 12, opacity: mine ? 1 : 0.5 })}>
                  {j.name} <span style={{ color: C.faint }}>{c.skills[j.skill]}</span>
                </button>
              ))}
            </div>
            {c.job && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{JOBS[c.job].desc}{c.job === "farmhand" ? ` Looks after ${plotsPerFarmhand(c)} plot${plotsPerFarmhand(c) > 1 ? "s" : ""}.` : ""}</div>}
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
            <select disabled={!mine || !W.canAct} value={c.buddy || ""} onChange={(e) => W.dispatch({ type: "set_buddy", cid: c.id, buddy: e.target.value || null })}
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

// ── Buildings ─────────────────────────────────────────────────────────────────
function Buildings({ world, W }) {
  const coins = world.coins || 0;
  const effect = (key, lvl) => {
    if (key === "trough") return lvl ? `holds ${BUILDINGS.trough.caps[lvl - 1]} food` : "—";
    if (key === "shed") return lvl ? `${BUILDINGS.shed.caps[lvl - 1]} of each item` : "—";
    if (key === "beds") return `${Math.round((1 + 0.5 * lvl) * 100)}% rest speed`;
    if (key === "stall") return lvl ? "auto-selling extra food" : "not built";
    return "";
  };
  return Object.entries(BUILDINGS).map(([key, b]) => {
    const lvl = world.buildings?.[key] || 0;
    const up = nextUpgrade(world, key);
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
            ? <button disabled={!W.canAct || coins < up.cost} onClick={() => W.dispatch({ type: "upgrade", key })} style={btn(coins >= up.cost, { opacity: coins >= up.cost ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5 })}>
                {lvl ? "Upgrade" : "Build"} <CoinIcon size={14} /> {up.cost}
              </button>
            : <span style={{ color: C.good, fontWeight: 800, fontSize: 12 }}>MAX</span>}
        </div>
      </Card>
    );
  });
}

// ── Storage ───────────────────────────────────────────────────────────────────
function Storage({ world, W }) {
  const cap = storageCap(world);
  const inTrough = STORE_ITEMS.reduce((n, k) => n + (world.trough?.[k] || 0), 0);
  return (
    <>
      {STORE_ITEMS.map(k => {
        const have = Math.floor(world.food?.[k] || 0);
        return (
          <Card key={k}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CropIcon kind={k} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900 }}>{CROPS[k].name} <span style={{ color: C.dim, fontSize: 12 }}>{have} / {cap} · sells for {PRICES[k]}</span></div>
                <Bar value={have} max={cap} color={CROPS[k].color} compact />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={!W.canAct || have < 1} onClick={() => W.dispatch({ type: "sell", kind: k, n: 10 })} style={btn(false, { opacity: have ? 1 : 0.5 })}>Sell 10</button>
              <button disabled={!W.canAct || have < 1} onClick={() => W.dispatch({ type: "sell", kind: k, n: -1 })} style={btn(false, { opacity: have ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5 })}>Sell all <CoinIcon size={13} /> {have * PRICES[k]}</button>
            </div>
          </Card>
        );
      })}
      <Card title="Feeding Trough">
        <Bar label="In the trough" value={inTrough} max={troughCap(world)} color="#ffb347" />
        <div style={{ fontSize: 12, color: C.dim }}>Creatures eat from the trough on their own. A Feeder keeps it topped up; you can also fill it by hand.</div>
        <button disabled={!W.canAct || inTrough >= troughCap(world)} onClick={() => W.dispatch({ type: "fill_trough" })} style={btn(true, { alignSelf: "flex-start", opacity: inTrough >= troughCap(world) ? 0.5 : 1 })}>Fill the trough</button>
      </Card>
    </>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Card({ title, children, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent || "rgba(255,255,255,0.1)"}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {title && <div style={{ fontWeight: 900, fontSize: 14, color: accent || C.text }}>{title}</div>}
      {children}
    </div>
  );
}
function Stat({ label, value, color = C.text }) {
  return <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 22, fontWeight: 900, color }}>{value}</span><span style={{ fontSize: 11, color: C.dim }}>{label}</span></div>;
}
function Bar({ label, value, max, color, icon, compact }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      {icon}{label && <span style={{ width: 86 }}>{label}</span>}
      <span style={{ flex: 1, height: compact ? 7 : 9, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: pct >= 100 && label !== "In the trough" && label !== "Trough" ? "#ff9a5d" : color }} />
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
function CropIcon({ kind, size = 18 }) {
  return <Canvas size={size} deps={[kind]} draw={(ctx, s) => drawCropSprite(ctx, kind, s / 2, s / 2, s, 0)} />;
}
function CoinIcon({ size = 18 }) {
  return <Canvas size={size} draw={(ctx, s) => {
    ctx.fillStyle = "#e0a82e"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e0a82e"; ctx.fillRect(s * 0.44, s * 0.28, s * 0.12, s * 0.44);
  }} />;
}
function BuildingIcon({ kind }) {
  return <Canvas size={40} deps={[kind]} draw={(ctx, s) => {
    if (kind === "trough") { ctx.save(); ctx.translate(s / 2, s / 2 + 4); drawBowl(ctx, 0, 0, 30); ctx.restore(); }
    else if (kind === "shed") {
      ctx.fillStyle = "#a0703f"; ctx.fillRect(8, 16, 24, 18);
      ctx.fillStyle = "#7a4a2a"; ctx.beginPath(); ctx.moveTo(5, 17); ctx.lineTo(20, 6); ctx.lineTo(35, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a3418"; ctx.fillRect(17, 23, 7, 11);
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