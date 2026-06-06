// engine_survivors.js — split from deadMilesEngine.js (pure functions, no React)

import { BACKSTORY_POOL, PLAYER_RADIUS, SURVIVOR_FIGHT_RANGE, SURVIVOR_FLEE_SPEED, SURVIVOR_FLEE_TRIGGER, SURVIVOR_FOLLOW_DIST, SURVIVOR_FOOD_PER_TICK, SURVIVOR_HARVEST_CAST, SURVIVOR_HP_REGEN_RATE, SURVIVOR_MELEE_DAMAGE, SURVIVOR_MELEE_RANGE, SURVIVOR_MELEE_RATE, SURVIVOR_MORALE_DRAIN_PER_TICK, SURVIVOR_MORALE_FOOD_RESTORE, SURVIVOR_REGEN_DELAY, SURVIVOR_REPAIR_CAST, SURVIVOR_SPEED, SURVIVOR_STORY_LOG_STARTERS, SURVIVOR_TRAITS, SURVIVOR_TURRET_REPAIR_HP_THRESHOLD, SURVIVOR_TURRET_WANDER, SURVIVOR_XP_TABLE, TRAIT_POOL_NEGATIVE, TRAIT_POOL_POSITIVE, TURRET_REPAIR_HP, TURRET_REPAIR_RANGE, VEHICLE_TYPES, WORLD_H, WORLD_W, ZOMBIE_ATTACK_DAMAGE, ZOMBIE_ATTACK_RANGE, ZOMBIE_ATTACK_RATE } from "./engine_constants";
import { dist, getDoorCenter, isInsideBuilding, resolveWallCollision, seededRand } from "./engine_geometry";
import { createCrop } from "./engine_entities";
import { separateEntityLists } from "./engine_zombies";
import { getInventoryCount, removeFromInventory } from "./engine_player";
import { baseTick } from "./engine_base";

export function survivorNearestBuilding(entity, buildings) {
  let best = null, bestD = Infinity;
  for (const b of buildings) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const d = dist(entity.x, entity.y, cx, cy);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
function survivorMoveTo(entity, tx, ty, speed, dt, buildings, allowBldg = null) {
  const dx = tx - entity.x, dy = ty - entity.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 4) return true;

  // Obstacle-steering: sample candidate directions and pick the best one.
  // Falls back to direct path when unobstructed; steers around walls otherwise.
  const baseAngle    = Math.atan2(dy, dx);
  const STEER_ANGLES = [0, -0.45, 0.45, -0.9, 0.9];
  const PROBE_DIST   = speed * dt * 3;

  let bestAngle = baseAngle;
  let bestScore = -Infinity;

  for (const offset of STEER_ANGLES) {
    const a  = baseAngle + offset;
    const px = entity.x + Math.cos(a) * PROBE_DIST;
    const py = entity.y + Math.sin(a) * PROBE_DIST;
    const remDx = tx - px, remDy = ty - py;
    let score = -(remDx * remDx + remDy * remDy);
    if (buildings) {
      for (const b of buildings) {
        // Don't avoid the building we're deliberately threading — otherwise the
        // steering refuses to step through its doorway and the survivor wall-hugs.
        if (allowBldg && b === allowBldg) continue;
        if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) {
          score -= 999999;
          break;
        }
      }
    }
    if (score > bestScore) { bestScore = score; bestAngle = a; }
  }

  const nx = Math.cos(bestAngle), ny = Math.sin(bestAngle);
  entity.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, entity.x + nx * speed * dt));
  entity.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, entity.y + ny * speed * dt));
  entity.facing = bestAngle;
  if (buildings) {
    for (const b of buildings) resolveWallCollision(entity, b);
  }
  return false;
}

/**
 * When a follow target is inside a building (and the survivor is outside it, or
 * vice versa), return the center of the nearest open/broken door so the survivor
 * routes through the doorway instead of straight into the wall.
 * Returns null when no routing is needed (same side, or no doors available).
 */
