// src/Pages/DeadMiles/survivorRoster.js
//
// Phase 0.1 — Persistent named survivors across the campaign.
//
// The roster is the SINGLE SOURCE OF TRUTH for "who exists." It lives in
// `worldState.roster` and survives between missions and across sessions.
//
// Action-layer survivor instances (the big objects the game loop mutates —
// x, y, AI state, _castTimer, etc.) are HYDRATED FROM roster records on deploy,
// and their durable progression is EXTRACTED BACK on return.
//
// Durable identity/progression  ──►  roster record  (persists)
// Transient action-layer instance ──► live survivor   (rebuilt each mission)
//
// This module is pure (no React). It only depends on the engine for the
// canonical live-survivor shape and the trait constants.

import {
  createSurvivor,
  hasTrait,
  SURVIVOR_TRAITS,
  survivorXpToLevel,
} from "./deadMilesEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// POLICY: what happens to a survivor you brought on a FAILED mission?
//
//   false (default) → survivors still alive at mission end RETREAT home wounded
//                     (hp clamped low, morale hit). Only survivors actually
//                     downed in the field die. Keeps the roster from collapsing
//                     on one bad run while still punishing failure.
//
//   true            → full permadeath: everyone you brought on a lost mission
//                     dies. Maximum RimWorld stakes. Flip this one constant.
// ─────────────────────────────────────────────────────────────────────────────
export const PERMADEATH_ON_FAILED_RETREAT = false;

// Wounded-retreat tuning (only used when the constant above is false).
export const RETREAT_HP_FRACTION   = 0.35; // survivors come home at 35% max HP
export const RETREAT_MORALE_PENALTY = 20;   // and take a morale hit

