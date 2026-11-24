// src/Pages/Arcade/games/creature-farm/stampede/stampedeSim.js
//
// Critter Stampede (a Creature Farm run) — the simulation. The HOST runs this; the guest just draws
// snapshots of it. Each player's own leader position comes from their device
// (instant controls); everything else is decided here.
//
//   • Wild critters wander the endless field, more of them (and in little
//     packs) as the run goes on. Run ONE circle around a critter to tame it —
//     every wild critter inside your circle comes too. (The lasso is worked out
//     on each player's own device — see lassoStep.)
//   • Tamed critters join your HERD: they swarm around you and pile onto
//     whatever goop you (or they) are fighting. When one gets hurt (below 30%)
//     it runs back to your side to rest, heals up, then jumps back in.
//   • Berries (dropped by goop, or growing in the grass) heal you + your herd.
//   • Survive 5 minutes to win the run.
//   • Goop baddies chase leaders and get tougher over time. Your leader zaps
//     the nearest one automatically.
//   • Leaders can be knocked down; a partner standing close revives them.
//     Everyone down = run over.
//
// Uses the farm's species.js, so Bash's designs show up here too.

import { SPECIES } from "../species";

export const SPECIES_IDS = Object.keys(SPECIES);
export const STARTERS = SPECIES_IDS.filter(k => SPECIES[k].starter);

// ── Tuning ────────────────────────────────────────────────────────────────────
export const T = {
  LEADER_SPEED: 190,
  LEADER_HP: 100,
  LEADER_INV: 0.7,            // seconds of invincibility after a hit
  ZAP_EVERY: 0.55, ZAP_RANGE: 230, ZAP_DMG: 10,
  HERD_MAX: 30,
  HERD_SPEED: 270, HERD_ATTACK_SPEED: 310,
  HERD_HP: 50, HERD_DMG: 5, HERD_ATK_EVERY: 0.5,
  HERD_REGEN: 5, HERD_REGEN_DELAY: 2,   // fighting herd heals 5 hp/s after 2s without being hit
  HERD_REST_BELOW: 0.3,                 // hurt below 30% → run back to the leader and rest
  HERD_REST_REGEN: 9,                   // resting herd heals 9 hp/s
  HERD_JOIN_SAFE: 2,                    // freshly tamed critters can't be hurt for 2s
  HERD_ENGAGE: 150, HERD_LEASH: 320,
  WILD_START: 12, WILD_END: 24, WILD_SPAWN_EVERY: 1.0,   // wild critters on the field ramp up over the run
  BADDIE_MAX: 70,
  RUN_LEN: 300,               // survive 5 minutes to win
  BERRY_HEAL: 30, BERRY_HERD: 0.5, BERRY_EVERY: 18, BERRY_LIFE: 30,
  GOOP_DMG: 8, GOOP_HIT_HERD: 4, GOOP_HIT_EVERY: 0.7,
  REVIVE_TIME: 3, REVIVE_RANGE: 55, REVIVE_HP: 50,
  LASSO_MIN: 25, LASSO_MAX: 150, LASSO_PICK: 130,
  TAME_RANGE: 220,
  DESPAWN: 1600,
  LEASH: 1000,                // players can't get further apart than this
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function mulberry(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Element flavour for herd attacks (damage multiplier, attack-speed multiplier).
const ELEMENT = {
  fire: [1.4, 1], earth: [1.8, 0.7], water: [1, 1.2], plant: [1, 1],
  air: [0.8, 1.5], light: [1.1, 1.1], storm: [1.3, 1.2],
};

// ── Run ───────────────────────────────────────────────────────────────────────
export function createRun(seed = Date.now()) {
  return {
    t: 0, state: "play", nextId: 1, rng: mulberry(seed),
    players: [null, null],           // slot 0 = host, slot 1 = guest
    critters: [], baddies: [], items: [], fx: [], fxOut: [],
    wildCd: 0, badCd: 2, berryCd: 12, nextGroup: 1,
  };
}

export function addPlayer(run, slot, species, x = slot * 80, y = 0, hue = null) {
  if (run.players[slot]) {
    run.players[slot].species = species; run.players[slot].active = true;
    if (hue != null) run.players[slot].hue = hue;
    return;
  }
  run.players[slot] = {
    slot, species, x, y, hp: T.LEADER_HP, down: false, rev: 0, inv: 0,
    zapCd: 0.5, focus: null, kills: 0, tamed: 0, active: true, seenAt: run.t,
    hue: hue ?? SPECIES[species]?.hue ?? 0,
  };
}

const activePlayers = (run) => run.players.filter(p => p && p.active);
const upPlayers = (run) => run.players.filter(p => p && p.active && !p.down);

function fx(run, f) { run.fx.push({ ...f, age: 0 }); run.fxOut.push(f); }

// Wild critters arrive alone early on, then in little packs of 2–4 you can
// lasso all at once.
function rollWildPack(run, near) {
  const r = run.rng;
  const species = SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)];
  const packChance = Math.min(0.7, Math.max(0, (run.t - 25) / 150));
  const n = r() < packChance ? 2 + Math.floor(r() * (run.t > 120 ? 3 : 2)) : 1;
  const a = r() * TAU, d = 380 + r() * 260;
  const cx = near.x + Math.cos(a) * d, cy = near.y + Math.sin(a) * d;
  const g = run.nextGroup++, wa = r() * TAU;
  const pack = [];
  for (let i = 0; i < n; i++) {
    const sp = r() < 0.75 ? species : SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)];
    const oa = i / n * TAU, od = n > 1 ? 22 + r() * 10 : 0;
    pack.push({
      id: run.nextId++, species: sp, hue: (SPECIES[sp].hue + Math.round((r() - 0.5) * 50) + 360) % 360,
      size: Math.round((0.85 + r() * 0.35) * 100) / 100,
      x: cx + Math.cos(oa) * od, y: cy + Math.sin(oa) * od, vx: 0, vy: 0,
      owner: -1, hp: T.HERD_HP, maxHp: T.HERD_HP, atkCd: 0, wa, g, k: 0, rest: false,
    });
  }
  return pack;
}

