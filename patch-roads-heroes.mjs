// patch-roads-heroes.mjs — Rootwork: roads fix + hero quick-go (Nov 2026)
//
// HOW TO RUN (PowerShell):
//   1. Put this file in your project folder (C:\Users\Sheas\Documents\pneumevolve)
//   2. cd C:\Users\Sheas\Documents\pneumevolve
//   3. node patch-roads-heroes.mjs
//
// It finds gameEngine.js, RootWork.jsx, WorldZone.jsx and TownZone.jsx under the
// current folder, checks EVERY change lines up first, and only then writes.
// If anything doesn't match, nothing is written and it tells you which part.
// Each file gets a backup next to it: <name>.bak-roads-heroes

import fs from "fs";
import path from "path";

const MARKER = "PATCHED: roads+heroes v1";

// ─── Patches ──────────────────────────────────────────────────────────────────
// find strings are matched with flexible whitespace; everything else must match exactly.

const ENGINE_APPEND = `

// ═════════════════════════════════════════════════════════════════════════════
// ROADS v2 — "on" is player intent, "paused" is unpaid. Roads never switch
// themselves off any more: if upkeep can't be paid they pause, and resume on
// their own once iron/lumber is back. Sending heroes on an expedition turns its
// road on. Newly built roads start OFF.
// ═════════════════════════════════════════════════════════════════════════════

export function isRoadPaused(state, roadLevel) {
  return !!(state.roads?.unpaid?.[roadLevel]);
}

export function isRoadActive(state, roadLevel) {
  return getRoadLevel(state) >= roadLevel && isRoadEnabled(state, roadLevel) && !isRoadPaused(state, roadLevel);
}

export function tickRoads(state) {
  const level = getRoadLevel(state);
  if (level === 0) return state;
  const wr = { ...(state.worldResources ?? {}) };
  const unpaid = {};
  for (let i = 0; i < level; i++) {
    const rt = ROAD_TIERS[i];
    if (!rt || !isRoadEnabled(state, rt.level)) continue;
    const iron = rt.upkeepPerTick.iron_ore ?? 0;
    const lumber = rt.upkeepPerTick.lumber ?? 0;
    if ((wr.iron_ore ?? 0) >= iron && (wr.lumber ?? 0) >= lumber) {
      wr.iron_ore = (wr.iron_ore ?? 0) - iron;
      wr.lumber = (wr.lumber ?? 0) - lumber;
    } else {
      unpaid[rt.level] = true;
    }
  }
  const disrupted = Object.keys(unpaid).length > 0;
  return { ...state, worldResources: wr, roads: { ...(state.roads ?? {}), unpaid, disrupted } };
}

export function isTownConnected(state, townId) {
  const def = TRADE_TOWNS[townId];
  if (!def) return false;
  return isRoadActive(state, def.roadLevel);
}

export function isSpecificRoadConnected(state, roadLevel) {
  return isRoadActive(state, roadLevel);
}

export function buildOrUpgradeRoad(state) {
  const built = _legacyBuildOrUpgradeRoad(state);
  if (built === state) return state;
  const newLevel = built.roads?.level ?? 0;
  const roads = { ...(state.roads ?? {}), level: newLevel, unpaid: { ...(state.roads?.unpaid ?? {}) } };
  roads["road_" + newLevel + "_enabled"] = false; // new road starts OFF
  return { ...built, roads };
}

export function getExpeditionAvailable(state, tierId) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return false;
  const ghLevel = state.town?.buildings?.guild_hall?.level ?? 0;
  return ghLevel >= tier.ghLevel && getRoadLevel(state) >= tier.roadLevel;
}

export function sendExpedition(state, tierId, heroIds) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return state;
  const roads = { ...(state.roads ?? {}) };
  roads["road_" + tier.roadLevel + "_enabled"] = true; // sending heroes turns the road on
  const withRoad = { ...state, roads };

  const existing = (state.expeditions ?? {})[tierId];
  if (existing) {
    // Adding heroes to an expedition that's already running
    const newIds = (heroIds ?? []).filter((id) => !(existing.heroIds ?? []).includes(id));
    if (newIds.length === 0) return state;
    if ((existing.heroIds ?? []).length + newIds.length > tier.maxHeroes) return state;
    const heroes = newIds.map((id) => (state.adventurers ?? []).find((a) => a.id === id));
    if (heroes.some((h) => !h || isHeroBusyForExpedition(state, h))) return state;
    const added = Object.fromEntries(heroes.map((h) => [h.id, { hp: h.hp ?? h.maxHp ?? 40, foodBelt: { ...(h.foodBelt ?? {}) } }]));
    return {
      ...withRoad,
      expeditions: {
        ...(state.expeditions ?? {}),
        [tierId]: { ...existing, heroIds: [...(existing.heroIds ?? []), ...newIds], heroStates: { ...(existing.heroStates ?? {}), ...added } },
      },
    };
  }

  const sent = _legacySendExpedition(withRoad, tierId, heroIds);
  return sent === withRoad ? state : sent;
}

// ─── Heroes: remember last zone + mode so the collapsed card can one-tap Go ──
export function sendAdventurer(state, adventurerId, zoneId, autoBattle = false) {
  const sent = _legacySendAdventurer(state, adventurerId, zoneId, autoBattle);
  if (sent === state) return state;
  return {
    ...sent,
    adventurers: (sent.adventurers ?? []).map((a) =>
      a.id === adventurerId ? { ...a, lastZoneId: zoneId, lastAutoBattle: !!autoBattle } : a
    ),
  };
}

// ${MARKER}
`;

