// engine_zombies.js — split from deadMilesEngine.js (pure functions, no React)

import { BOSS_DAMAGE, DOOR_BASH_RANGE, DOOR_HEAR_RANGE, HAMLET_AMBIENT_PULL, MAX_SOUND_DRIFT_RANGE, PLAYER_RADIUS, SOUND_DRIFT_SPEED, SOUND_TTL, TURRET_ZOMBIE_AGGRO_RANGE, TURRET_ZOMBIE_ATTACK_RANGE, VEHICLE_RADIUS, WORLD_H, WORLD_W, ZOMBIE_ATTACK_DAMAGE, ZOMBIE_ATTACK_RATE, ZOMBIE_CULL_DIST, ZOMBIE_GIVE_UP_TIME, ZOMBIE_RADIUS, ZOMBIE_SIGHT_RANGE, ZOMBIE_SOUND_RANGE, ZOMBIE_SPEED_NIGHT, ZOMBIE_SPEED_SLOW } from "./engine_constants";
import { getNightDifficulty } from "./engine_systems";
import { areWallSeparated, dist, getDoorCenter, isInsideBuilding, resolveWallCollision } from "./engine_geometry";
import { createZombie } from "./engine_entities";
import { syncPlayerToVehicle } from "./engine_player";

export function createSoundEvent(type, x, y, radius, strength) {
  return { type, x, y, radius, strength, age: 0, ttl: SOUND_TTL[type] ?? 2.0 };
}
export function updateSoundEvents(soundEvents, dt) {
  for (let i = soundEvents.length - 1; i >= 0; i--) {
    soundEvents[i].age += dt;
    if (soundEvents[i].age >= soundEvents[i].ttl) soundEvents.splice(i, 1);
  }
}
export function getSoundPull(zx, zy, soundEvents, hamletCx, hamletCy, level) {
  let pullX = 0, pullY = 0;

  if (level === 1) {
    const dHamlet = dist(zx, zy, hamletCx, hamletCy);
    if (dHamlet < MAX_SOUND_DRIFT_RANGE && dHamlet > 1) {
      const falloff = 1 - (dHamlet / MAX_SOUND_DRIFT_RANGE);
      const strength = HAMLET_AMBIENT_PULL * falloff * falloff;
      pullX += ((hamletCx - zx) / dHamlet) * strength;
      pullY += ((hamletCy - zy) / dHamlet) * strength;
    }
  }

  for (const ev of soundEvents) {
    const d = dist(zx, zy, ev.x, ev.y);
    if (d > ev.radius || d < 1) continue;
    const falloff = 1 - (d / ev.radius);
    const s = ev.strength * falloff;
    pullX += ((ev.x - zx) / d) * s;
    pullY += ((ev.y - zy) / d) * s;
  }

  const mag = Math.sqrt(pullX * pullX + pullY * pullY);
  if (mag < 0.001) return { dx: 0, dy: 0, mag: 0 };
  const capped = Math.min(mag, 1);
  return { dx: (pullX / mag) * capped, dy: (pullY / mag) * capped, mag: capped };
}