function rollBaddie(run, near) {
  const r = run.rng;
  const big = run.t > 90 && r() < Math.min(0.25, 0.1 + run.t / 1500);
  const a = r() * TAU, d = 650 + r() * 160;
  const hp = big ? 55 + run.t * 0.15 : 14 + run.t * 0.06;
  return {
    id: run.nextId++, kind: big ? "big" : "goop",
    x: near.x + Math.cos(a) * d, y: near.y + Math.sin(a) * d,
    hp, maxHp: hp, speed: big ? 60 : Math.min(125, 88 + run.t * 0.1),
    hitCd: 0, lastBy: -1,
  };
}

// Herd members are critters with owner = slot. Their place in the herd (k) is
// renumbered each step so the swarm stays tidy.
function herdOf(run, slot) { return run.critters.filter(c => c.owner === slot); }

export function tryTame(run, slot, cid) {
  const p = run.players[slot];
  const c = run.critters.find(x => x.id === cid);
  if (!p || p.down || !c || c.owner !== -1) return false;
  if (dist(p, c) > T.TAME_RANGE) return false;
  if (herdOf(run, slot).length >= T.HERD_MAX) return false;
  c.owner = slot; c.hp = c.maxHp; c.rest = false; c.safe = T.HERD_JOIN_SAFE; p.tamed += 1;
  fx(run, { k: "tame", x: c.x, y: c.y, s: slot });
  return true;
}

// Called when the player's device reports where its leader is.
export function setLeaderPos(run, slot, x, y) {
  const p = run.players[slot];
  if (!p) return;
  p.x = x; p.y = y; p.seenAt = run.t; p.active = true;
}