const WORLD_QUICKROW = `// Quick action row on the collapsed card: one tap to Go (last zone) or Collect
  const lastZone = adventurer.lastZoneId ? WORLD_ZONES[adventurer.lastZoneId] : null;
  const lastZoneOk = !!lastZone && isZoneUnlocked(lastZone, adventurer, game.worldZoneClears);
  const quickAuto = !!adventurer.lastAutoBattle && hasAutoBattle;
  const quickNoFood = quickAuto && beltFoodTotal === 0;
  const quickBtnStyle = (color, enabled = true) => ({
    width: "100%", padding: "0.45rem 0.6rem", borderRadius: "9px", fontWeight: 800, fontSize: "0.78rem",
    cursor: enabled ? "pointer" : "default",
    background: enabled ? color + "22" : "rgba(255,255,255,0.04)",
    border: "1px solid " + (enabled ? color + "88" : "var(--border)"),
    color: enabled ? color : "var(--muted)",
  });
  let quickRow = null;
  if (!isInDungeon) {
    if (isOnMission && !mission?.autoBattle && done) {
      quickRow = <button onClick={() => onReturn(adventurer.id)} style={quickBtnStyle("#4ade80")}>🎒 Collect Loot</button>;
    } else if (!isOnMission && adventurer.pendingAutoCollect) {
      quickRow = <button onClick={() => onReturnAutoBattle(adventurer.id)} style={quickBtnStyle("#ef4444")}>🎒 Collect Auto Loot</button>;
    } else if (!isBusy && lastZoneOk) {
      quickRow = (
        <button
          disabled={quickNoFood}
          onClick={() => { if (quickNoFood) return; if (quickAuto) onStartAutoBattle(adventurer.id, lastZone.id); else onSend(adventurer.id, lastZone.id); }}
          style={quickBtnStyle(quickAuto ? "#ef4444" : "#818cf8", !quickNoFood)}
        >
          {quickNoFood
            ? "🍞 Belt empty: tap the card to Fill"
            : (quickAuto ? "⚔️ Auto · " : "⚔️ Go · ") + lastZone.emoji + " " + lastZone.name + " · " + getMissionDuration(adventurer, lastZone) + "s"}
        </button>
      );
    }
  }

  const level1 = expanded && !isInDungeon && (`;

const WORLD_ROADLINE = `{rewardStr} per hero · {tier.damagePerTick} dmg/tick hazard · rare loot every {tier.rareLootRollIntervalTicks}s
                  </div>
                  {(() => {
                    const rKey = "road_" + tier.roadLevel + "_enabled";
                    const roadOn = game.roads?.[rKey] !== false;
                    const roadPaused = roadOn && !!(game.roads?.unpaid?.[tier.roadLevel]);
                    const rt = ROAD_TIERS[tier.roadLevel - 1];
                    const upkeep = rt ? Object.entries(rt.upkeepPerTick).map(([k, v]) => v + " " + (k === "iron_ore" ? "iron" : k)).join(" + ") + "/s" : "";
                    const color = !roadOn ? "var(--muted)" : roadPaused ? "#fbbf24" : "#4ade80";
                    const label = !roadOn ? "OFF (sending heroes turns it on)" : roadPaused ? "PAUSED, not enough iron/lumber (resumes on its own)" : "ON · upkeep " + upkeep;
                    return (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.68rem", padding: "0.3rem 0.5rem", marginBottom: "0.45rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <span style={{ color }}>{(rt ? rt.emoji + " " + rt.name : "Road L" + tier.roadLevel) + ": " + label}</span>
                        {onToggleRoad && (
                          <button onClick={() => onToggleRoad(tier.roadLevel)}
                            style={{ fontSize: "0.62rem", padding: "0.15rem 0.5rem", borderRadius: "6px", cursor: "pointer", fontWeight: 700, flexShrink: 0, background: roadOn ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", border: "1px solid " + (roadOn ? "rgba(74,222,128,0.35)" : "var(--border)"), color: roadOn ? "#4ade80" : "var(--muted)" }}>
                            {roadOn ? "Turn off" : "Turn on"}
                          </button>
                        )}
                      </div>
                    );
                  })()}`;

