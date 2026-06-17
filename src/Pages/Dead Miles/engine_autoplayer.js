// engine_autoplayer.js — bare-bones rewrite (pure-ish, no React).
//
// Design goals after the previous version grew to ~1865 lines and got tangled:
//   • ONE navigation function (navTo) is the *only* code that knows about doors,
//     buildings, and obstacles. Everything else just calls navTo(x, y).
//   • ONE simple stuck-nudge. No rotation accumulation, no corner memory, no
//     threading-commitment hysteresis, no exit cooldowns.
//   • A FLAT priority tree. Each frame picks exactly one behavior and returns.
//
// Movement contract (unchanged): return { dx, dy, action, autoBehavior }.
//   dx/dy is a direction vector; movePlayer/driveVehicle normalize it and
//   handle wall-collision/sliding, so the AI never needs its own collision math.
//   A zero vector means "don't move this frame".
//
// Autoplay is single-player and always drives role "p1" (see vehicle lookup).

import {
  AUTO_DRINK_AT, AUTO_EAT_AT, AUTO_FLEE_RANGE, AUTO_FLEET_SEEK_RANGE,
  AUTO_LOOT_DANGER_RANGE, AUTO_LOOT_DANGER_THRESHOLD, AUTO_LOOT_RANGE,
  AUTO_MELEE_RANGE, AUTO_SLEEP_AT, AUTO_SLEEP_SEEK_AT, AUTO_SPAWN_GRACE,
  AUTO_THREAT_RANGE, AUTO_VEHICLE_RANGE, DOOR_INTERACT_RANGE, PLAYER_RADIUS,
  REPAIR_RANGE, VEHICLE_RADIUS, WORLD_W,
} from "./engine_constants";
import { dist, getDoorCenter, isInsideBuilding } from "./engine_geometry";
import { getInventoryCount } from "./engine_player";

const EXIT_X = WORLD_W / 2;
const EXIT_Y = 80;
const SETTLEMENT_RADIUS = 700;
const ACTIVE_STATES = new Set(["chase", "alert", "attack", "bash_door"]);

const _log = {};

export function updateAutoPlayer(player, state, dt) {
  const r = decide(player, state, dt);

  // ── Single stuck-nudge ──────────────────────────────────────────────────
  // Sample position periodically. If we asked to move but barely moved, rotate
  // the desired direction a bit (alternating sides) so we slide around whatever
  // is blocking us. Reset the moment we move freely or perform a still action.
  const SAMPLE   = 0.4;
  const MIN_MOVE = player.inVehicle ? 26 : 11;
  const STEP     = (player.inVehicle ? 45 : 65) * (Math.PI / 180);
  const MAX      = 160 * (Math.PI / 180);

  // A movement frame is any frame with no discrete action (actions are all
  // performed standing still). Track whether we tried to move in this window.
  if (r.action == null) player._triedMove = true;

  player._stuckT = (player._stuckT || 0) + dt;
  if (player._stuckT >= SAMPLE) {
    const moved = dist(player.x, player.y, player._lastX ?? player.x, player._lastY ?? player.y);
    if (!player._triedMove) {
      player._nudge = 0; player._stuckHits = 0;            // was doing a still action
    } else if (moved < MIN_MOVE) {
      player._stuckHits = (player._stuckHits || 0) + 1;
      // Flip sweep direction every 3 blocked windows so a corner that blocks one
      // way is escaped by trying the other instead of grinding at the cap.
      if (player._stuckHits % 3 === 0) player._nudgeSign = -(player._nudgeSign || 1);
      else                              player._nudgeSign = player._nudgeSign || 1;
      player._nudge = Math.max(-MAX, Math.min(MAX, (player._nudge || 0) + player._nudgeSign * STEP));
    } else {
      player._nudge = 0; player._stuckHits = 0;            // moving fine
    }
    player._stuckT = 0;
    player._lastX = player.x;
    player._lastY = player.y;
    player._triedMove = false;
  }

  // Throttled debug log.
  const pid = player.id || "p1";
  _log[pid] = (_log[pid] || 0) + 1;
  if (_log[pid] % 60 === 1) {
    console.log(`[AutoPlayer:${pid}] step="${r.autoBehavior}" action=${r.action ?? "none"}`);
  }
  return r;
}