// ─── Open-world zombie spawner ────────────────────────────────────────────────
function isPlayerOccludedByWalls(zombie, player, buildings) {
  if (player.inVehicle) return false;
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (isInsideBuilding(zombie, b)) return false;
    const allSealed = (b.doors || []).every(d => !d.open && !d.broken);
    if (allSealed) return true;
  }
  return false;
}
function canHearThroughDoor(zombie, player, buildings) {
  if (player.inVehicle) return false;
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (!(b.doors || []).every(d => !d.open && !d.broken)) continue;
    for (const door of (b.doors || [])) {
      const dc = getDoorCenter(b, door);
      if (dist(zombie.x, zombie.y, dc.x, dc.y) < DOOR_HEAR_RANGE) return true;
    }
  }
  return false;
}
function getNearestTarget(zombie, player, player2, vehicle) {
  // player.x/y is authoritative. When a player drives, their position is synced to
  // the vehicle (syncPlayerToVehicle) before being broadcast, so we never need to
  // look up a separate vehicle object — doing so risks grabbing the WRONG vehicle
  // (e.g. P1's car) and is the reason p2-in-vehicle targeting failed previously.
  // For P1 (the local/host player) we can use the live vehicle position directly.
  const p1x = player.inVehicle ? vehicle.x : player.x;
  const p1y = player.inVehicle ? vehicle.y : player.y;
  const d1  = dist(zombie.x, zombie.y, p1x, p1y);

  // Consider player2 if present and alive. hp may be undefined before the first
  // stats sync arrives, so treat a missing hp as "alive" rather than dead.
  const p2Alive = player2 && (player2.hp == null || player2.hp > 0) && !player2.isDowned;
  if (p2Alive) {
    const p2x = player2.x;
    const p2y = player2.y;
    const d2 = dist(zombie.x, zombie.y, p2x, p2y);
    if (d2 < d1) {
      return { targetX: p2x, targetY: p2y, targetPlayer: player2, inVehicle: !!player2.inVehicle };
    }
  }

  return { targetX: p1x, targetY: p1y, targetPlayer: player, inVehicle: !!player.inVehicle };
}
// Returns a waypoint just outside (offsetDir=1) or just inside (offsetDir=-1) a door.
// The offset is large enough to clear the wall plane before resolveWallCollision kicks in.
// We also clamp the lateral position to the door aperture center to prevent corner-catching.
function doorWaypoint(building, door, zombie, offsetDir = 1) {
  const dc = getDoorCenter(building, door);
  // Depth offset: get the zombie fully past the wall plane before wall-collision runs.
  // Must be > ZOMBIE_RADIUS so resolveWallCollision doesn't immediately push it back.
  const DEPTH = ZOMBIE_RADIUS + 14;
  switch (door.side) {
    case "north": return { x: dc.x, y: dc.y - DEPTH * offsetDir };
    case "south": return { x: dc.x, y: dc.y + DEPTH * offsetDir };
    case "west":  return { x: dc.x - DEPTH * offsetDir, y: dc.y };
    case "east":  return { x: dc.x + DEPTH * offsetDir, y: dc.y };
    default:      return dc;
  }
}

// Returns true if the zombie is crossing through this door's threshold right now —
// i.e. it's within the door aperture laterally and very close to the wall line.
function isZombieCrossingDoor(zombie, building, door) {
  const dc = getDoorCenter(building, door);
  const hw = (door.width ?? 28) / 2;
  const THRESHOLD_DEPTH = ZOMBIE_RADIUS + 16;
  switch (door.side) {
    case "north":
    case "south":
      return Math.abs(zombie.x - dc.x) < hw && Math.abs(zombie.y - dc.y) < THRESHOLD_DEPTH;
    case "west":
    case "east":
      return Math.abs(zombie.y - dc.y) < hw && Math.abs(zombie.x - dc.x) < THRESHOLD_DEPTH;
    default:
      return false;
  }
}

// Resolve wall collision for a zombie, but skip segments belonging to a door the zombie
// is actively crossing through — prevents corner-push that causes mid-threshold stalls.
function resolveWallCollisionForZombie(zombie, building) {
  // Check if this zombie is mid-crossing through any open/broken door of this building.
  // If so, temporarily widen the aperture in the segment list by skipping its wall segs.
  const crossingDoor = (building.doors || []).find(
    d => (d.open || d.broken) && isZombieCrossingDoor(zombie, building, d)
  );
  if (crossingDoor) {
    // Zombie is threading the doorway — skip the full building collision this frame
    // so wall-edge segments can't snag it mid-crossing.
    return;
  }
  resolveWallCollision(zombie, building);
}