const PATCHES = {
  "gameEngine.js": [
    { name: "rename old tickRoads", find: `export function tickRoads(state) {`, replace: `function _legacyTickRoads(state) {` },
    { name: "rename old isTownConnected", find: `export function isTownConnected(state, townId) {`, replace: `function _legacyIsTownConnected(state, townId) {` },
    { name: "rename old isSpecificRoadConnected", find: `export function isSpecificRoadConnected(state, roadLevel) {`, replace: `function _legacyIsSpecificRoadConnected(state, roadLevel) {` },
    { name: "rename old buildOrUpgradeRoad", find: `export function buildOrUpgradeRoad(state) {`, replace: `function _legacyBuildOrUpgradeRoad(state) {` },
    { name: "rename old getExpeditionAvailable", find: `export function getExpeditionAvailable(state, tierId) {`, replace: `function _legacyGetExpeditionAvailable(state, tierId) {` },
    { name: "rename old sendExpedition", find: `export function sendExpedition(state, tierId, heroIds) {`, replace: `function _legacySendExpedition(state, tierId, heroIds) {` },
    { name: "rename old sendAdventurer", find: `export function sendAdventurer(state, adventurerId, zoneId, autoBattle = false) {`, replace: `function _legacySendAdventurer(state, adventurerId, zoneId, autoBattle = false) {` },
    {
      name: "offline progress: run roads + trade towns too",
      find: `next = tickBossFight(next, 1);
    next = tickExpeditions(next);
  }
  next.lastSavedTime = nowMs;`,
      replace: `next = tickBossFight(next, 1);
    next = tickExpeditions(next);
    next = tickRoads(next);
    next = tickTradeTowns(next);
  }
  next.lastSavedTime = nowMs;`,
    },
    { name: "append new road/expedition/hero functions", append: ENGINE_APPEND },
  ],

  "RootWork.jsx": [
    {
      name: "remove wheat-delta console.log from game loop",
      find: `const wf = next.farms?.[0];
if (wf) {
  const before = prev.crops?.wheat ?? 0;
  const after = next.crops?.wheat ?? 0;
  if (after !== before) console.log('wheat delta:', after - before, '| workers on farm:', next.workers?.filter(w => w.farmId === wf.id).length);
}`,
      replace: ``,
    },
    {
      name: "tick order: expedition income before road upkeep",
      find: `next = tickRoads(next);
          next = tickTradeTowns(next);
          next = tickExpeditions(next);`,
      replace: `next = tickExpeditions(next);
          next = tickRoads(next);
          next = tickTradeTowns(next);`,
    },
    {
      name: "pass onToggleRoad to WorldZone",
      find: `onSendAdventurer={handleSendAdventurer}`,
      replace: `onSendAdventurer={handleSendAdventurer}
            onToggleRoad={handleToggleRoad}`,
    },
    { name: "marker", append: `\n// ${MARKER}\n` },
  ],

  "WorldZone.jsx": [
    {
      name: "import ROAD_TIERS",
      find: `TRADE_TOWN_ORDER, TRADE_TOWNS } from "../gameConstants";`,
      replace: `TRADE_TOWN_ORDER, TRADE_TOWNS, ROAD_TIERS } from "../gameConstants";`,
    },
    {
      name: "hero card remembers last zone",
      find: `const [selectedZoneId, setSelectedZoneId] = useState(null);`,
      replace: `const [selectedZoneId, setSelectedZoneId] = useState(adventurer.lastZoneId ?? null);`,
    },
    {
      name: "hero card remembers auto-battle mode",
      find: `const [autoBattleMode, setAutoBattleMode] = useState(false);`,
      replace: `const [autoBattleMode, setAutoBattleMode] = useState(!!adventurer.lastAutoBattle);`,
    },
    { name: "add quick Go/Collect row", find: `const level1 = expanded && !isInDungeon && (`, replace: WORLD_QUICKROW },
    {
      name: "render quick row on collapsed card",
      find: `{tinyCard}
      {level1}`,
      replace: `{tinyCard}
      {!expanded && quickRow && <div style={{ padding: "0 0.75rem 0.6rem" }}>{quickRow}</div>}
      {level1}`,
    },
    {
      name: "WorldZone accepts onToggleRoad",
      find: `onToggleTownRoute,
  expeditionClaimResult,`,
      replace: `onToggleTownRoute,
  onToggleRoad,
  expeditionClaimResult,`,
    },
    {
      name: "road status + on/off on each expedition card",
      find: `{rewardStr} per hero · {tier.damagePerTick} dmg/tick hazard · rare loot every {tier.rareLootRollIntervalTicks}s
                  </div>`,
      replace: WORLD_ROADLINE,
    },
    {
      name: "trade town disconnected message",
      find: `Road ran out of materials and shut off. Re-enable it in the Town tab to restore connection.`,
      replace: `Road is off or paused (not enough iron/lumber). Turn it on in Town or on its expedition card. Paused roads resume on their own.`,
    },
    { name: "marker", append: `\n// ${MARKER}\n` },
  ],

  "TownZone.jsx": [
    {
      name: "road paused flag",
      find: `const enabled = isRoadEnabled(game, rt.level);`,
      replace: `const enabled = isRoadEnabled(game, rt.level);
                        const paused = enabled && !!(game.roads?.unpaid?.[rt.level]);`,
    },
    { name: "road button label", find: `{enabled ? "ON" : "OFF"}`, replace: `{!enabled ? "OFF" : paused ? "PAUSED" : "ON"}` },
    { name: "road button colour", find: `color: enabled ? "#4ade80" : "#f87171",`, replace: `color: paused ? "#fbbf24" : enabled ? "#4ade80" : "#f87171",` },
    {
      name: "disrupted message",
      find: `Not enough iron ore or lumber — roads disrupted`,
      replace: `Not enough iron ore or lumber. Paused roads resume on their own once you have materials`,
    },
    {
      name: "new road starts off note",
      find: `New upkeep: {`,
      replace: `New road starts OFF (sending heroes on its expedition turns it on). Upkeep: {`,
    },
    { name: "marker", append: `\n// ${MARKER}\n` },
  ],
};