function survivorDoorWaypoint(sv, targetX, targetY, buildings) {
  if (!buildings) return null;
  for (const b of buildings) {
    const svInside = isInsideBuilding(sv, b);
    const tgInside = targetX > b.x && targetX < b.x + b.w &&
                     targetY > b.y && targetY < b.y + b.h;
    if (svInside === tgInside) continue;          // same side — no routing needed
    if (!b.doors || b.doors.length === 0) continue;

    // Prefer an open/broken door; fall back to the nearest closed one so the
    // survivor lines up just outside it rather than wall-hugging.
    const openDoors = b.doors.filter(d => d.open || d.broken);
    const usable    = openDoors.length ? openDoors : b.doors;

    let bestDoor = null, bestDist = Infinity;
    for (const door of usable) {
      const dc = getDoorCenter(b, door);
      const d  = dist(sv.x, sv.y, dc.x, dc.y);
      if (d < bestDist) { bestDist = d; bestDoor = door; }
    }
    if (!bestDoor) continue;

    const dc  = getDoorCenter(b, bestDoor);
    // Line-up point sits OUT px outside the wall; cross-through point sits IN px
    // inside it. Aiming at a point PAST the threshold (rather than the door
    // centre, which lies exactly on the wall plane) is what lets the survivor
    // actually cross instead of "arriving" on the threshold and idling there.
    const OUT = 30, IN = 44;
    const exterior = {
      north: { x: dc.x,       y: dc.y - OUT },
      south: { x: dc.x,       y: dc.y + OUT },
      west:  { x: dc.x - OUT, y: dc.y       },
      east:  { x: dc.x + OUT, y: dc.y       },
    }[bestDoor.side] ?? { x: dc.x, y: dc.y - OUT };
    const interior = {
      north: { x: dc.x,      y: dc.y + IN },
      south: { x: dc.x,      y: dc.y - IN },
      west:  { x: dc.x + IN, y: dc.y      },
      east:  { x: dc.x - IN, y: dc.y      },
    }[bestDoor.side] ?? { x: dc.x, y: dc.y + IN };

    // Decide by LATERAL alignment with the gap, not depth (depth-based switching
    // yo-yos on the threshold). Only commit to crossing once we actually fit:
    // the clear corridor is the door width minus our body diameter.
    const horiz    = bestDoor.side === "north" || bestDoor.side === "south";
    const lateral  = horiz ? Math.abs(sv.x - dc.x) : Math.abs(sv.y - dc.y);
    const halfGap  = Math.max(3, (bestDoor.width ?? 28) / 2 - PLAYER_RADIUS - 2);
    const canCross = bestDoor.open || bestDoor.broken;

    // Line up on our own side first, then cross to the far side.
    const lineUp = svInside ? interior : exterior;
    const cross  = svInside ? exterior : interior;
    const wp     = (canCross && lateral <= halfGap) ? cross : lineUp;

    // Return the building so survivorMoveTo won't treat it as a solid obstacle
    // while we're deliberately threading its doorway.
    return { x: wp.x, y: wp.y, building: b };
  }
  return null;
}

/**
 * Door-aware movement wrapper for survivors. When a building wall lies between
 * the survivor and (tx,ty), routes through the nearest usable doorway and
 * reports NOT-arrived until the survivor has actually crossed to the target's
 * side. When there's no wall in the way, behaves exactly like survivorMoveTo.
 * Returns true only when the survivor has reached the real target.
 */
