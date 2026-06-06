// engine_world.js — split from deadMilesEngine.js (pure functions, no React)

import { ATTACK_BASE_DAMAGE, CRISIS_CHANCE, CRISIS_EVENT_TYPES, GARDEN_HEAL_PER_TICK, MAX_WORLD_EVENTS, THREAT_DECAY_ON_CLEAR_PER_TICK, THREAT_ESCALATION_PER_TICK, THREAT_TIERS, TURRET_DAMAGE_REDUCTION, WORLD_EDGES } from "./engine_constants";

// Step 3: home defense from alive turrets + guard-post survivors (+ basic walls).
// Returns a 0..0.85 damage-reduction fraction. Inline status strings avoid an
// import cycle with survivorRoster.
export function computeHomeDefense(homeBase, roster = []) {
  let def = 0.2; // basic walls
  const turrets = (homeBase?.turrets ?? []).filter(t => !t.destroyed && (t.hp ?? 0) > 0);
  def += turrets.length * 0.15;
  const guards = (roster ?? []).filter(
    r => r.rosterStatus === "at_base" && r.workstation === "guard_post" && (r.hp ?? 0) > 0
  );
  def += guards.length * 0.1;
  return Math.min(0.85, def);
}

export function tickBaseAttacks(worldState, currentLevelId = null, worldEventsRef = null, homeVulnerable = false) {
  let attackedLevelIds = [];
  let homeRaid = null;
  // Home layer is cloned lazily only if a raid actually lands.
  let homeBase = worldState.homeBase;
  let roster   = worldState.roster;

  const levels = worldState.levels.map(level => {
    const isHome = level.id === 0 || level.isHomeBase;

    // Non-home nodes are run destinations — they don't have persistent base HP,
    // supply routes, or raiding. Only status (cleared/unexplored) matters.
    if (!isHome) return level;

    // ── Home base (level 0) ────────────────────────────────────────────────
    // Present (in the hub) → home is safe and slowly repairs.
    // Away → raidable, turrets + guard-post survivors blunt the damage.
    let { baseHp = 100, gardenPlots = 0 } = level;

    if (!homeVulnerable || level.id === currentLevelId) {
      const heal = Math.max(GARDEN_HEAL_PER_TICK, gardenPlots * GARDEN_HEAL_PER_TICK);
      baseHp = Math.min(100, baseHp + heal);
      const status = (level.status === "under_attack" && baseHp > 0) ? "secured" : level.status;
      return { ...level, baseHp, status };
    }

    const tier = level.threatTier ?? 0;
    const tierInfo = getThreatTierInfo(tier);
    const attacked = Math.random() < tierInfo.attackChance;
    if (!attacked) return level;

    const defense = computeHomeDefense(homeBase, roster);
    const rawDmg = ATTACK_BASE_DAMAGE * tierInfo.damageMult;
    const dmg = Math.max(1, Math.round(rawDmg * (1 - defense)));
    baseHp = Math.max(0, baseHp - dmg);
    attackedLevelIds.push(0);

    // Degrade a random alive home turret.
    let turretHit = false;
    homeBase = { ...homeBase, turrets: (homeBase?.turrets ?? []).map(t => ({ ...t })) };
    const aliveTurrets = homeBase.turrets.filter(t => !t.destroyed && (t.hp ?? 0) > 0);
    if (aliveTurrets.length) {
      const tt = aliveTurrets[Math.floor(Math.random() * aliveTurrets.length)];
      tt.hp = Math.max(0, (tt.hp ?? 0) - 40);
      if (tt.hp <= 0) tt.destroyed = true;
      turretHit = true;
    }

    // Thin defenses → a home survivor gets hurt (wounded, never killed offscreen).
    let woundedName = null;
    if (defense < 0.4) {
      const home = (roster ?? []).filter(r => r.rosterStatus === "at_base" && (r.hp ?? 0) > 1);
      if (home.length) {
        roster = (roster ?? []).map(r => ({ ...r }));
        const pick = roster.filter(r => r.rosterStatus === "at_base" && (r.hp ?? 0) > 1);
        const sv = pick[Math.floor(Math.random() * pick.length)];
        sv.hp = Math.max(1, (sv.hp ?? 1) - 15);
        sv.morale = Math.max(0, (sv.morale ?? 100) - 10);
        woundedName = sv.name;
      }
    }

    // Home fell → raiders take a cut of the stockpile.
    const fell = baseHp <= 0;
    if (fell) {
      homeBase = { ...homeBase, baseStorage: { ...(homeBase.baseStorage ?? {}) } };
      const bs = homeBase.baseStorage;
      bs.food  = Math.floor((bs.food  ?? 0) * 0.7);
      bs.scrap = Math.floor((bs.scrap ?? 0) * 0.7);
    }

    homeRaid = { damage: dmg, baseHp, turretHit, woundedName, fell };
    if (worldEventsRef) {
      worldEventsRef.current = pushWorldEvent(worldEventsRef.current, "attack", { levelId: 0, damage: dmg });
    }

    const status = baseHp <= 0 ? "under_attack" : level.status;
    return { ...level, baseHp, status };
  });

  const next = { ...worldState, levels };
  if (homeBase !== worldState.homeBase) next.homeBase = homeBase;
  if (roster !== worldState.roster) next.roster = roster;

  return { worldState: next, attackedLevelIds, homeRaid };
}