function getDoorRoutingWaypoint(zombie, targetX, targetY, buildings) {
  if (!buildings) return null;
  const zombieBuilding = buildings.find(b => isInsideBuilding(zombie, b));
  const targetBuilding = buildings.find(b =>
    targetX > b.x && targetX < b.x + b.w && targetY > b.y && targetY < b.y + b.h
  );

  // ── Last-exit building tracking ──────────────────────────────────────────
  // While inside a building, remember its id. Once outside, treat that building
  // as an obstacle so the zombie routes around it rather than straight back through
  // (the root cause of exit → immediate re-entry oscillation).
  if (zombieBuilding) {
    zombie._lastExitBldgId = zombieBuilding.id;
  } else if (zombie._lastExitBldgId) {
    const eb = buildings.find(b => b.id === zombie._lastExitBldgId);
    if (eb) {
      const clearDist = Math.sqrt(eb.w * eb.w + eb.h * eb.h) + 48;
      if (dist(zombie.x, zombie.y, eb.x + eb.w / 2, eb.y + eb.h / 2) > clearDist) {
        zombie._lastExitBldgId = null;
      }
    } else {
      zombie._lastExitBldgId = null;
    }
  }

  if (zombieBuilding && zombieBuilding !== targetBuilding) {
    const openDoors = (zombieBuilding.doors || []).filter(d => d.open || d.broken);
    if (openDoors.length === 0) {
      // All doors closed — pick the nearest door and aim for it so the zombie
      // approaches it for bashing rather than charging into the wall.
      let bestDoor = null, bestDist = Infinity;
      for (const door of (zombieBuilding.doors || [])) {
        const dc = getDoorCenter(zombieBuilding, door);
        const d = dist(zombie.x, zombie.y, dc.x, dc.y);
        if (d < bestDist) { bestDist = d; bestDoor = door; }
      }
      return bestDoor ? doorWaypoint(zombieBuilding, bestDoor, zombie, 1) : null;
    }
    let best = null, bestScore = Infinity;
    for (const door of openDoors) {
      const dc = getDoorCenter(zombieBuilding, door);
      const score = dist(zombie.x, zombie.y, dc.x, dc.y) * 0.4
                  + dist(dc.x, dc.y, targetX, targetY);
      if (score < bestScore) {
        bestScore = score;
        // offsetDir=1 pushes waypoint to the exterior face — zombie walks out through the door
        best = doorWaypoint(zombieBuilding, door, zombie, 1);
      }
    }
    return best;
  }

  if (targetBuilding && targetBuilding !== zombieBuilding) {
    const openDoors = (targetBuilding.doors || []).filter(d => d.open || d.broken);
    if (openDoors.length === 0) return null;
    let best = null, bestScore = Infinity;
    for (const door of openDoors) {
      const dc = getDoorCenter(targetBuilding, door);
      const score = dist(zombie.x, zombie.y, dc.x, dc.y);
      if (score < bestScore) {
        bestScore = score;
        // offsetDir=1 places waypoint on the exterior approach face
        best = doorWaypoint(targetBuilding, door, zombie, 1);
      }
    }
    return best;
  }

  // ── Post-exit building avoidance ────────────────────────────────────────
  // The zombie is outside, target is outside (or outside the last-exit building).
  // If a straight line to the target would pass through the last-exit building,
  // steer toward its nearest corner instead so the zombie walks around it.
  if (zombie._lastExitBldgId && zombie._lastExitBldgId !== targetBuilding?.id) {
    const eb = buildings.find(b => b.id === zombie._lastExitBldgId);
    if (eb) {
      // Quick segment-vs-padded-rect check (sample 20 points along the line)
      const PAD = (zombie.radius ?? ZOMBIE_RADIUS) + 6;
      const x0 = eb.x - PAD, y0 = eb.y - PAD, x1 = eb.x + eb.w + PAD, y1 = eb.y + eb.h + PAD;
      let lineBlocked = false;
      for (let i = 1; i < 20; i++) {
        const t = i / 20;
        const sx = zombie.x + (targetX - zombie.x) * t;
        const sy = zombie.y + (targetY - zombie.y) * t;
        if (sx > x0 && sx < x1 && sy > y0 && sy < y1) { lineBlocked = true; break; }
      }
      if (lineBlocked) {
        // Pick the corner of the last-exit building nearest the target
        const M = (zombie.radius ?? ZOMBIE_RADIUS) + 24;
        const corners = [
          { x: eb.x - M,          y: eb.y - M },
          { x: eb.x + eb.w + M,   y: eb.y - M },
          { x: eb.x - M,          y: eb.y + eb.h + M },
          { x: eb.x + eb.w + M,   y: eb.y + eb.h + M },
        ];
        let bestCorner = corners[0], bestCornerDist = Infinity;
        for (const c of corners) {
          const cd = dist(c.x, c.y, targetX, targetY);
          if (cd < bestCornerDist) { bestCornerDist = cd; bestCorner = c; }
        }
        return { x: bestCorner.x, y: bestCorner.y };
      }
    }
  }

  return null;
}
export function updateZombies(zombies, player, vehicle, dt, isNight, buildings, player2 = null, soundEvents = [], hamletCx = WORLD_W / 2, hamletCy = WORLD_H / 2, level = 1, turrets = [], vehicles = null) {
  const speed = isNight ? ZOMBIE_SPEED_NIGHT : ZOMBIE_SPEED_SLOW;

  // Authoritative positions: a driving player's x/y is synced to their vehicle, so we
  // use the player objects directly. (P1 may use the live vehicle position.)
  const px = player.inVehicle ? vehicle.x : player.x;
  const py = player.inVehicle ? vehicle.y : player.y;
  const p2x = player2 ? player2.x : px;
  const p2y = player2 ? player2.y : py;

  zombies.forEach(z => {
    if (z.dead) return;
    if (z.state === "dormant") return;

    z.speed = speed;
    if (z.attackCooldown > 0) z.attackCooldown -= dt;

    const dToP1 = dist(z.x, z.y, px, py);
    const dToP2 = player2 ? dist(z.x, z.y, p2x, p2y) : Infinity;
    const dNearest = Math.min(dToP1, dToP2);
    if (dNearest > ZOMBIE_CULL_DIST) {
      z.wanderTimer -= dt;
      if (z.wanderTimer <= 0) {
        z.wanderTimer = 3 + Math.random() * 4;
        z.targetX = z.x + (Math.random() - 0.5) * 300;
        z.targetY = z.y + (Math.random() - 0.5) * 300;
        z.targetX = Math.max(50, Math.min(WORLD_W - 50, z.targetX));
        z.targetY = Math.max(50, Math.min(WORLD_H - 50, z.targetY));
      }
      const wdx = z.targetX - z.x, wdy = z.targetY - z.y;
      const wlen = Math.sqrt(wdx*wdx + wdy*wdy);
      if (wlen > 1) {
        z.x += (wdx / wlen) * z.speed * 0.3 * dt;
        z.y += (wdy / wlen) * z.speed * 0.3 * dt;
      }
      return;
    }

    if (z.state === "chase_turret" || z.state === "attack_turret") {
      const t = turrets.find(tr => tr.id === z._turretTargetId && !tr.destroyed);
      if (!t) {
        z.state = "wander"; z._turretTargetId = null;
      } else {
        const dToTurret = dist(z.x, z.y, t.x, t.y);
        const attackDist = z.radius + t.radius + TURRET_ZOMBIE_ATTACK_RANGE;

        const { targetX: px, targetY: py } = getNearestTarget(z, player, player2, vehicle);
        const dToPlayer = dist(z.x, z.y, px, py);
        if (dToPlayer < ZOMBIE_SIGHT_RANGE) {
          z.state = "alert"; z.alertTimer = 0.3; z._turretTargetId = null;
          return;
        }

        if (dToTurret <= attackDist) {
          z.state = "attack_turret";
        } else {
          z.state = "chase_turret";
          moveToward(z, t.x, t.y, z.speed, dt);
          if (buildings) for (const b of buildings) resolveWallCollision(z, b);
        }
      }
      return;
    }

    const { targetX, targetY, targetPlayer, inVehicle: targetInVehicle } =
      getNearestTarget(z, player, player2, vehicle);
    const dToPlayer = dist(z.x, z.y, targetX, targetY);

    const wallOccluded = buildings ? isPlayerOccludedByWalls(z, targetPlayer, buildings) : false;
    const bossRange    = z.type === "boss" ? Infinity : ZOMBIE_SIGHT_RANGE;
    const canSee  = !wallOccluded && dToPlayer < bossRange;
    const canHear = (targetInVehicle && dToPlayer < ZOMBIE_SOUND_RANGE)
                 || (buildings ? canHearThroughDoor(z, targetPlayer, buildings) : false)
                 || z.type === "boss";

    const soundPull = getSoundPull(z.x, z.y, soundEvents, hamletCx, hamletCy, level);

    switch (z.state) {
      case "wander": {
        if (canSee || canHear) { z.state = "alert"; z.alertTimer = 0.4; }
        else if (soundPull.mag > 0.05) {
          const nearTurret = turrets.find(t =>
            !t.destroyed &&
            dist(z.x, z.y, t.x, t.y) < TURRET_ZOMBIE_AGGRO_RANGE &&
            soundEvents.some(ev => ev.type === "turret" && dist(ev.x, ev.y, t.x, t.y) < 20)
          );
          if (nearTurret && dist(z.x, z.y, nearTurret.x, nearTurret.y) < TURRET_ZOMBIE_AGGRO_RANGE) {
            z.state = "chase_turret";
            z._turretTargetId = nearTurret.id;
            return;
          }
          z.x += soundPull.dx * SOUND_DRIFT_SPEED * dt;
          z.y += soundPull.dy * SOUND_DRIFT_SPEED * dt;
          z.facing = Math.atan2(soundPull.dy, soundPull.dx);
          if (buildings) for (const b of buildings) resolveWallCollisionForZombie(z, b);
          z.wanderTimer = 2 + Math.random() * 2;
          z.targetX = z.x + soundPull.dx * 200;
          z.targetY = z.y + soundPull.dy * 200;
        } else {
          z.wanderTimer -= dt;
          if (z.wanderTimer <= 0) {
            z.targetX = z.x + (Math.random() - 0.5) * 250;
            z.targetY = z.y + (Math.random() - 0.5) * 250;
            z.wanderTimer = 2 + Math.random() * 4;
          }
          moveToward(z, z.targetX, z.targetY, z.speed * 0.4, dt);
          if (buildings) for (const b of buildings) resolveWallCollisionForZombie(z, b);
        }
        break;
      }
      case "alert": {
        z.alertTimer -= dt;
        if (z.alertTimer <= 0) z.state = "chase";
        break;
      }
      case "chase": {
        if (!canSee && !canHear) {
          if (z._neverGiveUp) { z.giveUpTimer = 0; }
          else {
            z.giveUpTimer += dt;
            if (z.giveUpTimer >= ZOMBIE_GIVE_UP_TIME) { z.state = "wander"; z.giveUpTimer = 0; }
          }
        } else { z.giveUpTimer = 0; }

        const attackDist = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 2;
        if (!wallOccluded && dToPlayer < attackDist) { z.state = "attack"; break; }

        const shouldConsiderBash = buildings
          && (canSee || canHear)
          && wallOccluded
          && dToPlayer > attackDist * 1.2;

        if (shouldConsiderBash) {
          const blockedDoor = findBlockingDoor(z, targetX, targetY, buildings);
          if (blockedDoor) {
            z.state = "bash_door";
            z._bashDoorId      = blockedDoor.door.id;
            z._bashBuildingId  = blockedDoor.building.id;
            z._bashGiveUp      = ZOMBIE_GIVE_UP_TIME;
            break;
          }
        }

        const waypoint = buildings
          ? getDoorRoutingWaypoint(z, targetX, targetY, buildings)
          : null;

        const moveTargetX = waypoint?.x ?? targetX;
        const moveTargetY = waypoint?.y ?? targetY;

        moveToward(z, moveTargetX, moveTargetY, z.speed, dt);
        if (buildings) for (const b of buildings) resolveWallCollisionForZombie(z, b);
        break;
      }
      case "bash_door": {
        const attackDistBash = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 4;
        // Check if the door was broken/opened first — if so, resume chasing.
        const doorStillBlocking = buildings && isDoorStillBlocking(z, buildings);
        if (!doorStillBlocking) {
          z.state = "chase"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        // Only allow switching to attack when the wall is no longer occluding
        // AND the door is already gone (checked above). If wall still blocks,
        // keep bashing even if the zombie somehow got line-of-sight.
        if (!wallOccluded && dToPlayer < attackDistBash * 2.0) {
          z.state = "attack"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        if (!wallOccluded && (canSee || canHear)) {
          z.state = "chase"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        if (canSee || canHear) {
          z._bashGiveUp = ZOMBIE_GIVE_UP_TIME;
        } else {
          z._bashGiveUp = (z._bashGiveUp ?? ZOMBIE_GIVE_UP_TIME) - dt;
          if (z._bashGiveUp <= 0) {
            z.state = "wander"; z._bashDoorId = null; z._bashBuildingId = null; break;
          }
        }
        if (buildings) {
          const b = buildings.find(b2 => b2.id === z._bashBuildingId);
          const door = b?.doors?.find(d => d.id === z._bashDoorId);
          if (b && door) {
            const dc = getDoorCenter(b, door);
            const dToDoor = dist(z.x, z.y, dc.x, dc.y);
            if (dToDoor > DOOR_BASH_RANGE) {
              // Approach from the exterior face of the door so wall-collision
              // geometry doesn't push the zombie back every frame (stuck loop).
              const wp = doorWaypoint(b, door, z, 1);
              moveToward(z, wp.x, wp.y, z.speed, dt);
              for (const bld of buildings) resolveWallCollisionForZombie(z, bld);
            }
          }
        }
        break;
      }
      case "attack": {
        const attackDist = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 4;
        if (dToPlayer > attackDist * 1.5 || wallOccluded) { z.state = "chase"; break; }
        if (z.attackCooldown <= 0) {
          z.attackCooldown = 1 / ZOMBIE_ATTACK_RATE;
          z._dealDamage = true;
          // p2 in vehicle → damage their vehicle; p2 on foot → damage p2; p1 in vehicle → vehicle; p1 on foot → p1
          z._damageTarget = targetPlayer === player2
            ? (targetInVehicle ? "p2_vehicle" : "p2")
            : (targetInVehicle ? "vehicle" : "p1");
        }
        break;
      }
    }
  });

  // Separate active (non-culled) zombies from each other so they don't stack.
  // Filtering to the active subset avoids an O(n²) pass over the entire world
  // population (thousands of zombies) every single frame.
  const px2 = player.inVehicle ? vehicle.x : player.x;
  const py2 = player.inVehicle ? vehicle.y : player.y;
  const cullSq = ZOMBIE_CULL_DIST * ZOMBIE_CULL_DIST;
  const activeZombies = zombies.filter(z => {
    if (z.dead || z.state === "dormant") return false;
    const dxA = z.x - px2, dyA = z.y - py2;
    if (dxA * dxA + dyA * dyA <= cullSq) return true;
    if (!player2) return false;
    const dxB = z.x - player2.x, dyB = z.y - player2.y;
    return dxB * dxB + dyB * dyB <= cullSq;
  });
  separateEntityLists(activeZombies, activeZombies);
}
function findBlockingDoor(zombie, targetX, targetY, buildings) {
  // Only consider doors that block the zombie's path FROM OUTSIDE.
  // If the zombie is already inside the building that owns the door, that
  // door isn't blocking its exit — it should use getDoorRoutingWaypoint instead.
  const zombieBuilding = buildings.find(b => isInsideBuilding(zombie, b));
  for (const b of buildings) {
    if (!b.doors) continue;
    // Skip doors on the building the zombie is currently inside.
    if (zombieBuilding && zombieBuilding.id === b.id) continue;
    for (const door of b.doors) {
      if (door.open || door.broken) continue;
      if (b.barricadeHp > 0) continue;
      const dc = getDoorCenter(b, door);
      const dToDoor = dist(zombie.x, zombie.y, dc.x, dc.y);
      if (dToDoor > DOOR_BASH_RANGE * 2.5) continue;
      const toTarget = { x: targetX - zombie.x, y: targetY - zombie.y };
      const toDoor   = { x: dc.x - zombie.x,    y: dc.y - zombie.y };
      const dot = toTarget.x * toDoor.x + toTarget.y * toDoor.y;
      // Require the door to be clearly in the direction of the target (dot > 0)
      if (dot <= 0) continue;
      return { building: b, door };
    }
  }
  return null;
}
function isDoorStillBlocking(zombie, buildings) {
  const b = buildings.find(b2 => b2.id === zombie._bashBuildingId);
  if (!b) return false;
  const door = b.doors?.find(d => d.id === zombie._bashDoorId);
  if (!door) return false;
  return !door.open && !door.broken;
}
function moveToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x, dy = ty - entity.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return;
  entity.x += (dx / d) * speed * dt;
  entity.y += (dy / d) * speed * dt;
  entity.facing = Math.atan2(dy, dx);
}

/**
 * Resolve overlap between two lists of entities (or the same list against itself).
 * Each entity needs { x, y, radius }. Pushes both apart so they don't overlap.
 * Uses a cheap axis-aligned early-out and squared-distance check so Math.sqrt
 * is only called for pairs that are actually overlapping.
 */
export function separateEntityLists(listA, listB) {
  const sameList = listA === listB;
  for (let i = 0; i < listA.length; i++) {
    const a = listA[i];
    if (a.dead) continue;
    const ra = a.radius ?? ZOMBIE_RADIUS;
    const start = sameList ? i + 1 : 0;
    for (let j = start; j < listB.length; j++) {
      const b = listB[j];
      if (b.dead) continue;
      const minDist = ra + (b.radius ?? ZOMBIE_RADIUS);
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      // Cheap axis-aligned reject before doing any multiply
      if (dx > minDist || dx < -minDist || dy > minDist || dy < -minDist) continue;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist) continue;
      let d = Math.sqrt(distSq);
      if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 0.5; }
      const push = (minDist - d) * 0.5;
      const nx = (dx / d) * push;
      const ny = (dy / d) * push;
      a.x += nx; a.y += ny;
      b.x -= nx; b.y -= ny;
    }
  }
}
export function applyZombieDamage(zombies, player, vehicle, buildings, player2 = null, vehicles = null) {
  let playerDmg = 0, vehicleDmg = 0, p2Dmg = 0;
  const allVehicles = vehicles ?? [vehicle];

  // The vehicle p2 is occupying (if any). May be null if occupancy hasn't synced —
  // in that case p2-in-vehicle hits fall back to damaging p2 directly, NEVER P1's car.
  const p2Vehicle = player2?.inVehicle
    ? (allVehicles.find(v => v.driver === "p2" || v.passenger === "p2") ?? null)
    : null;
  const p2VehicleDmgMap = new Map();

  zombies.forEach(z => {
    if (!z._dealDamage || z.dead) return;
    z._dealDamage = false;
    const target = z._damageTarget ?? (player.inVehicle ? "vehicle" : "p1");

    // Resolve the world position of the target for the wall-separation check.
    // Use the player object's own coords (authoritative, synced to vehicle when driving).
    let tx, ty;
    if (target === "p2" || target === "p2_vehicle") {
      tx = player2?.x ?? player.x; ty = player2?.y ?? player.y;
    } else if (target === "vehicle") {
      tx = vehicle.x; ty = vehicle.y;
    } else {
      tx = player.x; ty = player.y;
    }

    if (buildings && areWallSeparated(z.x, z.y, tx, ty, buildings)) return;
    const dmg = z.type === "boss" ? BOSS_DAMAGE : ZOMBIE_ATTACK_DAMAGE;

    if (target === "vehicle") {
      vehicleDmg += vehicle.zombieKill ? 0 : dmg * 1.5;
    } else if (target === "p2_vehicle") {
      if (p2Vehicle) {
        // Damage p2's actual vehicle (unless it's a zombie-killer like the monster truck).
        if (!p2Vehicle.zombieKill) {
          p2VehicleDmgMap.set(p2Vehicle.id, (p2VehicleDmgMap.get(p2Vehicle.id) ?? 0) + dmg * 1.5);
        }
      } else {
        // No occupied vehicle resolved — fall back to damaging p2 directly.
        p2Dmg += dmg;
      }
    } else if (target === "p2") {
      p2Dmg += dmg;
    } else {
      playerDmg += dmg;
    }

    // Record damage for death recap
    if (target === "p1" && dmg > 0) {
      player.deathRecap?.recordDamage(z.type === "boss" ? "Boss Zombie" : z.type === "brute" ? "Brute Zombie" : "Zombie", dmg, "melee", player.hp - playerDmg);
    }
  });

  player.hp  = Math.max(0, player.hp  - playerDmg);
  vehicle.hp = Math.max(0, vehicle.hp - vehicleDmg);
  if (player2 && p2Dmg > 0) player2.hp = Math.max(0, player2.hp - p2Dmg);

  // Damage to the vehicle p2 was occupying. We apply it locally (host's mirror of
  // p2's vehicle) AND report it separately so the caller can forward it to P2's
  // client, which is authoritative over that vehicle's HP.
  let p2VehicleDmg = 0, p2VehicleId = null;
  for (const [vid, dmg] of p2VehicleDmgMap) {
    const v = allVehicles.find(v2 => v2.id === vid);
    if (v) v.hp = Math.max(0, v.hp - dmg);
    p2VehicleDmg += dmg;
    p2VehicleId = vid;
  }

  return { playerDmg, vehicleDmg, p2Dmg, p2VehicleDmg, p2VehicleId };
}
export function updateVehicleCollisions(vehicle, zombies, dt, buildings) {
  if (!vehicle.occupied) return;

  zombies.forEach(z => {
    if (z._vhitCooldown > 0) z._vhitCooldown -= dt;
  });

  let totalBounceX = 0, totalBounceY = 0, hitCount = 0;

  zombies.forEach(z => {
    if (z.dead) return;
    const d = dist(vehicle.x, vehicle.y, z.x, z.y);
    if (d < VEHICLE_RADIUS + z.radius) {
      if (buildings && areWallSeparated(vehicle.x, vehicle.y, z.x, z.y, buildings)) return;
      const ang = Math.atan2(z.y - vehicle.y, z.x - vehicle.x);

      if ((z._vhitCooldown ?? 0) <= 0) {
        if (vehicle.zombieKill) {
          z.hp = 0; z.dead = true;
        } else {
          z.hp -= 40;
          if (z.hp <= 0) z.dead = true;
        }
        z._vhitCooldown = 0.4;
      }

      z.x += Math.cos(ang) * 30; z.y += Math.sin(ang) * 30;

      if (!vehicle.zombieKill) {
        totalBounceX += -Math.cos(ang);
        totalBounceY += -Math.sin(ang);
        hitCount++;
      }
    }
  });

  if (hitCount > 0) {
    const blen = Math.sqrt(totalBounceX * totalBounceX + totalBounceY * totalBounceY);
    if (blen > 0) {
      const BOUNCE_SPEED = 220;
      vehicle.bounceVx = (vehicle.bounceVx ?? 0) + (totalBounceX / blen) * BOUNCE_SPEED;
      vehicle.bounceVy = (vehicle.bounceVy ?? 0) + (totalBounceY / blen) * BOUNCE_SPEED;
    }
  }
}