function survivorNavTo(sv, tx, ty, speed, dt, buildings) {
  const doorWP = survivorDoorWaypoint(sv, tx, ty, buildings);
  if (doorWP) {
    // Still on the wrong side of a wall — head for the doorway waypoint and let
    // survivorMoveTo step through (allowBldg = the building we're threading).
    survivorMoveTo(sv, doorWP.x, doorWP.y, speed, dt, buildings, doorWP.building);
    return false;
  }
  return survivorMoveTo(sv, tx, ty, speed, dt, buildings, null);
}
function nearestZombieInRange(entity, zombies, range) {
  let best = null, bestD = Infinity;
  for (const z of zombies) {
    if (z.dead) continue;
    const d = dist(entity.x, entity.y, z.x, z.y);
    if (d < range && d < bestD) { bestD = d; best = z; }
  }
  return best;
}
function survivorAttack(survivor, zombies, dt) {
  if (survivor._attackCd > 0) { survivor._attackCd -= dt; return; }
  const z = nearestZombieInRange(survivor, zombies, SURVIVOR_MELEE_RANGE);
  if (!z) return;
  z.hp -= SURVIVOR_MELEE_DAMAGE;
  if (z.hp <= 0) z.dead = true;
  survivor._attackCd = 1 / SURVIVOR_MELEE_RATE;
}
export function tryAssignSurvivor(survivor, structureId, structureType) {
  survivor.command = "assign";
  survivor.assignedTo = { structureId, structureType };
  survivor.state = "idle";
  survivor._castTimer = 0;
  survivor._castType = null;
}
export function assignSurvivorToConvoy(survivor, convoyVehicles, vehicles, vehicleType = "car") {
  const taken = new Set(convoyVehicles.map(e => e.vehicle));
  // Sort by distance from the survivor so they always take the nearest free car,
  // not whichever vehicle happened to be first in the spawn array.
  const freeVehicle = [...vehicles]
    .filter(v => !taken.has(v) && !v.occupied)
    .sort((a, b) => {
      const da = (a.x - survivor.x) ** 2 + (a.y - survivor.y) ** 2;
      const db = (b.x - survivor.x) ** 2 + (b.y - survivor.y) ** 2;
      return da - db;
    })[0] ?? null;
  if (!freeVehicle) return null;

  freeVehicle.occupied = true;
  freeVehicle.driver   = `convoy_${survivor.id}`;
  if (!freeVehicle._id) freeVehicle._id = `cv_${survivor.id}`;
  survivor.command = "convoy";
  survivor.state   = "idle";

  const entry = { vehicle: freeVehicle, survivor };
  convoyVehicles.push(entry);
  return entry;
}
export function updateSurvivors(survivors, player, vehicle, zombies, turrets, gardenPlots, crops, buildings, dt, vehicles = null, player2 = null) {
  for (const sv of survivors) {
    if (sv.hp <= 0) continue;

    if (sv.barricaded) {
      survivorAttack(sv, zombies, dt);
      // Still apply hit cooldown and passive regen even while barricaded
      if (sv._hitCd > 0) sv._hitCd -= dt;
      if (sv._regenDelay > 0) {
        sv._regenDelay -= dt;
      } else if (sv.hp < sv.maxHp) {
        sv.hp = Math.min(sv.maxHp, sv.hp + SURVIVOR_HP_REGEN_RATE * dt);
      }
      // Unbarricade once HP recovers above flee threshold
      if (sv.hp > sv.fleeHp) {
        sv.barricaded = false;
        sv.barricadeBuilding = null;
        sv.state = "idle";
      }
      continue;
    }

    const shouldFlee = sv.hp <= sv.fleeHp;
    let effectiveCmd = sv.command;

    if (shouldFlee && effectiveCmd !== "barricaded") {
      effectiveCmd = "_flee_low_hp";
    }

    switch (effectiveCmd) {

      case "follow": {
        // Follow whoever issued the "follow" command (sv.followLeader), fallback to player
        const leader = sv.followLeader ?? player;

        // ── Vehicle boarding / riding ─────────────────────────────────────────
        // Determine which vehicle the leader is driving (could be any vehicle in
        // the fleet; we find whichever one claims the leader as driver/passenger).
        const leaderInVehicle = leader.inVehicle;

        if (sv.inVehicle) {
          // Already riding — check if the leader has since left the vehicle
          const ridingVehicle = sv._ridingVehicle;
          if (!ridingVehicle || !leaderInVehicle) {
            // Leader got out (or vehicle reference lost) — eject this survivor
            sv.inVehicle = false;
            if (ridingVehicle && ridingVehicle.survivorPassengers) {
              ridingVehicle.survivorPassengers = ridingVehicle.survivorPassengers.filter(id => id !== sv.id);
            }
            // Scatter slightly so survivors don't stack on top of each other
            sv.x = (ridingVehicle?.x ?? sv.x) + (Math.random() - 0.5) * 40;
            sv.y = (ridingVehicle?.y ?? sv.y) + (Math.random() - 0.5) * 40;
            sv._ridingVehicle = null;
            sv.state = "following";
          } else {
            // Stay synced to vehicle position
            sv.x = ridingVehicle.x;
            sv.y = ridingVehicle.y;
            sv.state = "riding";
          }
          break;
        }

        if (leaderInVehicle) {
          // Leader just entered a vehicle — search the full fleet for whichever
          // vehicle claims the leader as driver or passenger.
          // FIX 1: use the vehicles array passed from the caller instead of _fleet hack.
          const allVehicles = vehicles ? [...vehicles] : vehicle ? [vehicle] : [];

          // Determine the role string for this leader
          const leaderRole = (leader === player) ? "p1"
                           : (player2 && leader === player2) ? "p2"
                           : null;

          const leaderVehicle = leaderRole
            ? (allVehicles.find(v => v.driver === leaderRole || v.passenger === leaderRole) ?? vehicle)
            : vehicle;

          if (leaderVehicle) {
            const cfg = VEHICLE_TYPES[leaderVehicle.vehicleType] ?? VEHICLE_TYPES.car;
            const totalSeats = cfg.seats ?? 2;
            // Seats occupied by human players
            const humanOccupants = (leaderVehicle.driver ? 1 : 0) + (leaderVehicle.passenger ? 1 : 0);
            const survivorSeatsUsed = (leaderVehicle.survivorPassengers ?? []).length;
            const freeSeats = totalSeats - humanOccupants - survivorSeatsUsed;

            if (freeSeats > 0) {
              // Move toward the vehicle to board
              const dToVehicle = dist(sv.x, sv.y, leaderVehicle.x, leaderVehicle.y);
              if (dToVehicle < 55) {
                // Board!
                if (!leaderVehicle.survivorPassengers) leaderVehicle.survivorPassengers = [];
                leaderVehicle.survivorPassengers.push(sv.id);
                sv.inVehicle = true;
                sv._ridingVehicle = leaderVehicle;
                sv.x = leaderVehicle.x;
                sv.y = leaderVehicle.y;
                sv.state = "riding";
              } else {
                // Rush toward vehicle
                survivorMoveTo(sv, leaderVehicle.x, leaderVehicle.y, SURVIVOR_SPEED * 1.4, dt, buildings);
                sv.state = "following";
              }
              break;
            }
            // No free seat — fall through to normal foot-follow below
          }
        }

        // Normal on-foot following — offset to the side of the leader so the
        // survivor doesn't park directly behind them (makes T-selecting nearly
        // impossible because you'd have to walk into them to get in range).
        const leaderFacing = leader.facing ?? 0;
        // FIX 4: Assign a stable lateral slot based on this survivor's index among
        // all living followers of the same leader, rather than % 3 which causes
        // stacking whenever there are more than 3 followers.
        // We cache _followSlot on the survivor; if it's missing or null we assign it
        // based on how many survivors already have a slot (so new recruits get the
        // next free slot rather than colliding with existing ones).
        if (sv._followSlot == null) {
          const usedSlots = survivors
            .filter(s2 => s2 !== sv && s2.hp > 0 && s2.command === "follow" && s2._followSlot != null)
            .map(s2 => s2._followSlot);
          // Find the first slot index not already taken
          let slotIdx = 0;
          while (usedSlots.includes(slotIdx)) slotIdx++;
          sv._followSlot = slotIdx;
        }
        // Convert slot index → signed lateral offset:
        // slot 0 → 0, slot 1 → +1, slot 2 → −1, slot 3 → +2, slot 4 → −2, …
        const svSlot = sv._followSlot;
        const svLateralSign = svSlot === 0 ? 0 : svSlot % 2 === 1 ? 1 : -1;
        const svLateralMag  = Math.ceil(svSlot / 2);
        const lateralAngle = leaderFacing + Math.PI / 2;
        const behindX  = leader.x - Math.cos(leaderFacing) * SURVIVOR_FOLLOW_DIST;
        const behindY  = leader.y - Math.sin(leaderFacing) * SURVIVOR_FOLLOW_DIST;
        const targetX  = behindX + Math.cos(lateralAngle) * (svLateralSign * svLateralMag * 36);
        const targetY  = behindY + Math.sin(lateralAngle) * (svLateralSign * svLateralMag * 36);

        // If the follow target is on the other side of a building wall, route
        // through the nearest open door instead of walking straight into the wall.
        const arrived = survivorNavTo(sv, targetX, targetY, SURVIVOR_SPEED, dt, buildings);
        sv.state = arrived ? "idle" : "following";
        const nearby = nearestZombieInRange(sv, zombies, SURVIVOR_MELEE_RANGE);
        if (nearby) survivorAttack(sv, zombies, dt);
        break;
      }

      case "stay_here": {
        survivorAttack(sv, zombies, dt);
        sv.state = "idle";
        break;
      }

      case "stay_safe": {
        const threat = nearestZombieInRange(sv, zombies, SURVIVOR_FLEE_TRIGGER);
        if (threat) {
          const building = survivorNearestBuilding(sv, buildings);
          if (building) {
            const bx = building.x + building.w / 2, by = building.y + building.h / 2;
            survivorNavTo(sv, bx, by, SURVIVOR_FLEE_SPEED, dt, buildings);
            sv.state = "fleeing";
          }
        } else {
          sv._wanderTimer -= dt;
          if (sv._wanderTimer <= 0) {
            sv._wanderTimer = 3 + Math.random() * 4;
            sv._wanderTargetX = sv.x + (Math.random() - 0.5) * 200;
            sv._wanderTargetY = sv.y + (Math.random() - 0.5) * 200;
            sv._wanderTargetX = Math.max(50, Math.min(WORLD_W - 50, sv._wanderTargetX));
            sv._wanderTargetY = Math.max(50, Math.min(WORLD_H - 50, sv._wanderTargetY));
          }
          const arrived = survivorMoveTo(sv, sv._wanderTargetX, sv._wanderTargetY, SURVIVOR_SPEED * 0.6, dt, buildings);
          sv.state = arrived ? "idle" : "following";
        }
        break;
      }

      case "fight": {
        const target = nearestZombieInRange(sv, zombies, SURVIVOR_FIGHT_RANGE);
        if (target) {
          const d = dist(sv.x, sv.y, target.x, target.y);
          if (d > SURVIVOR_MELEE_RANGE) {
            survivorNavTo(sv, target.x, target.y, SURVIVOR_SPEED, dt, buildings);
            sv.state = "following";
          } else {
            survivorAttack(sv, zombies, dt);
            sv.state = "working";
          }
        } else {
          sv.state = "idle";
        }
        break;
      }

      case "assign": {
        if (!sv.assignedTo) { sv.command = "follow"; break; }
        const { structureId, structureType } = sv.assignedTo;

        if (structureType === "turret") {
          const turret = (turrets ?? []).find(t => t.id === structureId && !t.destroyed);
          if (!turret) { sv.command = "follow"; sv.assignedTo = null; break; }

          const dToTurret = dist(sv.x, sv.y, turret.x, turret.y);

          if (turret.hp < turret.maxHp * SURVIVOR_TURRET_REPAIR_HP_THRESHOLD) {
            if (dToTurret > TURRET_REPAIR_RANGE) {
              survivorMoveTo(sv, turret.x, turret.y, SURVIVOR_SPEED, dt, buildings);
              sv.state = "following";
              sv._castTimer = 0; sv._castType = null;
            } else {
              sv.state = "working";
              sv._castType = "repair";
              sv._castTimer += dt;
              if (sv._castTimer >= SURVIVOR_REPAIR_CAST) {
                sv._castTimer = 0;
                turret.hp = Math.min(turret.maxHp, turret.hp + TURRET_REPAIR_HP);
              }
            }
          } else {
            sv._castTimer = 0; sv._castType = null;
            sv._wanderTimer -= dt;
            if (sv._wanderTimer <= 0) {
              sv._wanderTimer = 3 + Math.random() * 4;
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * SURVIVOR_TURRET_WANDER;
              sv._wanderTargetX = Math.max(50, Math.min(WORLD_W - 50, turret.x + Math.cos(angle) * r));
              sv._wanderTargetY = Math.max(50, Math.min(WORLD_H - 50, turret.y + Math.sin(angle) * r));
            }
            survivorMoveTo(sv, sv._wanderTargetX, sv._wanderTargetY, SURVIVOR_SPEED * 0.7, dt, buildings);
            sv.state = "idle";
          }

          const nearby = nearestZombieInRange(sv, zombies, SURVIVOR_MELEE_RANGE);
          if (nearby) survivorAttack(sv, zombies, dt);

        } else if (structureType === "crop") {
          const plot = (gardenPlots ?? []).find(p => p.id === structureId);
          if (!plot) { sv.command = "follow"; sv.assignedTo = null; break; }

          const plotCx = plot.x + plot.w / 2, plotCy = plot.y + plot.h / 2;
          const dToPlot = dist(sv.x, sv.y, plotCx, plotCy);
          const readyCrop = (crops ?? []).find(c => c.plotId === plot.id && c.stage === "ready");

          const threat = sv.priority === "safety_first"
            ? nearestZombieInRange(sv, zombies, SURVIVOR_FLEE_TRIGGER)
            : null;

          if (threat) {
            const building = survivorNearestBuilding(sv, buildings);
            if (building) {
              survivorNavTo(sv, building.x + building.w / 2, building.y + building.h / 2, SURVIVOR_FLEE_SPEED, dt, buildings);
              sv.state = "fleeing";
            }
            sv._castTimer = 0; sv._castType = null;
          } else if (readyCrop) {
            if (dToPlot > 80) {
              survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED, dt, buildings);
              sv.state = "following";
              sv._castTimer = 0; sv._castType = null;
            } else {
              sv.state = "working";
              sv._castType = "harvest";
              sv._castTimer += dt;
              if (sv._castTimer >= SURVIVOR_HARVEST_CAST) {
                sv._castTimer = 0;
                readyCrop.stage = "harvested";
                readyCrop.dead = true;

                const harvestedPlot = (gardenPlots ?? []).find(p => p.id === readyCrop.plotId);
                if (harvestedPlot && getInventoryCount(player.inventory, "seeds") >= 1) {
                  removeFromInventory(player.inventory, "seeds", 1);
                  const newCrop = createCrop(harvestedPlot.id, "potato", harvestedPlot.x, harvestedPlot.y);
                  if (crops) crops.push(newCrop);
                }
              }
            }
          } else {
            const plotEmpty = !(crops ?? []).some(c => c.plotId === plot.id && !c.dead);
            if (plotEmpty && getInventoryCount(player.inventory, "seeds") >= 1) {
              if (dToPlot > 80) {
                survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED, dt, buildings);
                sv.state = "following";
                sv._castTimer = 0; sv._castType = null;
              } else {
                sv.state = "working";
                sv._castType = "plant";
                sv._castTimer += dt;
                if (sv._castTimer >= SURVIVOR_HARVEST_CAST) {
                  sv._castTimer = 0;
                  if (getInventoryCount(player.inventory, "seeds") >= 1) {
                    removeFromInventory(player.inventory, "seeds", 1);
                    const newCrop = createCrop(plot.id, "potato", plot.x, plot.y);
                    if (crops) crops.push(newCrop);
                  }
                }
              }
            } else {
              sv._castTimer = 0; sv._castType = null;
              if (dToPlot > 100) {
                survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED * 0.6, dt, buildings);
                sv.state = "following";
              } else {
                sv.state = "idle";
              }
            }
          }
        }
        break;
      }

      case "_flee_low_hp": {
        const building = survivorNearestBuilding(sv, buildings);
        if (building) {
          const bx = building.x + building.w / 2, by = building.y + building.h / 2;
          const arrived = survivorNavTo(sv, bx, by, SURVIVOR_FLEE_SPEED, dt, buildings);
          sv.state = "fleeing";
          if (arrived && isInsideBuilding(sv, building)) {
            sv.barricaded = true;
            sv.barricadeBuilding = building.id;
            sv.state = "barricaded";
          }
        }
        break;
      }

      default:
        sv.state = "idle";
    }

    for (const z of zombies) {
      if (z.dead) continue;
      if (z.state !== "attack" && z.state !== "chase") continue;
      const d = dist(sv.x, sv.y, z.x, z.y);
      if (d > ZOMBIE_ATTACK_RANGE + sv.radius) continue;
      if (!sv._hitCd || sv._hitCd <= 0) {
        sv.hp = Math.max(0, sv.hp - ZOMBIE_ATTACK_DAMAGE);
        sv._hitCd = ZOMBIE_ATTACK_RATE;
        sv._regenDelay = SURVIVOR_REGEN_DELAY; // reset regen delay on hit
        sv._castTimer = 0; sv._castType = null;
      }
    }
    if (sv._hitCd > 0) sv._hitCd -= dt;

    // ── Passive HP regen ───────────────────────────────────────────────────────
    if (sv._regenDelay > 0) {
      sv._regenDelay -= dt;
    } else if (sv.hp < sv.maxHp) {
      sv.hp = Math.min(sv.maxHp, sv.hp + SURVIVOR_HP_REGEN_RATE * dt);
    }
  }

  // Separate survivors from each other so they don't overlap
  const aliveSurvivors = survivors.filter(sv => sv.hp > 0 && !sv.inVehicle);
  separateEntityLists(aliveSurvivors, aliveSurvivors);
}