// ── Step (host only) ──────────────────────────────────────────────────────────
// hurt(slot, kx, ky) is called when a leader takes a hit, so its device can do the knockback.
export function stepRun(run, dt, hurt = () => {}) {
  if (run.state !== "play") return;
  run.t += dt;
  if (run.t >= T.RUN_LEN) { run.t = T.RUN_LEN; run.state = "won"; return; }
  const r = run.rng;

  for (const p of run.players) if (p && run.t - p.seenAt > 4) p.active = false;   // partner went quiet
  const ups = upPlayers(run), act = activePlayers(run);
  if (!act.length) return;

  // ── Wild critters: keep a few around each player, wander, despawn far away
  run.wildCd -= dt;
  const wild = run.critters.filter(c => c.owner === -1);
  const wildMax = Math.round(T.WILD_START + (T.WILD_END - T.WILD_START) * Math.min(1, run.t / 180));
  if (run.wildCd <= 0 && wild.length < wildMax) {
    run.critters.push(...rollWildPack(run, act[Math.floor(r() * act.length)]));
    run.wildCd = T.WILD_SPAWN_EVERY;
  }
  // packs wander together (shared heading + a gentle pull to the pack's middle)
  const packs = new Map();
  for (const c of wild) {
    const pk = packs.get(c.g) || { x: 0, y: 0, n: 0, wa: c.wa };
    pk.x += c.x; pk.y += c.y; pk.n++; packs.set(c.g, pk);
  }
  for (const pk of packs.values()) { pk.x /= pk.n; pk.y /= pk.n; pk.wa += (r() - 0.5) * 2 * dt; }
  for (const c of wild) {
    const pk = packs.get(c.g);
    c.wa = pk.wa;
    c.vx = Math.cos(c.wa) * 24; c.vy = Math.sin(c.wa) * 24;
    if (pk.n > 1) { const dx = pk.x - c.x, dy = pk.y - c.y, d = Math.hypot(dx, dy); if (d > 30) { c.vx += dx / d * 20; c.vy += dy / d * 20; } }
    c.x += c.vx * dt; c.y += c.vy * dt;
  }
  for (let i = 0; i < wild.length; i++) for (let j = i + 1; j < wild.length; j++) {
    const a = wild[i], b = wild[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 24) { const push = (24 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Berries: one grows nearby every so often; they spoil after a while
  run.berryCd -= dt;
  if (run.berryCd <= 0 && ups.length) {
    const p = ups[Math.floor(r() * ups.length)], a = r() * TAU, d = 160 + r() * 200;
    run.items.push({ id: run.nextId++, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, born: run.t });
    run.berryCd = T.BERRY_EVERY;
  }
  run.items = run.items.filter(it => {
    if (run.t - it.born > T.BERRY_LIFE) return false;
    const p = ups.find(q => dist(q, it) < 30);
    if (!p) return true;
    p.hp = Math.min(T.LEADER_HP, p.hp + T.BERRY_HEAL);
    for (const c of herdOf(run, p.slot)) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * T.BERRY_HERD);
    fx(run, { k: "heal", x: p.x, y: p.y, s: p.slot });
    return false;
  });
  run.critters = run.critters.filter(c => c.owner !== -1 || act.some(p => dist(p, c) < T.DESPAWN));

  // ── Baddies: spawn faster as time goes on
  run.badCd -= dt;
  const rate = run.t < 15 ? 0.45 : Math.min(4.2, 0.5 + run.t / 70);   // per second (≈3/s at 3 min, 4+ near the end)
  if (run.badCd <= 0 && run.baddies.length < T.BADDIE_MAX && ups.length) {
    run.baddies.push(rollBaddie(run, ups[Math.floor(r() * ups.length)]));
    run.badCd = 1 / rate;
  }

  // ── Leaders: auto-zap the nearest baddie
  for (const p of ups) {
    p.inv = Math.max(0, p.inv - dt);
    p.zapCd -= dt;
    if (p.zapCd <= 0) {
      let best = null, bd = T.ZAP_RANGE;
      for (const b of run.baddies) { const d = dist(p, b); if (d < bd) { bd = d; best = b; } }
      if (best) {
        best.hp -= T.ZAP_DMG; best.lastBy = p.slot; best.hitT = 0.15;
        p.focus = best.id;
        fx(run, { k: "zap", x: p.x, y: p.y, x2: best.x, y2: best.y, s: p.slot });
        p.zapCd = T.ZAP_EVERY;
      } else p.zapCd = 0.1;
    }
  }

  // ── Herds: swarm around the leader, attack nearby goop
  for (const p of run.players) {
    if (!p) continue;
    const herd = herdOf(run, p.slot);
    const focus = run.baddies.find(b => b.id === p.focus);
    // nearest goop to the leader — resting critters hide on the other side of the leader
    let threat = null, td = 400;
    for (const b of run.baddies) { const d = dist(p, b); if (d < td) { td = d; threat = b; } }
    let restK = 0;
    herd.forEach((c, k) => {
      c.k = k;
      c.atkCd = Math.max(0, c.atkCd - dt);
      c.safe = Math.max(0, (c.safe || 0) - dt);
      // hurt → rest; fully healed → fight again
      if (!c.rest && c.hp < c.maxHp * T.HERD_REST_BELOW) c.rest = true;
      else if (c.rest && c.hp >= c.maxHp) c.rest = false;
      if (c.rest) c.hp = Math.min(c.maxHp, c.hp + T.HERD_REST_REGEN * dt);
      else if (run.t - (c.hitAt || 0) > T.HERD_REGEN_DELAY) c.hp = Math.min(c.maxHp, c.hp + T.HERD_REGEN * dt);
      let target = null;
      if (c.rest) {
        // tuck in close behind the leader, away from the goop
        const away = threat ? Math.atan2(p.y - threat.y, p.x - threat.x) : Math.PI / 2;
        const spread = ((restK % 5) - 2) * 0.45, row = Math.floor(restK / 5);
        restK++;
        const gx = p.x + Math.cos(away + spread) * (30 + row * 18), gy = p.y + Math.sin(away + spread) * (30 + row * 18);
        const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
        const step = Math.min(d, T.HERD_ATTACK_SPEED * dt);
        if (d > 1) { c.vx = dx / d * T.HERD_SPEED; c.vy = dy / d * T.HERD_SPEED; c.x += dx / d * step; c.y += dy / d * step; } else { c.vx = 0; c.vy = 0; }
        c.bump = 0;
        return;
      }
      if (!p.down && p.active) {
        if (focus && dist(c, focus) < T.HERD_LEASH && dist(p, focus) < T.HERD_LEASH) target = focus;
        else {
          let bd = T.HERD_ENGAGE;
          for (const b of run.baddies) { const d = dist(c, b); if (d < bd && dist(p, b) < T.HERD_LEASH) { bd = d; target = b; } }
        }
      }
      let gx, gy, speed;
      if (target) { gx = target.x; gy = target.y; speed = T.HERD_ATTACK_SPEED; }
      else {
        // sunflower packing around the leader — a tidy blob that grows with the herd
        const a = k * 2.39996 + run.t * 0.25, rad = 34 + 13 * Math.sqrt(k);
        gx = p.x + Math.cos(a) * rad; gy = p.y + Math.sin(a) * rad; speed = T.HERD_SPEED;
      }
      const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
      const step = Math.min(d, speed * dt * (d > 300 ? 1.6 : 1));
      if (d > 1) { c.vx = dx / d * speed; c.vy = dy / d * speed; c.x += dx / d * step; c.y += dy / d * step; }
      else { c.vx = 0; c.vy = 0; }
      if (target && d < 24 && c.atkCd <= 0) {
        const [dm, sp] = ELEMENT[SPECIES[c.species]?.element] || [1, 1];
        target.hp -= T.HERD_DMG * dm * c.size; target.lastBy = p.slot; target.hitT = 0.12;
        c.atkCd = T.HERD_ATK_EVERY / sp;
        c.bump = 0.15;
      }
      c.bump = Math.max(0, (c.bump || 0) - dt);
    });
  }
  // keep herd members from stacking on one spot
  const herdAll = run.critters.filter(c => c.owner !== -1);
  for (let i = 0; i < herdAll.length; i++) for (let j = i + 1; j < herdAll.length; j++) {
    const a = herdAll[i], b = herdAll[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 20) { const push = (20 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Baddies chase the nearest standing leader, hurt leaders + herd
  for (const b of run.baddies) {
    b.hitCd = Math.max(0, b.hitCd - dt);
    b.hitT = Math.max(0, (b.hitT || 0) - dt);
    let tgt = null, bd = Infinity;
    for (const p of ups) { const d = dist(p, b); if (d < bd) { bd = d; tgt = p; } }
    if (tgt) {
      const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.x += dx / d * b.speed * dt; b.y += dy / d * b.speed * dt;
      const reach = b.kind === "big" ? 34 : 24;
      if (d < reach && tgt.inv <= 0 && b.hitCd <= 0) {
        tgt.hp -= T.GOOP_DMG * (b.kind === "big" ? 2 : 1);
        tgt.inv = T.LEADER_INV; b.hitCd = T.GOOP_HIT_EVERY;
        hurt(tgt.slot, dx / d * 260, dy / d * 260);
        if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; tgt.rev = 0; fx(run, { k: "down", x: tgt.x, y: tgt.y, s: tgt.slot }); }
      }
    }
    if (b.hitCd <= 0) {
      for (const c of herdAll) {
        if (c.safe > 0) continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) < (b.kind === "big" ? 32 : 22)) {
          c.hp -= T.GOOP_HIT_HERD * (b.kind === "big" ? 2 : 1) * (c.rest ? 0.5 : 1); b.hitCd = T.GOOP_HIT_EVERY; c.hitAt = run.t;
          break;
        }
      }
    }
  }
  // goop push each other apart a bit
  for (let i = 0; i < run.baddies.length; i++) for (let j = i + 1; j < run.baddies.length; j++) {
    const a = run.baddies[i], b = run.baddies[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.kind === "big" || b.kind === "big") ? 40 : 26;
    if (d > 0 && d < min) { const push = (min - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Deaths
  run.baddies = run.baddies.filter(b => {
    if (b.hp > 0) return act.some(p => dist(p, b) < T.DESPAWN);
    const p = run.players[b.lastBy];
    if (p) p.kills += 1;
    fx(run, { k: "pop", x: b.x, y: b.y, big: b.kind === "big" ? 1 : 0 });
    if (r() < (b.kind === "big" ? 0.35 : 0.03)) run.items.push({ id: run.nextId++, x: b.x, y: b.y, born: run.t });
    return false;
  });
  run.critters = run.critters.filter(c => {
    if (c.owner === -1 || c.hp > 0) return true;
    fx(run, { k: "flee", x: c.x, y: c.y });             // fainted and ran off
    return false;
  });

  // ── Revives + game over
  for (const p of act) {
    if (!p.down) continue;
    const helper = ups.find(o => o !== p && dist(o, p) < T.REVIVE_RANGE);
    p.rev = helper ? p.rev + dt : Math.max(0, p.rev - dt * 0.5);
    if (p.rev >= T.REVIVE_TIME) { p.down = false; p.hp = T.REVIVE_HP; p.inv = 1.5; p.rev = 0; fx(run, { k: "revive", x: p.x, y: p.y, s: p.slot }); }
  }
  if (!upPlayers(run).length) run.state = "over";

  for (const f of run.fx) f.age += dt;
  run.fx = run.fx.filter(f => f.age < 0.6);
}

// ── Snapshots (host → guest, ~10/s) ──────────────────────────────────────────
const R = Math.round;
export function makeSnapshot(run) {
  const snap = {
    t: Math.round(run.t * 10) / 10, st: run.state,
    p: run.players.map(p => p && [R(p.x), R(p.y), R(p.hp), p.down ? 1 : 0, Math.round(p.rev * 10) / 10, p.kills, p.tamed, SPECIES_IDS.indexOf(p.species), p.active ? 1 : 0, p.hue]),
    c: run.critters.map(c => [c.id, SPECIES_IDS.indexOf(c.species), R(c.x), R(c.y), c.hue, R(c.size * 100), c.owner, R(c.hp / c.maxHp * 100), c.bump > 0 ? 1 : 0, c.rest ? 1 : 0, run.t - (c.hitAt ?? -9) < 0.2 ? 1 : 0]),
    k: run.items.map(it => [it.id, R(it.x), R(it.y)]),
    b: run.baddies.map(b => [b.id, b.kind === "big" ? 1 : 0, R(b.x), R(b.y), R(b.hp / b.maxHp * 100), b.hitT > 0 ? 1 : 0]),
    fx: run.fxOut,
  };
  run.fxOut = [];
  return snap;
}

export function readSnapshotPlayers(snap) {
  return (snap.p || []).map((a, slot) => a && {
    slot, x: a[0], y: a[1], hp: a[2], down: !!a[3], rev: a[4], kills: a[5], tamed: a[6],
    species: SPECIES_IDS[a[7]], active: !!a[8], hue: a[9],
  });
}

// ── Lasso (runs on each player's own device) ─────────────────────────────────
// Run ONE circle around a wild critter to tame it. Every other wild critter
// that stayed inside your circle the whole way round comes along too.
export const loopsFor = () => 1;

// state: { cid, acc, last, rmin, frac } or null. Returns { state, tame: [cids] | null }.
export function lassoStep(state, me, wildCritters, moving) {
  if (state) {
    const c = wildCritters.find(w => w.id === state.cid);
    const d = c ? Math.hypot(me.x - c.x, me.y - c.y) : Infinity;
    if (!c || d > T.LASSO_MAX) return { state: null, tame: null };
    if (d < T.LASSO_MIN) return { state, tame: null };          // too close — no progress, no reset
    const ang = Math.atan2(me.y - c.y, me.x - c.x);
    let delta = ang - state.last;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    const acc = state.acc + delta;
    const rmin = Math.min(state.rmin ?? d, d);
    const need = TAU * loopsFor(c.size);
    if (Math.abs(acc) >= need) {
      // everyone within the tightest part of the loop was inside it
      const inside = wildCritters.filter(w => w.id !== c.id && Math.hypot(w.x - c.x, w.y - c.y) < rmin - 6).map(w => w.id);
      return { state: null, tame: [c.id, ...inside] };
    }
    return { state: { cid: c.id, acc, last: ang, rmin, frac: Math.abs(acc) / need }, tame: null };
  }
  if (!moving) return { state: null, tame: null };
  let best = null, bd = T.LASSO_PICK;
  for (const c of wildCritters) { const d = Math.hypot(me.x - c.x, me.y - c.y); if (d < bd && d > 10) { bd = d; best = c; } }
  if (!best) return { state: null, tame: null };
  return { state: { cid: best.id, acc: 0, last: Math.atan2(me.y - best.y, me.x - best.x), rmin: bd, frac: 0 }, tame: null };
}