// ─── Player attack ────────────────────────────────────────────────────────────
export function updateNightSpawns(state, dt) {
  if (!state.isNight) return;
  state.nightSpawnTimer -= dt;
  if (state.nightSpawnTimer > 0) return;

  const diff = getNightDifficulty(state.dayNumber);
  const isL1 = (state.level ?? 1) === 1;
  
  state.nightSpawnTimer = isL1
    ? Math.max(2, 5 - (state.dayNumber * 0.2) / diff.spawnRate)
    : Math.max(3, 8 - (state.dayNumber * 0.15) / diff.spawnRate);
  
  let spawnCount = isL1 ? Math.floor(1 + diff.spawnRate * 0.5) : Math.floor(diff.spawnRate * 0.8);
  spawnCount = Math.min(5, Math.max(1, spawnCount));

  for (let s = 0; s < spawnCount; s++) {
    let sx, sy;
    if (isL1) {
      const angle = Math.random() * Math.PI * 2;
      const r = 600 + Math.random() * 800;
      sx = Math.max(10, Math.min(WORLD_W - 10, state.hamletCx + Math.cos(angle) * r));
      sy = Math.max(10, Math.min(WORLD_H - 10, state.hamletCy + Math.sin(angle) * r));
    } else {
      const edge = Math.floor(Math.random() * 4);
      const rand = Math.random;
      if (edge === 0)      { sx = rand() * WORLD_W; sy = 10; }
      else if (edge === 1) { sx = WORLD_W - 10;     sy = rand() * WORLD_H; }
      else if (edge === 2) { sx = rand() * WORLD_W; sy = WORLD_H - 10; }
      else                 { sx = 10;               sy = rand() * WORLD_H; }
    }
    
    let zombieType = "walker";
    if (diff.specialChance > Math.random()) {
      zombieType = Math.random() > 0.6 ? "brute" : "runner";
    }
    state.zombies.push(createZombie(Date.now() + Math.random() + s, sx, sy, zombieType));
  }
}

// ─── Turrets ──────────────────────────────────────────────────────────────────