// Roster lifecycle status (distinct from the live survivor's action-layer
// `status`/`state` fields — kept under its own key to avoid collisions).
export const ROSTER_STATUS = {
  AT_BASE:  "at_base",   // home, available to deploy
  DEPLOYED: "deployed",  // currently out on a mission
  DEAD:     "dead",      // permanent
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * Mint a campaign-unique, STABLE survivor id. The id never changes for the life
 * of the survivor, so traits/backstory (which the engine seeds off the id) stay
 * consistent forever. Uses a monotonic counter stored on worldState.
 */
export function mintSurvivorId(worldState) {
  if (!worldState) return `sv_${Date.now()}`;
  worldState._survivorSeq = (worldState._survivorSeq ?? 0) + 1;
  return `sv_${worldState._survivorSeq}`;
}

// ─── Record <-> live survivor bridging ───────────────────────────────────────

const ROSTER_NAMES = ["Marcus", "Jen", "Dale", "Rosa", "Tony", "Beth", "Ivan", "Priya", "Sam", "Noor", "Cole", "Maya"];
const ROSTER_ROLES = ["mechanic", "farmer", "scavenger", "gunner", "medic", "scout"];

/**
 * Create a brand-new roster record (used the moment a survivor is recruited).
 * Generates a full live survivor once to pull deterministic traits/backstory,
 * then keeps only the durable fields.
 */
export function createRosterRecord(worldState, { name, role, homeBaseId = null } = {}) {
  const id = mintSurvivorId(worldState);
  const seed = (worldState?._survivorSeq ?? 0);
  const n = name ?? ROSTER_NAMES[seed % ROSTER_NAMES.length];
  const r = role ?? ROSTER_ROLES[seed % ROSTER_ROLES.length];
  // Build a throwaway live survivor to harvest engine-generated identity.
  const tmp = createSurvivor(id, 0, 0, n, r);
  return {
    id,
    name: tmp.name,
    role: tmp.role,
    traits: [...tmp.traits],
    backstory: tmp.backstory,
    storyLog: tmp.storyLog.map(e => ({ ...e })),
    xp: 0,
    level: 1,
    maxHp: tmp.maxHp,
    hp: tmp.maxHp,
    morale: 100,
    hunger: 0,
    homeBaseId,
    rosterStatus: ROSTER_STATUS.AT_BASE,
    // ── Phase 2 ──────────────────────────────────────────────────────────────
    specialization: null,   // set permanently at XP level 3 via setSpecialization()
  };
}

/**
 * Extract the durable patch from a (possibly newly-discovered) roster record.
 * If a live survivor already exists, use createRosterRecordFromSurvivor instead.
 */
export function createRosterRecordFromSurvivor(worldState, liveSurvivor, homeBaseId = null) {
  // A discovery-minted survivor may still carry a level-tied id (e.g. "s_b12").
  // Re-id it to a stable campaign id the first time it enters the roster.
  const id = mintSurvivorId(worldState);
  return {
    id,
    name: liveSurvivor.name,
    role: liveSurvivor.role,
    traits: [...(liveSurvivor.traits ?? [])],
    backstory: liveSurvivor.backstory ?? "",
    storyLog: (liveSurvivor.storyLog ?? []).map(e => ({ ...e })),
    xp: liveSurvivor.xp ?? 0,
    level: liveSurvivor.level ?? 1,
    maxHp: liveSurvivor.maxHp ?? 80,
    hp: liveSurvivor.hp ?? liveSurvivor.maxHp ?? 80,
    morale: liveSurvivor.morale ?? 100,
    hunger: liveSurvivor.hunger ?? 0,
    homeBaseId,
    rosterStatus: ROSTER_STATUS.DEPLOYED, // discovered in the field → currently out
    _liveId: liveSurvivor.id,             // remember the in-mission id for merge-back
    // ── Phase 2 ──────────────────────────────────────────────────────────────
    specialization: liveSurvivor.specialization ?? null,
  };
}

/**
 * Build a full action-layer survivor from a durable roster record, placed at
 * (x, y). Starts from createSurvivor so every transient field the game loop
 * expects is present, then overwrites identity/progression from the record.
 */
export function hydrateSurvivor(record, x, y) {
  const sv = createSurvivor(record.id, x, y, record.name, record.role);
  sv.traits    = [...(record.traits ?? sv.traits)];
  sv.backstory = record.backstory ?? sv.backstory;
  sv.storyLog  = (record.storyLog ?? sv.storyLog).map(e => ({ ...e }));
  sv.xp        = record.xp ?? 0;
  sv.level     = record.level ?? survivorXpToLevel(sv.xp);
  sv.morale    = record.morale ?? 100;
  sv.hunger    = record.hunger ?? 0;
  // maxHp: prefer the persisted value; otherwise recompute the resilient boost
  // against the record's actual traits so a wounded vet isn't silently buffed.
  sv.maxHp     = record.maxHp ?? (hasTrait(sv, "resilient")
    ? Math.round(80 * SURVIVOR_TRAITS.resilient.value)
    : 80);
  sv.hp        = clamp(record.hp ?? sv.maxHp, 1, sv.maxHp);
  sv.homeBaseId = record.homeBaseId ?? null;
  sv.status    = "found"; // action-layer lifecycle expects this on a placed survivor
  return sv;
}

/**
 * Pull the durable progression patch out of a live survivor at mission end.
 * `fate` (from resolveMissionFate) decides hp/morale adjustments and status.
 */
export function extractRosterFields(liveSurvivor, fate) {
  const baseMaxHp = liveSurvivor.maxHp ?? 80;
  let hp = liveSurvivor.hp ?? baseMaxHp;
  let morale = liveSurvivor.morale ?? 100;

  if (fate?.hpClampFrac != null) hp = Math.round(baseMaxHp * fate.hpClampFrac);
  if (fate?.moralePenalty) morale = clamp(morale - fate.moralePenalty, 0, 100);

  return {
    name: liveSurvivor.name,
    role: liveSurvivor.role,
    traits: [...(liveSurvivor.traits ?? [])],
    backstory: liveSurvivor.backstory ?? "",
    storyLog: (liveSurvivor.storyLog ?? []).map(e => ({ ...e })),
    xp: liveSurvivor.xp ?? 0,
    level: liveSurvivor.level ?? survivorXpToLevel(liveSurvivor.xp ?? 0),
    maxHp: baseMaxHp,
    hp: fate?.rosterStatus === ROSTER_STATUS.DEAD ? 0 : clamp(hp, 0, baseMaxHp),
    morale,
    hunger: liveSurvivor.hunger ?? 0,
    rosterStatus: fate?.rosterStatus ?? ROSTER_STATUS.AT_BASE,
    // ── Phase 2: preserve specialization across missions ─────────────────────
    specialization: liveSurvivor.specialization ?? null,
  };
}

// ─── Fate ────────────────────────────────────────────────────────────────────

/**
 * Decide a survivor's roster fate after a mission ends.
 * Returns a fate object consumed by extractRosterFields.
 */
export function resolveMissionFate(liveSurvivor, missionWon) {
  const downed =
    (liveSurvivor.hp ?? 0) <= 0 ||
    liveSurvivor.status === "dead" ||
    liveSurvivor.dead === true;

  if (downed) return { rosterStatus: ROSTER_STATUS.DEAD };
  if (missionWon) return { rosterStatus: ROSTER_STATUS.AT_BASE };
  if (PERMADEATH_ON_FAILED_RETREAT) return { rosterStatus: ROSTER_STATUS.DEAD };
  // Survived a failed mission → retreat home wounded.
  return {
    rosterStatus: ROSTER_STATUS.AT_BASE,
    hpClampFrac: RETREAT_HP_FRACTION,
    moralePenalty: RETREAT_MORALE_PENALTY,
  };
}

// ─── Roster operations ───────────────────────────────────────────────────────

export function getRoster(worldState) {
  return worldState?.roster ?? [];
}

export function livingRoster(worldState) {
  return getRoster(worldState).filter(r => r.rosterStatus !== ROSTER_STATUS.DEAD);
}

/** Survivors available to send on a mission (alive, at base). Optional base filter. */
export function getDeployableRoster(worldState, homeBaseId = null) {
  return getRoster(worldState).filter(r =>
    r.rosterStatus === ROSTER_STATUS.AT_BASE &&
    (homeBaseId == null || r.homeBaseId === homeBaseId)
  );
}

export function addToRoster(worldState, record) {
  if (!worldState.roster) worldState.roster = [];
  if (!worldState.roster.some(r => r.id === record.id)) {
    worldState.roster.push(record);
  }
  return record;
}

/** Mark a set of roster ids as deployed (call when a deploy party is sent). */
export function markPartyDeployed(worldState, ids) {
  const set = new Set(ids);
  for (const r of getRoster(worldState)) {
    if (set.has(r.id)) r.rosterStatus = ROSTER_STATUS.DEPLOYED;
  }
}

/**
 * Hydrate a deploy party: turn selected roster records into live survivors
 * placed in a small cluster around (spawnX, spawnY). Pass the result to
 * GameView as the `deploySurvivors` prop.
 */
export function hydrateDeployParty(records, spawnX, spawnY, spread = 40) {
  return records.map((rec, i) => {
    const angle = (i / Math.max(1, records.length)) * Math.PI * 2;
    const x = spawnX + Math.cos(angle) * spread;
    const y = spawnY + Math.sin(angle) * spread;
    return hydrateSurvivor(rec, x, y);
  });
}

/**
 * Merge the final live survivors of a finished mission back into the roster.
 * Handles three cases per survivor:
 *   - known roster member  → update durable fields + apply fate
 *   - newly discovered      → recruit into the roster (re-id to a stable id)
 *   - died in the field     → permanent death
 *
 * Mutates worldState.roster and returns a summary for the return/away card:
 *   { updated: string[], died: string[], recruited: string[] }
 */
export function mergeSurvivorsToRoster(worldState, liveSurvivors = [], { missionWon = false, homeBaseId = null } = {}) {
  if (!worldState.roster) worldState.roster = [];
  const summary = { updated: [], died: [], recruited: [] };

  for (const live of liveSurvivors) {
    const fate = resolveMissionFate(live, missionWon);
    const patch = extractRosterFields(live, fate);

    // Match by stable id first, then by the remembered in-mission id.
    let record =
      worldState.roster.find(r => r.id === live.id) ||
      worldState.roster.find(r => r._liveId === live.id);

    if (!record) {
      // Newly discovered this mission — recruit with a stable campaign id.
      record = createRosterRecordFromSurvivor(worldState, live, homeBaseId);
      worldState.roster.push(record);
      summary.recruited.push(record.name);
    }

    Object.assign(record, patch);
    record.homeBaseId = record.homeBaseId ?? homeBaseId;
    delete record._liveId;

    if (record.rosterStatus === ROSTER_STATUS.DEAD) summary.died.push(record.name);
    else summary.updated.push(record.name);
  }

  return summary;
}