// ─── Survivor Traits System ──────────────────────────────────────────────────
// Each survivor spawns with 1–2 traits. Traits affect output multipliers,
// valid commands, and BaseView display. Designed to create RimWorld-weight
// decisions: do you send your "cowardly" farmer out to scavenge, or leave them safe?
function getAdjacentIds(levelId) {
  const adj = [];
  for (const [a, b] of WORLD_EDGES) {
    if (a === levelId) adj.push(b);
    if (b === levelId) adj.push(a);
  }
  return adj;
}

/**
 * Tick threat tiers for the home base only.
 * Non-home nodes are run destinations — their threat tier is display-only
 * and represents run difficulty, not base-management pressure.
 */
export function tickThreatTiers(worldState) {
  const levels = worldState.levels.map(level => {
    // Only home base (id 0) has living threat escalation
    if (level.id !== 0 && !level.isHomeBase) return level;
    if (level.status !== "secured" && level.status !== "under_attack") return level;

    const adjIds = getAdjacentIds(level.id);
    const adjLevels = adjIds.map(id => worldState.levels.find(l => l.id === id)).filter(Boolean);
    const hasUnclearedNeighbor = adjLevels.some(l => l.status === "unexplored" || l.status === "active");
    const allNeighborsCleared  = adjLevels.length > 0 && adjLevels.every(l => l.status === "cleared" || l.status === "secured");

    let tier = level.threatTier ?? 1;
    if (hasUnclearedNeighbor) {
      tier = Math.min(4, tier + THREAT_ESCALATION_PER_TICK);
    } else if (allNeighborsCleared) {
      tier = Math.max(0, tier - THREAT_DECAY_ON_CLEAR_PER_TICK);
    }

    return { ...level, threatTier: tier };
  });

  return { ...worldState, levels };
}

// ─── Supply Routes (removed) ──────────────────────────────────────────────────
// Supply routes between outposts have been cut. Runs are loot destinations only.
// These stubs exist so any lingering call sites don't crash.
export function tickSupplyRoutes(worldState) { return worldState; }
export function addSupplyRoute(worldState)    { return null; }
export function removeSupplyRoute(worldState, routeId) {
  const routes = (worldState.supplyRoutes ?? []).filter(r => r.id !== routeId);
  return { ...worldState, supplyRoutes: routes };
}

/**
 * Get the discrete tier (0–4) for display. Accepts fractional tier values.
 */
export function getThreatTierInfo(tier) {
  const t = Math.min(4, Math.max(0, Math.round(tier ?? 1)));
  return { ...THREAT_TIERS[t], tier: t };
}

// ─── World Events Ticker ──────────────────────────────────────────────────────
// Generates narrative event strings for the WorldMap sidebar.
// Pure function — takes worldState + previous events, returns new event array.
export function generateWorldEvent(worldState, type, payload = {}) {
  const ts = Date.now();
  const levelName = (id) => {
    const NAMES = { 0: "Home Base", 1: "Hamlet", 2: "Highway Mile 1", 3: "Truck Stop", 4: "Overpass", 5: "River Bridge", 6: "City Outskirts", 7: "Downtown Core" };
    return NAMES[id] ?? `Zone ${id}`;
  };

  let text = "";
  switch (type) {
    case "attack":       text = `⚔ Horde hit ${levelName(payload.levelId)} — ${payload.damage} damage dealt`; break;
    case "route_cut":    text = `🚫 Supply route to ${levelName(payload.toId)} disrupted`; break;
    case "route_active": text = `📦 Supply route to ${levelName(payload.toId)} delivering goods`; break;
    case "threat_up":    text = `⚠ Threat rising at ${levelName(payload.levelId)}: ${payload.tierLabel}`; break;
    case "threat_down":  text = `✅ Threat easing at ${levelName(payload.levelId)}`; break;
    case "base_secured": text = `🏴 ${levelName(payload.levelId)} secured`; break;
    case "resource_gen": text = `📈 ${levelName(payload.levelId)} generated ${payload.amount} ${payload.resource}`; break;
    default:             text = payload.text ?? "Unknown event"; break;
  }

  return { id: `evt_${ts}_${Math.random().toString(36).slice(2,6)}`, type, text, ts, payload };
}
export function pushWorldEvent(events, type, payload = {}, worldState = null) {
  const evt = generateWorldEvent(worldState ?? {}, type, payload);
  const next = [evt, ...(events ?? [])];
  if (next.length > MAX_WORLD_EVENTS) next.length = MAX_WORLD_EVENTS;
  return next;
}

// ─── Crisis Events ───────────────────────────────────────────────────────────
// Random events that demand player decisions. Inspired by RimWorld.
// Generated by tickCrisisEvents and consumed/dismissed in BaseView.
export function maybeGenerateCrisis(worldState, survivors) {
  if (Math.random() > CRISIS_CHANCE) return null;
  if (!survivors || survivors.length === 0) return null;

  // Pick a crisis type by weight
  const totalWeight = CRISIS_EVENT_TYPES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * totalWeight;
  let ctype = CRISIS_EVENT_TYPES[0];
  for (const ct of CRISIS_EVENT_TYPES) {
    r -= ct.weight;
    if (r <= 0) { ctype = ct; break; }
  }

  // Pick a random survivor (alive)
  const alive = survivors.filter(sv => sv.hp > 0);
  if (alive.length === 0) return null;
  const sv = alive[Math.floor(Math.random() * alive.length)];

  return ctype.generate(sv);
}

// ─── Step 6: Passive resource generation ──────────────────────────────────────
// Pure function — call from index.jsx on a slower interval (~60 s real-time).
// Each secured base generates food from garden plots and scrap if a turret is
// present (representing a salvage crew). Resources cap per-level and are also
// aggregated into worldState.totalResources.
//
// Returns a new worldState object; does not mutate the input.