// ─── Machinery ────────────────────────────────────────────────────────────────

function toRegex(s) {
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped.replace(/\s+/g, "\\s+"), "g");
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const allFiles = [];
walk(process.cwd(), allFiles);

function findFile(name) {
  let hits = allFiles.filter((p) => path.basename(p) === name);
  if (hits.length > 1) hits = hits.filter((p) => p.toLowerCase().includes("rootwork"));
  if (hits.length !== 1) return { error: hits.length === 0 ? "not found under " + process.cwd() : "found more than one copy:\n    " + hits.join("\n    ") };
  return { file: hits[0] };
}

const results = [];
const problems = [];

for (const [name, patches] of Object.entries(PATCHES)) {
  const { file, error } = findFile(name);
  if (error) { problems.push(name + ": " + error); continue; }
  const original = fs.readFileSync(file, "utf8");
  if (original.includes(MARKER)) { console.log("• " + name + " already patched, skipping"); continue; }
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  let text = original.replace(/\r\n/g, "\n");
  for (const p of patches) {
    if (p.append) { text = text.replace(/\s*$/, "") + "\n" + p.append; continue; }
    const re = toRegex(p.find);
    const count = (text.match(re) ?? []).length;
    if (count !== 1) {
      problems.push(name + " → \"" + p.name + "\": expected 1 match, found " + count);
      continue;
    }
    text = text.replace(re, () => p.replace);
  }
  results.push({ name, file, original, text: eol === "\n" ? text : text.replace(/\n/g, eol) });
}

if (problems.length) {
  console.log("\n✋ Nothing was written. These parts didn't line up:\n");
  for (const p of problems) console.log("  - " + p);
  console.log("\nPaste this output back to Claude.");
  process.exit(1);
}

for (const r of results) {
  fs.writeFileSync(r.file + ".bak-roads-heroes", r.original, "utf8");
  fs.writeFileSync(r.file, r.text, "utf8");
  console.log("✓ patched " + path.relative(process.cwd(), r.file));
}
console.log("\nDone. Backups saved as <file>.bak-roads-heroes");