// ─── Activity log ────────────────────────────────────────────────────────────
export function survivorXpToLevel(xp) {
  let level = 1;
  for (let i = 1; i < SURVIVOR_XP_TABLE.length; i++) {
    if (xp >= SURVIVOR_XP_TABLE[i]) level = i + 1;
    else break;
  }
  return level;
}

/** Award XP to a survivor; returns true if they levelled up. */
export function awardSurvivorXp(sv, amount) {
  if (!sv) return false;
  sv.xp = (sv.xp ?? 0) + amount;
  const newLevel = survivorXpToLevel(sv.xp);
  if (newLevel > (sv.level ?? 1)) {
    sv.level = newLevel;
    return true; // levelled up
  }
  sv.level = sv.level ?? 1;
  return false;
}

// ─── Workstation passive generation rates ─────────────────────────────────────
// FIX 2: Constants used by baseTick so the 4 workstations produce resources
// passively every real-second tick. Rate is resources-per-second of real time.
// Values intentionally small — they reward being at base, not idle-game grinding.
export function assignSurvivorTraits(survivor) {
  const seed = survivor.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRand(seed ^ 0xDEAD);

  const pickFrom = (pool) => pool[Math.floor(rand() * pool.length)];

  // 50/50 whether primary trait comes from positive or negative pool
  const primaryPool = rand() > 0.5 ? TRAIT_POOL_POSITIVE : TRAIT_POOL_NEGATIVE;
  const secondaryPool = primaryPool === TRAIT_POOL_POSITIVE ? TRAIT_POOL_NEGATIVE : TRAIT_POOL_POSITIVE;

  survivor.traits = [pickFrom(primaryPool)];
  if (rand() < 0.4) {
    const second = pickFrom(secondaryPool);
    if (!survivor.traits.includes(second)) survivor.traits.push(second);
  }
  return survivor.traits;
}