function decide(player, state, dt) {
  const { zombies = [], lootPiles = [], buildings = [], compassTarget = null, bossZombie = null } = state;
  const inVehicle = player.inVehicle;
  const stance = state.aiStance ?? "loot";
  const isHomebase = state._missionType === "homebase";

  // Resolve our position (vehicle position when driving).
  const allV = state.vehicles ?? (state.vehicle ? [state.vehicle] : []);
  const myVehicle = inVehicle
    ? (allV.find(v => v.driver === "p1" || v.passenger === "p1") ?? state.vehicle)
    : null;
  const px = (inVehicle && myVehicle) ? myVehicle.x : player.x;
  const py = (inVehicle && myVehicle) ? myVehicle.y : player.y;

  // ── tiny helpers ──────────────────────────────────────────────────────────
  const toward = (tx, ty) => {
    const dx = tx - px, dy = ty - py, len = Math.hypot(dx, dy);
    return len < 0.001 ? { dx: 0, dy: 0 } : { dx: dx / len, dy: dy / len };
  };
  const steer = (vec) => {
    const n = player._nudge || 0;
    if (!n) return vec;
    let { dx, dy } = vec;
    if (dx === 0 && dy === 0) { dx = 1; dy = 0; } // give the nudge something to rotate
    const c = Math.cos(n), s = Math.sin(n);
    return { dx: dx * c - dy * s, dy: dx * s + dy * c };
  };
  const buildingAt        = (x, y) => buildings.find(b => isInsideBuilding({ x, y }, b)) ?? null;
  const buildingContaining = (x, y) => buildings.find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) ?? null;
  const openDoors  = (b) => (b.doors ?? []).filter(d => d.open || d.broken);
  const nearestDoorOf = (b, doors) => {
    let best = null, bd = Infinity;
    for (const d of doors) { const c = getDoorCenter(b, d); const dd = dist(px, py, c.x, c.y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  };
  // A point `off` px OUTSIDE the wall, centered on the door gap.
  const exteriorApproach = (b, door, off = 34) => {
    const c = getDoorCenter(b, door);
    return {
      north: { x: c.x, y: c.y - off }, south: { x: c.x, y: c.y + off },
      west:  { x: c.x - off, y: c.y }, east:  { x: c.x + off, y: c.y },
    }[door.side] ?? { x: c.x, y: c.y - off };
  };
  // A point `off` px INSIDE the wall, centered on the door gap.
  const interiorApproach = (b, door, off = 30) => {
    const c = getDoorCenter(b, door);
    return {
      north: { x: c.x, y: c.y + off }, south: { x: c.x, y: c.y - off },
      west:  { x: c.x + off, y: c.y }, east:  { x: c.x - off, y: c.y },
    }[door.side] ?? { x: c.x, y: c.y + off };
  };

  // Does the segment (ax,ay)->(bx,by) pass through building b's padded footprint?
  const segCrosses = (ax, ay, bx, by, b, pad) => {
    for (let t = 0.08; t < 1; t += 0.08) {
      const sx = ax + (bx - ax) * t, sy = ay + (by - ay) * t;
      if (sx > b.x - pad && sx < b.x + b.w + pad && sy > b.y - pad && sy < b.y + b.h + pad) return true;
    }
    return false;
  };

  // ── Smart door handling (used by every on-foot route that crosses a door) ────
  // Choose the best door of `b` for a trip toward (fx,fy): cheapest to reach,
  // biased toward the goal, and (when we're outside) avoiding doors whose
  // approach is blocked by the building itself (i.e. doors facing away from us).
  function pickDoor(b, doors, fx, fy) {
    const inside = isInsideBuilding({ x: px, y: py }, b);
    let best = null, bestScore = Infinity;
    for (const d of doors) {
      const ext = exteriorApproach(b, d, 32);
      let score = dist(px, py, ext.x, ext.y) + dist(ext.x, ext.y, fx, fy) * 0.5;
      if (!inside && segCrosses(px, py, ext.x, ext.y, b, 2)) score += 1e6; // door faces away
      if (score < bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  // ── THE one navigation function ─────────────────────────────────────────────
  // Point us at (tx,ty). On foot it also handles leaving / entering buildings
  // through doors. In a vehicle it NEVER touches door logic (cars can't use
  // doors) — it only steers around blocking buildings. movePlayer/driveVehicle
  // do the actual wall-slide collision.
  function navTo(tx, ty) {
    // Vehicles skip all door handling. On foot, resolve our/target buildings.
    const myB  = inVehicle ? null : buildingAt(px, py);
    const tgtB = inVehicle ? null : buildingContaining(tx, ty);

    // EXIT: inside a building, heading elsewhere → aim straight at the best
    // exit door's exterior approach point. The wall-collision system already
    // has gaps at open doors, and its wall-slide naturally channels the player
    // through the gap — no lateral pre-alignment needed. (The old threadDoor
    // logic sent players DEEPER into the building to "line up first," which
    // was the root cause of getting stuck at the door after collecting loot.)
    if (myB && myB !== tgtB) {
      const od = openDoors(myB);
      if (od.length) {
        const door = pickDoor(myB, od, tx, ty);
        if (door) {
          const ext = exteriorApproach(myB, door, 32);
          return steer(toward(ext.x, ext.y));
        }
      }
      // No open doors → fall through; player is trapped until caller opens one.
    }

    // ENTER: target inside a building we're not in → door threading.
    // If laterally aligned with the best door's gap, walk straight through now.
    // Otherwise redirect toward the door's EXTERIOR approach point and FALL
    // THROUGH to the obstacle routing below — this is the key difference from
    // the old code, which returned immediately and ground on any intervening
    // building between the player and the door.
    let effTx = tx, effTy = ty;
    if (tgtB && tgtB !== myB) {
      const od = openDoors(tgtB);
      if (od.length) {
        const door = pickDoor(tgtB, od, tx, ty);
        if (door) {
          const dc      = getDoorCenter(tgtB, door);
          const horiz   = door.side === "north" || door.side === "south";
          const lateral = horiz ? Math.abs(px - dc.x) : Math.abs(py - dc.y);
          const halfGap = Math.max(4, (door.width ?? 28) / 2 - PLAYER_RADIUS - 2);
          const RELEASE = halfGap + PLAYER_RADIUS + 6;
          const committed = player._threadBldg === tgtB.id;

          if (lateral <= halfGap || (committed && lateral <= RELEASE)) {
            // Aligned with the gap → walk straight through into the building.
            player._threadBldg = tgtB.id;
            const intr = interiorApproach(tgtB, door, 30);
            return steer(toward(intr.x, intr.y));
          }
          // Not aligned yet → route to the exterior approach point. Don't return —
          // let the obstacle routing below handle any building in the way.
          player._threadBldg = null;
          const ext = exteriorApproach(tgtB, door, 32);
          effTx = ext.x;
          effTy = ext.y;
        }
      }
      // No open door: fall through with original tx,ty. Caller opens doors.
    }

    // A building blocks the straight line to (effTx,effTy) → round its corner.
    // Only skip tgtB when our effective target is still INSIDE it. When the
    // entry branch redirected us to a far-side door's exterior approach, tgtB
    // itself is on the path and must be routed around.
    const skipTgtB = tgtB && isInsideBuilding({ x: effTx, y: effTy }, tgtB);
    const pad = (inVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 8;
    let blocker = null, bd = Infinity;
    for (const b of buildings) {
      if (b === myB) continue;
      if (b === tgtB && skipTgtB) continue;
      if (!segCrosses(px, py, effTx, effTy, b, pad)) continue;
      const d = dist(px, py, b.x + b.w / 2, b.y + b.h / 2);
      if (d < bd) { bd = d; blocker = b; }
    }
    if (blocker) {
      const m = pad + 14;
      const corners = [
        { x: blocker.x - m,             y: blocker.y - m },
        { x: blocker.x + blocker.w + m, y: blocker.y - m },
        { x: blocker.x - m,             y: blocker.y + blocker.h + m },
        { x: blocker.x + blocker.w + m, y: blocker.y + blocker.h + m },
      ];
      const reachable = corners.filter(c => !segCrosses(px, py, c.x, c.y, blocker, pad * 0.5));
      const pool = reachable.length ? reachable : corners;
      let best = pool[0], bc = Infinity;
      for (const c of pool) {
        const cost = reachable.length ? dist(c.x, c.y, effTx, effTy) : dist(px, py, c.x, c.y);
        if (cost < bc) { bc = cost; best = c; }
      }
      // Corner commitment: stick with the chosen corner until close to it.
      const CORNER_RELEASE = m + 18;
      const mem = player._navCorner;
      if (mem && mem.bId === blocker.id && dist(px, py, mem.x, mem.y) > CORNER_RELEASE &&
          !segCrosses(px, py, mem.x, mem.y, blocker, pad * 0.5)) {
        best = { x: mem.x, y: mem.y };
      }
      player._navCorner = { x: best.x, y: best.y, bId: blocker.id };
      return steer(toward(best.x, best.y));
    }

    player._navCorner = null;
    return steer(toward(effTx, effTy));
  }

  // ── vehicle helpers ─────────────────────────────────────────────────────────
  // Scores by effective HP (hpRatio × maxHp) so a healthier or higher-class
  // vehicle wins over a marginal closer one. Distance is a light tie-breaker.
  function bestVehicle() {
    let best = null, bestScore = -Infinity;
    for (const v of allV) {
      if (v.hp <= 0) continue;
      if (v.occupied && v.driver !== "p1" && v.passenger !== "p1") continue;
      const d = dist(px, py, v.x, v.y);
      if (d >= AUTO_FLEET_SEEK_RANGE) continue;
      const hpRatio = v.hp / (v.maxHp ?? v.hp ?? 1);
      const score = hpRatio * (v.maxHp ?? 100) - d * 0.1;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  // Returns true if any other accessible vehicle is clearly better (≥1.5× effectiveHP) than `than`.
  function hasBetterVehicle(than) {
    const refEffHp = (than.hp / (than.maxHp ?? than.hp ?? 1)) * (than.maxHp ?? 100);
    return allV.some(v => {
      if (v === than || v.hp <= 0) return false;
      if (v.occupied && v.driver !== "p1" && v.passenger !== "p1") return false;
      const d = dist(px, py, v.x, v.y);
      if (d >= AUTO_FLEET_SEEK_RANGE) return false;
      const vEffHp = (v.hp / (v.maxHp ?? v.hp ?? 1)) * (v.maxHp ?? 100);
      return vEffHp > refEffHp * 1.5;
    });
  }

  // ── threats (alive zombies, outside buildings, within range) ─────────────────
  const threats = zombies.filter(z =>
    !z.dead && dist(px, py, z.x, z.y) < AUTO_THREAT_RANGE && !buildings.some(b => isInsideBuilding(z, b))
  );
  const nearest = threats.length
    ? threats.reduce((a, b) => dist(px, py, a.x, a.y) < dist(px, py, b.x, b.y) ? a : b)
    : null;
  const centroidFlee = () => {
    const cx = threats.reduce((s, z) => s + z.x, 0) / threats.length;
    const cy = threats.reduce((s, z) => s + z.y, 0) / threats.length;
    const t = toward(cx, cy);
    return { dx: -t.dx, dy: -t.dy };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PRIORITY TREE
  // ════════════════════════════════════════════════════════════════════════════

  // 0. Already auto-sleeping → keep sleeping (GameView wakes us when rested/in danger).
  if (player.isSleeping && player._autoSleeping && !player.isDowned) {
    return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "sleeping" };
  }

  // 1. Spawn grace — brief safety window at level start: grab a car or flee.
  if (player._spawnGrace === undefined) player._spawnGrace = AUTO_SPAWN_GRACE;
  if (player._spawnGrace > 0) player._spawnGrace = Math.max(0, player._spawnGrace - dt);
  if (player._spawnGrace > 0 && !inVehicle) {
    const v = bestVehicle();
    if (v) {
      if (dist(px, py, v.x, v.y) < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "spawn_enter_vehicle" };
      return { ...navTo(v.x, v.y), action: null, autoBehavior: "spawn_to_vehicle" };
    }
    if (nearest) return { ...steer(centroidFlee()), action: null, autoBehavior: "spawn_flee" };
    return { dx: 0, dy: 0, action: null, autoBehavior: "spawn_idle" };
  }

  // 2. Go-home-now override.
  if (state._goHomeNow && !isHomebase) {
    return { ...navTo(EXIT_X, EXIT_Y), action: null, autoBehavior: "go_home_now" };
  }

  // 3. NEEDS — only when nothing is threatening us and we're up.
  if (!player.isSleeping && !player.isDowned) {
    if (threats.length > 0) { player._autoEating = false; player._autoDrinking = false; }
    else {
      // EAT
      if ((player._autoEating || player.food <= AUTO_EAT_AT) && player.food < 90 && getInventoryCount(player.inventory, "food") > 0) {
        player._autoEating = true;
        if (inVehicle) return { dx: 0, dy: 0, action: "exit_vehicle_for_needs", autoBehavior: "needs_exit_for_eat" };
        return { dx: 0, dy: 0, action: "auto_eat", autoBehavior: "needs_eat" };
      }
      player._autoEating = false;

      // DRINK — drinkWater() in GameView handles wells + bottles, so we just need
      // to be near a well OR hold a bottle, then emit auto_drink.
      if ((player._autoDrinking || player.water <= AUTO_DRINK_AT) && player.water < 90) {
        const wells = state.wells ?? [];
        const nearWell = wells.some(w => dist(px, py, w.x, w.y) < 58)
          || buildings.some(b => b.hasWell && dist(px, py, b.x + b.w / 2, b.y + b.h / 2) < 76);
        const haveBottle = getInventoryCount(player.inventory, "water") > 0;
        if (nearWell || haveBottle) {
          player._autoDrinking = true;
          if (inVehicle) return { dx: 0, dy: 0, action: "exit_vehicle_for_needs", autoBehavior: "needs_exit_for_drink" };
          return { dx: 0, dy: 0, action: "auto_drink", autoBehavior: "needs_drink" };
        }
        // Walk to the nearest safe well if one exists.
        if (!inVehicle && wells.length) {
          let w = null, wd = Infinity;
          for (const cand of wells) {
            if (zombies.some(z => !z.dead && dist(z.x, z.y, cand.x, cand.y) < 120)) continue;
            const d = dist(px, py, cand.x, cand.y);
            if (d < wd) { wd = d; w = cand; }
          }
          if (w) { player._autoDrinking = true; return { ...navTo(w.x, w.y), action: null, autoBehavior: "needs_seek_well" }; }
        }
      }
      player._autoDrinking = false;

      // SLEEP — sleep in place when it's safe (or when critically low). No more
      // hunting for a barricadeable room; GameView wakes us on danger.
      if (player.sleep <= AUTO_SLEEP_SEEK_AT) {
        const danger = zombies.some(z => !z.dead && ACTIVE_STATES.has(z.state) && dist(z.x, z.y, px, py) < 300);
        if (player.sleep <= AUTO_SLEEP_AT || !danger) {
          return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "needs_sleep" };
        }
      }
    }
  }

  // 4. DANGER.
  const armed = !!player.weapon;
  if (inVehicle && nearest && stance !== "flee") {
    return { ...navTo(nearest.x, nearest.y), action: null, autoBehavior: "fight_vehicle" };
  }
  if (!inVehicle && nearest) {
    const fleeMode = stance === "flee" || !armed || threats.length >= 2;
    if (fleeMode) {
      const v = bestVehicle();
      if (v) {
        if (dist(px, py, v.x, v.y) < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "danger_enter_vehicle" };
        // blend toward the car, away from the closest zombie if it's right on us
        if (dist(px, py, nearest.x, nearest.y) < AUTO_FLEE_RANGE) {
          const toV = toward(v.x, v.y), fromZ = toward(nearest.x, nearest.y);
          const bx = toV.dx * 0.65 - fromZ.dx * 0.35, by = toV.dy * 0.65 - fromZ.dy * 0.35;
          const l = Math.hypot(bx, by) || 1;
          return { ...steer({ dx: bx / l, dy: by / l }), action: null, autoBehavior: "danger_arc_to_vehicle" };
        }
        return { ...navTo(v.x, v.y), action: null, autoBehavior: "danger_to_vehicle" };
      }
      return { ...steer(centroidFlee()), action: null, autoBehavior: "flee" };
    }
    // armed, single threat → fight it
    if (dist(px, py, nearest.x, nearest.y) < AUTO_MELEE_RANGE + 12) {
      return { dx: 0, dy: 0, action: "attack", autoBehavior: "fight" };
    }
    return { ...steer(toward(nearest.x, nearest.y)), action: null, autoBehavior: "fight_approach" };
  }

  // 5. REPAIR a damaged vehicle when safe and carrying parts.
  //    Skip if a clearly better vehicle is reachable — prefer switching to repairing.
  if (threats.length === 0 && getInventoryCount(player.inventory, "car_parts") > 0) {
    let target = null;
    if (inVehicle && myVehicle && myVehicle.hp / (myVehicle.maxHp ?? myVehicle.hp) < 0.5) {
      // Only exit to repair if there's no significantly better vehicle nearby.
      if (!hasBetterVehicle(myVehicle)) target = myVehicle;
    }
    if (!target) {
      let bd = Infinity;
      for (const v of allV) {
        if (v.hp <= 0) continue;
        if (v.occupied && v.driver !== "p1" && v.passenger !== "p1") continue;
        if (v.hp / (v.maxHp ?? v.hp ?? 1) >= 0.5) continue;
        const d = dist(px, py, v.x, v.y);
        if (d < bd && d < AUTO_FLEET_SEEK_RANGE) { bd = d; target = v; }
      }
      // On foot: skip repair if a clearly better vehicle is within reach.
      if (target && hasBetterVehicle(target)) target = null;
    }
    if (target) {
      if (inVehicle) return { dx: 0, dy: 0, action: "exit_vehicle_for_repair", autoBehavior: "needs_exit_for_repair" };
      // Use REPAIR_RANGE - 2 so we're guaranteed within range when the cast fires.
      if (dist(px, py, target.x, target.y) < REPAIR_RANGE - 2) return { dx: 0, dy: 0, action: "auto_repair_vehicle", autoBehavior: "repairing_vehicle" };
      return { ...navTo(target.x, target.y), action: null, autoBehavior: "approach_vehicle_repair" };
    }
  }

  // 6. BOSS — once it's alive it's the only thing that matters. Always fight
  //    from a vehicle; only melee as a last resort if no car is reachable.
  if (bossZombie && !bossZombie.dead) {
    if (inVehicle) return { ...navTo(bossZombie.x, bossZombie.y), action: null, autoBehavior: "boss_vehicle" };
    // On foot → get in a car first.
    const v = bestVehicle();
    if (v) {
      if (dist(px, py, v.x, v.y) < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "boss_enter_vehicle" };
      return { ...navTo(v.x, v.y), action: null, autoBehavior: "boss_to_vehicle" };
    }
    // No vehicle available at all — melee as last resort.
    if (armed && dist(px, py, bossZombie.x, bossZombie.y) < AUTO_MELEE_RANGE + 12) return { dx: 0, dy: 0, action: "attack", autoBehavior: "boss_fight" };
    return { ...navTo(bossZombie.x, bossZombie.y), action: null, autoBehavior: "boss_approach" };
  }
  if (bossZombie?.dead) {
    return { ...navTo(EXIT_X, EXIT_Y), action: null, autoBehavior: "exiting" };
  }

  // 7. FIGHT stance — proactively hunt the nearest reachable zombie on the map.
  if (stance === "fight") {
    const hunt = zombies
      .filter(z => !z.dead && !buildings.some(b => isInsideBuilding(z, b)))
      .reduce((best, z) => (!best || dist(px, py, z.x, z.y) < dist(px, py, best.x, best.y)) ? z : best, null);
    if (hunt) {
      if (inVehicle) return { ...navTo(hunt.x, hunt.y), action: null, autoBehavior: "hunt_vehicle" };
      if (armed && dist(px, py, hunt.x, hunt.y) < AUTO_MELEE_RANGE + 12) return { dx: 0, dy: 0, action: "attack", autoBehavior: "hunt_melee" };
      if (armed) return { ...navTo(hunt.x, hunt.y), action: null, autoBehavior: "hunt_approach" };
    }
  }

  // ── 8. SETTLEMENT: clear, then loot, then travel ─────────────────────────────
  const settlements = state.settlements ?? [];
  const curSid      = state.pendingLootSettlementId ?? compassTarget?.settlementId ?? 0;
  const settlement  = settlements.find(s => s.id === curSid) ?? null;
  const scx = settlement?.cx ?? compassTarget?.x ?? px;
  const scy = settlement?.cy ?? compassTarget?.y ?? py;

  const inRadius = (x, y) => dist(x, y, scx, scy) < SETTLEMENT_RADIUS;
  const sBuildings = buildings.filter(b => b.settlementId === curSid || inRadius(b.x + b.w / 2, b.y + b.h / 2));

  // outside zombies threatening the settlement
  const outsideZ = zombies.filter(z => !z.dead && !buildings.some(b => isInsideBuilding(z, b)) && inRadius(z.x, z.y));
  // buildings with an *active* trapped zombie behind a closed door
  const doorBuildings = sBuildings.filter(b =>
    zombies.some(z => !z.dead && ACTIVE_STATES.has(z.state) && isInsideBuilding(z, b)) &&
    (b.doors ?? []).some(d => !d.open && !d.broken)
  );
  // uncollected loot belonging to this settlement
  const sLoot = lootPiles.filter(p => {
    if (p.collected) return false;
    const b = buildings.find(bb => bb.id === p.buildingId);
    const cx = b ? b.x + b.w / 2 : p.x, cy = b ? b.y + b.h / 2 : p.y;
    return (b && sBuildings.includes(b)) || inRadius(cx, cy);
  });

  const outsideCleared = outsideZ.length === 0;
  const trappedActive  = zombies.some(z => !z.dead && ACTIVE_STATES.has(z.state) && sBuildings.some(b => isInsideBuilding(z, b)));
  const lootDone       = sLoot.length === 0;

  // Once the pending settlement is finished, drop the flag so we move on.
  if (state.pendingLootSettlementId != null && outsideCleared && !trappedActive && lootDone) {
    state.pendingLootSettlementId = null;
  }

  // 8a. Outside zombies remain → run them down (vehicle) once doors are handled.
  if (!outsideCleared) {
    if (inVehicle) {
      const z = outsideZ.reduce((a, b) => dist(px, py, a.x, a.y) < dist(px, py, b.x, b.y) ? a : b);
      return { ...navTo(z.x, z.y), action: null, autoBehavior: "hunt_outside" };
    }
    // On foot with no doors left to open, fetch a car to hunt efficiently.
    if (doorBuildings.length === 0) {
      const v = bestVehicle();
      if (v) {
        if (dist(px, py, v.x, v.y) < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "reenter_to_hunt" };
        return { ...navTo(v.x, v.y), action: null, autoBehavior: "approach_vehicle_to_hunt" };
      }
    }
    // else fall through to open doors on foot
  }

  // 8b. Open doors to flush trapped zombies.
  if (outsideCleared && doorBuildings.length > 0) {
    if (inVehicle) return { dx: 0, dy: 0, action: "exit_vehicle_for_doors", autoBehavior: "exit_for_doors" };
    // nearest closed door across all door-buildings
    let b = null, door = null, bd = Infinity;
    for (const bld of doorBuildings) {
      for (const d of (bld.doors ?? [])) {
        if (d.open || d.broken) continue;
        const c = getDoorCenter(bld, d);
        const dd = dist(px, py, c.x, c.y);
        if (dd < bd) { bd = dd; b = bld; door = d; }
      }
    }
    if (door) {
      const c = getDoorCenter(b, door);
      if (dist(px, py, c.x, c.y) < DOOR_INTERACT_RANGE) return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door" };
      const ap = exteriorApproach(b, door);
      return { ...navTo(ap.x, ap.y), action: null, autoBehavior: "approach_door" };
    }
  }

  // 8c. Loot everything in the settlement.
  if (outsideCleared && !trappedActive && !lootDone) {
    if (inVehicle) return { dx: 0, dy: 0, action: "exit_vehicle_for_doors", autoBehavior: "exit_for_loot" };

    // nearest pile (skip ones we can't safely reach on foot)
    let pile = null, pd = Infinity;
    for (const p of sLoot) {
      // don't loot a pile with a pack of outside zombies sitting on it
      const danger = zombies.filter(z => !z.dead && dist(p.x, p.y, z.x, z.y) < AUTO_LOOT_DANGER_RANGE && !buildings.some(b => isInsideBuilding(z, b))).length;
      if (danger >= AUTO_LOOT_DANGER_THRESHOLD) continue;
      const d = dist(px, py, p.x, p.y);
      if (d < pd) { pd = d; pile = p; }
    }
    if (pile) {
      if (dist(px, py, pile.x, pile.y) < AUTO_LOOT_RANGE) return { dx: 0, dy: 0, action: "collect", autoBehavior: "loot" };
      const pileB = buildings.find(b => b.id === pile.buildingId) ?? buildingContaining(pile.x, pile.y);
      // pile is inside a building whose doors are all shut → open one first
      if (pileB && !isInsideBuilding({ x: px, y: py }, pileB) && openDoors(pileB).length === 0) {
        const door = nearestDoorOf(pileB, (pileB.doors ?? []).filter(d => !d.open && !d.broken));
        if (door) {
          const c = getDoorCenter(pileB, door);
          if (dist(px, py, c.x, c.y) < DOOR_INTERACT_RANGE) return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door_for_loot" };
          const ap = exteriorApproach(pileB, door);
          return { ...navTo(ap.x, ap.y), action: null, autoBehavior: "approach_door_for_loot" };
        }
      }
      return { ...navTo(pile.x, pile.y), action: null, autoBehavior: "loot_approach" };
    }
  }

  // 8d. Settlement done → drive to the next fragment (re-enter a car first).
  if (compassTarget) {
    if (!inVehicle) {
      const v = bestVehicle();
      if (v) {
        if (dist(px, py, v.x, v.y) < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "enter_for_travel" };
        if (dist(px, py, v.x, v.y) < AUTO_FLEET_SEEK_RANGE) return { ...navTo(v.x, v.y), action: null, autoBehavior: "approach_vehicle_travel" };
      }
    }
    return { ...navTo(compassTarget.x, compassTarget.y), action: null, autoBehavior: "fragment_hunt" };
  }

  // 9. HOMEBASE patrol — flee a close zombie, otherwise circle the perimeter.
  if (isHomebase) {
    const near = zombies.find(z => !z.dead && dist(px, py, z.x, z.y) < 150);
    if (near) { const t = toward(near.x, near.y); return { dx: -t.dx, dy: -t.dy, action: null, autoBehavior: "patrol_flee" }; }

    if (!player._patrol || player._patrolN !== buildings.length) {
      player._patrolN = buildings.length;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const b of buildings) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
      const M = 80;
      minX = Math.max(60, minX - M); minY = Math.max(60, minY - M);
      maxX = Math.min(WORLD_W - 60, maxX + M); maxY = Math.min(WORLD_W - 60, maxY + M);
      player._patrol = [
        { x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY },
      ];
      player._patrolI = player._patrol.reduce((bi, wp, i) =>
        dist(px, py, wp.x, wp.y) < dist(px, py, player._patrol[bi].x, player._patrol[bi].y) ? i : bi, 0);
    }
    const wp = player._patrol[player._patrolI ?? 0];
    if (dist(px, py, wp.x, wp.y) < 60) player._patrolI = ((player._patrolI ?? 0) + 1) % player._patrol.length;
    return { ...navTo(wp.x, wp.y), action: null, autoBehavior: "patrol" };
  }

  // 10. Nothing to do.
  return { dx: 0, dy: 0, action: null, autoBehavior: "idle" };
}