/** Check if a survivor has a specific trait. */
export function hasTrait(survivor, traitId) {
  return (survivor.traits ?? []).includes(traitId);
}

/**
 * Get the workstation output multiplier for a survivor.
 * Efficient trait → 1.2×; Night Owl trait is handled separately.
 */
export function getSurvivorWorkstationMultiplier(survivor, isNight = false) {
  let mult = 1.0;
  if (hasTrait(survivor, "efficient")) mult *= SURVIVOR_TRAITS.efficient.value;
  if (hasTrait(survivor, "night_owl")) {
    mult *= isNight ? (1 + SURVIVOR_TRAITS.night_owl.value) : (1 - SURVIVOR_TRAITS.night_owl.value * 0.5);
  }
  return mult;
}

/**
 * Returns which commands are blocked for this survivor due to traits.
 * Used by BaseView to disable/hide buttons.
 */
export function getBlockedCommands(survivor) {
  const blocked = [];
  if (hasTrait(survivor, "cowardly")) blocked.push("fight", "assign_guard_post");
  return blocked;
}

// ─── Survivor Backstory Pool ──────────────────────────────────────────────────
// Randomly assigned on spawn. Keeps survivors feeling like people, not stat blocks.
export function generateSurvivorBackstory(survivorId) {
  const seed = survivorId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 42);
  const rand = seededRand(seed ^ 0xBA7C);
  return BACKSTORY_POOL[Math.floor(rand() * BACKSTORY_POOL.length)];
}
export function generateSurvivorStoryLog(survivorId) {
  const seed = survivorId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 7);
  const rand = seededRand(seed ^ 0x5077);
  return [{ text: SURVIVOR_STORY_LOG_STARTERS[Math.floor(rand() * SURVIVOR_STORY_LOG_STARTERS.length)], ts: Date.now() }];
}

// ─── Survivor Morale & Hunger (Sim Layer) ────────────────────────────────────
// Morale drains slowly over time and from negative events. Low morale reduces
// workstation output. Zero morale means the survivor may leave.
// Hunger is tracked per-survivor in the world sim (not the action layer).
export function tickSurvivorNeeds(survivor, baseStorage) {
  if (!survivor) return { fed: false, moraleDelta: 0 };
  if (!survivor.morale) survivor.morale = 100;
  if (!survivor.hunger) survivor.hunger = 0; // hunger accumulator

  const food = baseStorage?.food ?? 0;
  let moraleDelta = 0;
  let fed = false;

  // Try to eat from base storage
  if (food >= SURVIVOR_FOOD_PER_TICK) {
    baseStorage.food = Math.max(0, food - SURVIVOR_FOOD_PER_TICK);
    survivor.hunger = 0;
    const restore = SURVIVOR_MORALE_FOOD_RESTORE;
    const paranoidMult = hasTrait(survivor, "paranoid") ? SURVIVOR_TRAITS.paranoid.value : 1;
    // Restore morale slightly when fed
    survivor.morale = Math.min(100, survivor.morale + 2);
    moraleDelta += 2;
    fed = true;
  } else {
    // Hungry — drain morale
    survivor.hunger = (survivor.hunger ?? 0) + 1;
    const drain = SURVIVOR_MORALE_DRAIN_PER_TICK * (hasTrait(survivor, "paranoid") ? SURVIVOR_TRAITS.paranoid.value : 1);
    // Stoic trait: morale floor
    const floor = hasTrait(survivor, "stoic") ? SURVIVOR_TRAITS.stoic.value : 0;
    survivor.morale = Math.max(floor, survivor.morale - drain);
    moraleDelta -= drain;
    fed = false;
  }

  return { fed, moraleDelta };
}

// ─── Threat Tier System ───────────────────────────────────────────────────────
// Replaces flat 25% attack chance. Each zone has a threat tier (0–4) that
// escalates over time unless cleared. Unsecured adjacent nodes amplify threat.
// Tier affects attack frequency AND damage per attack.