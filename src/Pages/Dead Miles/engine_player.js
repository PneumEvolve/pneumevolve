// engine_player.js — split from deadMilesEngine.js (pure functions, no React)

import { BARRICADE_COST_NAILS, BARRICADE_COST_WOOD, BARRICADE_HP, BARRICADE_ZOMBIE_DAMAGE, CONVOY_CRUMB_SPACING, CONVOY_EJECT_RANGE, CONVOY_GAP_FAR, CONVOY_GAP_NEAR, CONVOY_SPEED_BASE, CONVOY_SPEED_CATCH_UP, CONVOY_SPEED_SLOW, CROP_TYPES, DOOR_BASH_DAMAGE, DOOR_INTERACT_RANGE, DOOR_MAX_HP, IN_GAME_DAY_SECS, LOOT_RANGE, MELEE_ARC, MELEE_DAMAGE, MELEE_RANGE, MELEE_RATE, NEEDS_TUNE, PLAYER_MAX_HP, PLAYER_RADIUS, PLAYER_SPEED_BASE, PLAYER_SPEED_TIRED, REPAIR_HP_GAIN, REPAIR_RANGE, SEARCH_RANGE, SLEEP_QUALITY, TURRET_COST, TURRET_REPAIR_COST_SCRAP, TURRET_REPAIR_HP, TURRET_REPAIR_RANGE, TURRET_ZOMBIE_ATTACK_RANGE, TURRET_ZOMBIE_DAMAGE, VEHICLE_RADIUS, WORLD_H, WORLD_W, ZOMBIE_ATTACK_RATE, ZOMBIE_RADIUS } from "./engine_constants";
import { getSeasonalBonus } from "./engine_systems";
import { areWallSeparated, dist, getDoorCenter, isInsideBuilding, resolveWallCollision } from "./engine_geometry";
import { createBossZombie, createCrop, createSurvivor, createTurret } from "./engine_entities";
import { createSoundEvent } from "./engine_zombies";

export function updateNeeds(player, dt, isSleeping, sleepLocation) {
  const tune = NEEDS_TUNE;
  if (!isSleeping) {
    player.food  = Math.max(0, player.food  - tune.food.drainPerSec  * dt);
    player.water = Math.max(0, player.water - tune.water.drainPerSec * dt);
  }
  const sleepFactor = isSleeping ? -(SLEEP_QUALITY[sleepLocation ?? "exposed"]) : 1.0;
  player.sleep = Math.max(0, Math.min(100, player.sleep - tune.sleep.drainPerSec * sleepFactor * dt));

  player.debuffs = [];
  if (player.food  <= tune.food.critAt)  player.debuffs.push("starving");
  else if (player.food  <= tune.food.warnAt)  player.debuffs.push("hungry");
  if (player.water <= tune.water.critAt) player.debuffs.push("dehydrated");
  else if (player.water <= tune.water.warnAt) player.debuffs.push("thirsty");
  if (player.sleep <= tune.sleep.critAt) player.debuffs.push("exhausted");
  else if (player.sleep <= tune.sleep.warnAt) player.debuffs.push("tired");

  // ── Health regeneration — HP regens toward the lowest need value ───────────
  // e.g. all needs at 100 → HP regens to 100; water at 20 → HP cap is 20
  // Only regens when player is alive and has no active debuffs (hungry/thirsty/exhausted)
  if (player.hp > 0) {
    const HP_REGEN_RATE = 1.5; // hp per second
    const lowestNeed = Math.min(player.food, player.water, player.sleep);
    // Require all needs above the crit threshold before any regen kicks in
    const canRegen = player.food > NEEDS_TUNE.food.critAt
                  && player.water > NEEDS_TUNE.water.critAt
                  && player.sleep > NEEDS_TUNE.sleep.critAt;
    if (canRegen) {
      const hpCap = Math.min(player.maxHp ?? PLAYER_MAX_HP, lowestNeed);
      if (player.hp < hpCap) {
        const rate = isSleeping ? HP_REGEN_RATE * 2.5 : HP_REGEN_RATE;
        player.hp = Math.min(hpCap, player.hp + rate * dt);
      }
    }
  }

  return player.sleep <= 0 || player.food <= 0 || player.water <= 0;
}

// ─── Movement ─────────────────────────────────────────────────────────────────
export function movePlayer(player, dx, dy, dt, buildings) {
  if (player.isSleeping) return;
  let speed = PLAYER_SPEED_BASE;
  if (player.debuffs.includes("exhausted")) speed = PLAYER_SPEED_TIRED;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len, ny = dy / len;
  
  // Move in smaller steps to prevent tunneling
  const stepCount = Math.max(1, Math.ceil(Math.abs(speed * dt) / 5));
  const stepDt = dt / stepCount;
  
  for (let step = 0; step < stepCount; step++) {
    const newX = player.x + nx * speed * stepDt;
    const newY = player.y + ny * speed * stepDt;
    
    // Apply world bounds
    player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, newX));
    player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, newY));
    player.facing = Math.atan2(ny, nx);
    
    if (buildings) {
      for (const b of buildings) {
        resolveWallCollision(player, b);
      }
    }
  }
  
  // No final validation - players should be able to be inside buildings
  // (that's where loot and survivors are)
}
export function driveVehicle(vehicle, dx, dy, dt, buildings) {
  if (vehicle.hp <= 0) return;
  
  // Store original position for potential rollback
  const origX = vehicle.x;
  const origY = vehicle.y;
  
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    const nx = dx / len, ny = dy / len;
    
    // Move in smaller steps for vehicles too
    const speed = vehicle.speed;
    const stepCount = Math.max(1, Math.ceil(Math.abs(speed * dt) / 10));
    const stepDt = dt / stepCount;
    
    for (let step = 0; step < stepCount; step++) {
      const newX = vehicle.x + nx * speed * stepDt;
      const newY = vehicle.y + ny * speed * stepDt;
      
      // Apply bounds
      vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, newX));
      vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, newY));
      vehicle.facing = Math.atan2(ny, nx);
      vehicle.fuel = Math.max(0, vehicle.fuel - 0.4 * stepDt);
      
      if (buildings) {
        for (const b of buildings) {
          resolveWallCollision(vehicle, b);
        }
      }
    }
  }

  if (vehicle.bounceVx || vehicle.bounceVy) {
    vehicle.x += (vehicle.bounceVx ?? 0) * dt;
    vehicle.y += (vehicle.bounceVy ?? 0) * dt;
    const decay = Math.max(0, 1 - 8 * dt);
    vehicle.bounceVx = (vehicle.bounceVx ?? 0) * decay;
    vehicle.bounceVy = (vehicle.bounceVy ?? 0) * decay;
    if (Math.abs(vehicle.bounceVx) < 1 && Math.abs(vehicle.bounceVy) < 1) {
      vehicle.bounceVx = 0; vehicle.bounceVy = 0;
    }
    
    // Re-apply collision after bounce
    if (buildings) {
      for (const b of buildings) resolveWallCollision(vehicle, b);
    }
  }

  // Final bounds and collision pass
  vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, vehicle.x));
  vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, vehicle.y));
  if (buildings) {
    for (const b of buildings) resolveWallCollision(vehicle, b);
  }
  
  // If the vehicle got stuck inside a building, try to unstuck it
  if (buildings) {
    let stuck = false;
    for (const b of buildings) {
      if (isInsideBuilding(vehicle, b)) {
        stuck = true;
        break;
      }
    }
    
    if (stuck) {
      // Try to find a safe direction to exit
      const directions = [
        [VEHICLE_RADIUS + 10, 0], [-VEHICLE_RADIUS - 10, 0],
        [0, VEHICLE_RADIUS + 10], [0, -VEHICLE_RADIUS - 10],
        [VEHICLE_RADIUS + 20, VEHICLE_RADIUS + 20],
        [-VEHICLE_RADIUS - 20, VEHICLE_RADIUS + 20],
        [VEHICLE_RADIUS + 20, -VEHICLE_RADIUS - 20],
        [-VEHICLE_RADIUS - 20, -VEHICLE_RADIUS - 20]
      ];
      
      for (const [offX, offY] of directions) {
        const testX = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, origX + offX));
        const testY = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, origY + offY));
        
        let safe = true;
        for (const b of buildings) {
          if (isInsideBuilding({ x: testX, y: testY, radius: VEHICLE_RADIUS }, b)) {
            safe = false;
            break;
          }
        }
        
        if (safe) {
          vehicle.x = testX;
          vehicle.y = testY;
          // Add a bounce effect to feel like you hit something
          vehicle.bounceVx = (vehicle.bounceVx ?? 0) + (offX > 0 ? -150 : offX < 0 ? 150 : 0);
          vehicle.bounceVy = (vehicle.bounceVy ?? 0) + (offY > 0 ? -150 : offY < 0 ? 150 : 0);
          break;
        }
      }
    }
  }
}
export function syncPlayerToVehicle(player, vehicle) {
  player.x = vehicle.x; player.y = vehicle.y;
}

// ─── Vehicle exit with safety check ───────────────────────────────────────────
export function exitVehicle(player, vehicle, role, buildings = []) {
  player.inVehicle = false;
  if (vehicle.driver === role) {
    vehicle.driver = null;
    vehicle.occupied = vehicle.passenger !== null;
  } else if (vehicle.passenger === role) {
    vehicle.passenger = null;
    vehicle.occupied = vehicle.driver !== null;
  }
  
  // Find safe exit point
  let exitX = vehicle.x + VEHICLE_RADIUS + PLAYER_RADIUS + 6;
  let exitY = vehicle.y;
  
  const exitAttempts = [
    [VEHICLE_RADIUS + PLAYER_RADIUS + 6, 0],
    [-(VEHICLE_RADIUS + PLAYER_RADIUS + 6), 0],
    [0, VEHICLE_RADIUS + PLAYER_RADIUS + 6],
    [0, -(VEHICLE_RADIUS + PLAYER_RADIUS + 6)],
    [VEHICLE_RADIUS + PLAYER_RADIUS + 20, VEHICLE_RADIUS + PLAYER_RADIUS + 20],
    [-(VEHICLE_RADIUS + PLAYER_RADIUS + 20), VEHICLE_RADIUS + PLAYER_RADIUS + 20],
  ];
  
  for (const [dx, dy] of exitAttempts) {
    const testX = vehicle.x + dx;
    const testY = vehicle.y + dy;
    let safe = true;
    
    for (const b of buildings) {
      if (isInsideBuilding({ x: testX, y: testY, radius: PLAYER_RADIUS }, b)) {
        safe = false;
        break;
      }
    }
    
    if (safe) {
      exitX = testX;
      exitY = testY;
      break;
    }
  }
  
  exitX = Math.max(PLAYER_RADIUS + 5, Math.min(WORLD_W - PLAYER_RADIUS - 5, exitX));
  exitY = Math.max(PLAYER_RADIUS + 5, Math.min(WORLD_H - PLAYER_RADIUS - 5, exitY));
  
  player.x = exitX;
  player.y = exitY;
}
export function tryEnterVehicle(player, vehicle, role) {
  if (dist(player.x, player.y, vehicle.x, vehicle.y) > 60) return false;
  if (!vehicle.driver) {
    vehicle.driver = role ?? "p1";
    vehicle.occupied = true;
    player.inVehicle = true;
    return "driver";
  }
  if (!vehicle.passenger) {
    vehicle.passenger = role ?? "p2";
    player.inVehicle = true;
    return "passenger";
  }
  return false;
}

// ─── Door open/close ──────────────────────────────────────────────────────────
export function tryToggleDoor(player, buildings) {
  if (player.inVehicle) return null;
  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      const c = getDoorCenter(b, door);
      if (dist(player.x, player.y, c.x, c.y) < DOOR_INTERACT_RANGE) {
        door.open = !door.open;
        return { building: b, door };
      }
    }
  }
  return null;
}

// ─── Zombie AI ────────────────────────────────────────────────────────────────
export function playerAttack(player, zombies, dt) {
  if (player.inVehicle || !player.weapon) return [];
  if (player.attackCooldown > 0) { player.attackCooldown -= dt; return []; }

  // Always set cooldown on any swing attempt (no free spam when no zombie is near)
  player.attackCooldown = 1 / MELEE_RATE;

  // Kick off the visual arc sweep
  player.swingAngle  = player.facing - MELEE_ARC / 2;
  player.swingTarget = player.facing + MELEE_ARC / 2;
  player.swingTimer  = 1 / MELEE_RATE; // lasts the full cooldown window

  const hits = [];
  zombies.forEach(z => {
    if (z.dead) return;
    const d = dist(player.x, player.y, z.x, z.y);
    if (d >= MELEE_RANGE + z.radius) return;

    // Cone check — is zombie within the swing arc?
    const angleToZ = Math.atan2(z.y - player.y, z.x - player.x);
    let diff = angleToZ - player.facing;
    // Normalise to [-π, π]
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > MELEE_ARC / 2) return;

    z.hp -= MELEE_DAMAGE;
    if (z.hp <= 0) { z.dead = true; player.deathRecap?.recordKill(); }
    hits.push(z.id);
  });

  return hits;
}

// ─── Loot interaction ─────────────────────────────────────────────────────────
export function tryCollectLoot(player, lootPiles, vehicle) {
  if (player.inVehicle) return null;
  for (const pile of lootPiles) {
    if (pile.collected) continue;
    if (dist(player.x, player.y, pile.x, pile.y) > LOOT_RANGE) continue;

    const gained = [];
    const fuelGained = { qty: 0 };

    pile.items.forEach(item => {
      if (item.type === "fuel" && vehicle) {
        const toAdd = Math.min(item.qty * 25, vehicle.maxFuel - vehicle.fuel);
        vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + item.qty * 25);
        fuelGained.qty += item.qty * 25;
        gained.push({ ...item, autoFueled: true });
        return;
      }
      addToInventory(player.inventory, item.type, item.qty);
      gained.push(item);
      if (item.type === "bat" && !player.weapon) {
        player.weapon = "bat";
        removeFromInventory(player.inventory, "bat", 1);
      }
    });

    pile.collected = true;
    return { pile, gained, fuelGained: fuelGained.qty };
  }
  return null;
}

// ─── Building search (survivor discovery only) ────────────────────────────────
export function tryDiscoverSurvivor(player, buildings, survivors, lootPiles) {
  if (player.inVehicle) return null;
  for (const b of buildings) {
    if (!b.hiddenSurvivor) continue;
    if (!isInsideBuilding(player, b)) continue;
    const lootPile = lootPiles.find(p => p.buildingId === b.id);
    if (!lootPile?.collected) continue;
    if (survivors.some(s => s.origin === b.id)) continue;

    const names = ["Marcus", "Jen", "Dale", "Rosa", "Tony", "Beth"];
    const roles = ["mechanic", "farmer", "scavenger", "gunner"];
    const name = names[Math.floor(Math.random() * names.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const survivor = createSurvivor(`s_${b.id}`, b.x + b.w / 2, b.y + b.h / 2, name, role);
    survivor.origin = b.id;
    return { building: b, survivor };
  }
  return null;
}

// ─── Proximity context (for HUD prompts) ─────────────────────────────────────
export function getProximityActions(player, buildings, vehicle, gardenPlots, crops, lootPiles, wells, turrets = []) {
  const actions = [];

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < 70)
    actions.push({ key: "F", label: vehicle.occupied ? "Vehicle occupied" : "Enter vehicle" });
  if (player.inVehicle)
    actions.push({ key: "F", label: "Exit vehicle" });

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < REPAIR_RANGE) {
    const parts = getInventoryCount(player.inventory, "car_parts");
    if (parts > 0 && vehicle.hp < vehicle.maxHp) {
      actions.push({ key: "E", label: `Repair vehicle (+${REPAIR_HP_GAIN} HP) [${parts} parts]` });
    }
  }

  if (player.inVehicle) return actions;

  for (const t of turrets) {
    if (t.destroyed) continue;
    if (t.hp >= t.maxHp) continue;
    if (dist(player.x, player.y, t.x, t.y) > TURRET_REPAIR_RANGE) continue;
    const scrap = getInventoryCount(player.inventory, "scrap");
    actions.push({ key: "H", label: `Repair turret — ${TURRET_REPAIR_COST_SCRAP} scrap, 2.5s cast [${scrap} have]` });
    break;
  }

  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      const c = getDoorCenter(b, door);
      if (dist(player.x, player.y, c.x, c.y) < DOOR_INTERACT_RANGE) {
        actions.push({ key: "F", label: door.open ? `Close door` : `Open door` });
      }
    }
  }

  for (const pile of lootPiles) {
    if (pile.collected) continue;
    if (dist(player.x, player.y, pile.x, pile.y) > LOOT_RANGE) continue;
    const names = pile.items.map(i => `${i.qty}× ${i.type}`).join(", ");
    actions.push({ key: "F", label: "Loot" });
  }

  for (const b of buildings) {
    if (!b.barricadeable || b.barricadeHp > 0) continue;
    const nearDoor = (b.doors || []).some(d => {
      const c = getDoorCenter(b, d);
      return dist(player.x, player.y, c.x, c.y) < SEARCH_RANGE;
    });
    if (nearDoor || isInsideBuilding(player, b))
      actions.push({ key: "B", label: `Barricade ${b.label} (3s)` });
  }

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < REPAIR_RANGE) {
    const fuel = getInventoryCount(player.inventory, "fuel");
    if (fuel > 0 && vehicle.fuel < vehicle.maxFuel) {
      actions.push({ key: "R", label: `Refuel vehicle (+30 ⛽) [${fuel} cans]` });
    }
  }

  if (wells) {
    for (const w of wells) {
      if (dist(player.x, player.y, w.x, w.y) < 60)
        actions.push({ key: "F", label: "Drink from well" });
    }
  }
  for (const b of buildings) {
    if (b.hasWell && dist(player.x, player.y, b.x + b.w / 2, b.y + b.h / 2) < 80)
      actions.push({ key: "F", label: "Drink from well" });
  }

  const readyCrop = crops.find(c => {
    if (c.stage !== "ready") return false;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    return plot && dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) < 60;
  });
  if (readyCrop) actions.push({ key: "F", label: "Harvest crops (2s)" });

  const emptyPlot = gardenPlots.find(p =>
    !crops.some(c => c.plotId === p.id) &&
    dist(player.x, player.y, p.x + p.w / 2, p.y + p.h / 2) < 60
  );
  if (emptyPlot) actions.push({ key: "F", label: "Plant crops (2.5s)" });

  for (const b of buildings) {
    if (isInsideBuilding(player, b))
      actions.push({ key: "Z", label: player.isSleeping ? "Wake up" : "Sleep here" });
  }

  if (player.weapon) actions.push({ key: "Space", label: `Attack (${player.weapon})` });

  const seen = new Set();
  return actions.filter(a => {
    const k = a.key + a.label;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ─── Barricade ────────────────────────────────────────────────────────────────
export function tryBarricade(player, buildings) {
  if (player.inVehicle) return null;
  const wood  = getInventoryCount(player.inventory, "wood");
  const nails = getInventoryCount(player.inventory, "nails");

  for (const b of buildings) {
    if (!b.barricadeable || b.barricadeHp > 0) continue;
    const nearDoor = (b.doors || []).some(d => {
      const c = getDoorCenter(b, d);
      return dist(player.x, player.y, c.x, c.y) < SEARCH_RANGE;
    });
    if (!nearDoor && !isInsideBuilding(player, b)) continue;

    const actualDoors = b.barricadeDoors ?? 1;
    const costW = BARRICADE_COST_WOOD  * actualDoors;
    const costN = BARRICADE_COST_NAILS * actualDoors;
    if (wood < costW || nails < costN)
      return { fail: "not_enough_materials", need: { wood: costW, nails: costN } };

    removeFromInventory(player.inventory, "wood",  costW);
    removeFromInventory(player.inventory, "nails", costN);
    b.barricadeHp = BARRICADE_HP * actualDoors;
    if (b.doors) {
      b.doors.forEach(d => {
        d.hp     = DOOR_MAX_HP;
        d.broken = false;
        d.open   = false;
      });
    }
    return { success: true, building: b };
  }
  return null;
}
export function updateBarricades(buildings, zombies, dt) {
  buildings.forEach(b => {
    if (!b.barricadeable || b.barricadeHp <= 0) return;
    const bCx = b.x + b.w / 2, bCy = b.y + b.h / 2;
    zombies.forEach(z => {
      if (z.dead) return;
      if (dist(z.x, z.y, bCx, bCy) < ZOMBIE_RADIUS + Math.max(b.w, b.h) / 2 + 10)
        if (z.attackCooldown <= 0)
          b.barricadeHp = Math.max(0, b.barricadeHp - BARRICADE_ZOMBIE_DAMAGE);
    });
  });
}

// ─── Door bashing ─────────────────────────────────────────────────────────────
export function updateDoorBashing(buildings, zombies, dt) {
  const events = [];
  buildings.forEach(b => {
    if (!b.doors) return;
    b.doors.forEach(door => {
      if (door.open || door.broken) return;
      if (b.barricadeHp > 0) return;

      zombies.forEach(z => {
        if (z.dead || z.state !== "bash_door") return;
        if (z._bashDoorId !== door.id) return;
        if (z.attackCooldown > 0) return;

        door.hp = Math.max(0, (door.hp ?? DOOR_MAX_HP) - DOOR_BASH_DAMAGE);
        z.attackCooldown = 1 / ZOMBIE_ATTACK_RATE;
        events.push({ buildingId: b.id, doorId: door.id, hp: door.hp });

        if (door.hp <= 0) {
          door.broken = true;
          door.open   = true;
          events.push({ buildingId: b.id, doorId: door.id, hp: 0, broken: true });
        }
      });
    });
  });
  return events;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export function getSleepLocation(player, vehicle, buildings) {
  if (player.inVehicle) return "inVehicle";
  for (const b of buildings) {
    if (isInsideBuilding(player, b))
      return b.barricadeHp > 0 ? "secured" : "indoor";
  }
  return "exposed";
}
export function shouldInterruptFastSleep(player, zombies, buildings) {
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (zombies.some(z => !z.dead && isInsideBuilding(z, b))) return true;
    if ((b.doors || []).some(d => d.broken)) return true;
  }
  return false;
}

// ─── Farming ──────────────────────────────────────────────────────────────────
export function tryPlantCrop(player, gardenPlots, crops, cropType) {
  if (player.inVehicle) return null;
  if (getInventoryCount(player.inventory, "seeds") < 1) return { fail: "no_seeds" };
  for (const plot of gardenPlots) {
    if (crops.some(c => c.plotId === plot.id)) continue;
    if (dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) > 60) continue;
    removeFromInventory(player.inventory, "seeds", 1);
    const crop = createCrop(plot.id, cropType ?? "potato", plot.x, plot.y);
    crops.push(crop);
    return { success: true, crop };
  }
  return null;
}
export function updateCrops(crops, dt) {
  const ready = [];
  crops.forEach(c => {
    if (c.stage === "ready") return;
    c.growTimer += dt;
    if (c.growTimer >= c.growTime * 0.5 && c.stage === "planted") c.stage = "growing";
    if (c.growTimer >= c.growTime) { c.stage = "ready"; ready.push(c); }
  });
  return ready;
}
export function tryHarvestCrop(player, gardenPlots, crops, dayNumber, buildings = []) {
  for (let i = crops.length - 1; i >= 0; i--) {
    const c = crops[i];
    if (c.stage !== "ready") continue;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    if (!plot) continue;
    const plotCx = plot.x + plot.w / 2, plotCy = plot.y + plot.h / 2;
    if (dist(player.x, player.y, plotCx, plotCy) > 60) continue;
    // Don't allow harvesting through a sealed wall
    if (buildings.length && areWallSeparated(player.x, player.y, plotCx, plotCy, buildings)) continue;
    
    const cropDef = CROP_TYPES[c.type] ?? CROP_TYPES.potato;
    const seasonBonus = getSeasonalBonus(c.type, dayNumber);
    const qty = Math.floor(cropDef.yield * seasonBonus);
    
    addToInventory(player.inventory, "food", qty);
    crops.splice(i, 1);
    return { type: c.type, qty, id: c.id, seasonBonus: seasonBonus > 1 };
  }
  return null;
}

// ─── Inventory helpers ────────────────────────────────────────────────────────
export function addToInventory(inv, type, qty) { inv[type] = (inv[type] ?? 0) + qty; }
export function removeFromInventory(inv, type, qty) { inv[type] = Math.max(0, (inv[type] ?? 0) - qty); }
export function getInventoryCount(inv, type) { return inv[type] ?? 0; }
export function eatFood(player) {
  if (getInventoryCount(player.inventory, "food") < 1) return false;
  removeFromInventory(player.inventory, "food", 1);
  player.food = Math.min(100, player.food + 25);
  return true;
}
export function drinkWater(player, buildings, wells) {
  if (wells) {
    const nearWell = wells.some(w => dist(player.x, player.y, w.x, w.y) < 60);
    if (nearWell) { player.water = Math.min(100, player.water + 30); return { source: "well" }; }
  }
  const nearBuildingWell = buildings.some(b => b.hasWell &&
    dist(player.x, player.y, b.x + b.w / 2, b.y + b.h / 2) < 80);
  if (nearBuildingWell) { player.water = Math.min(100, player.water + 30); return { source: "well" }; }
  if (getInventoryCount(player.inventory, "water") < 1) return false;
  removeFromInventory(player.inventory, "water", 1);
  player.water = Math.min(100, player.water + 30);
  return { source: "bottle" };
}

// ─── Day/night ────────────────────────────────────────────────────────────────
export function updateDayNight(state, dt) {
  state.dayTimer -= dt;
  if (state.dayTimer <= 0) {
    state.isNight = !state.isNight;
    state.dayTimer = IN_GAME_DAY_SECS;
    if (!state.isNight) state.dayNumber++;
    return true;
  }
  return false;
}

// ─── Camera ───────────────────────────────────────────────────────────────────
export function updateCamera(cam, player, vehicle, W, H) {
  const targetX = (player.inVehicle ? vehicle.x : player.x) - W / 2;
  const targetY = (player.inVehicle ? vehicle.y : player.y) - H / 2;
  cam.x += (targetX - cam.x) * 0.1;
  cam.y += (targetY - cam.y) * 0.1;
  cam.x = Math.max(0, Math.min(WORLD_W - W, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_H - H, cam.y));
}
export function worldToCanvas(wx, wy, cam) { return { cx: wx - cam.x, cy: wy - cam.y }; }
export function addFloater(state, text, x, y, color = "rgba(255,220,80,0.95)", size = 13) {
  state.floaters.push({ text, x, y, age: 0, ttl: 2.0, color, size });
}
export function updateFloaters(floaters, dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].age += dt;
    if (floaters[i].age >= floaters[i].ttl) floaters.splice(i, 1);
  }
}
export function tryPlaceTurret(player, x, y, turrets, buildings) {
  if (player.inVehicle) return null;

  const scrap = getInventoryCount(player.inventory, "scrap");
  const nails = getInventoryCount(player.inventory, "nails");
  if (scrap < TURRET_COST.scrap) return { fail: "no_scrap", need: TURRET_COST };
  if (nails < TURRET_COST.nails) return { fail: "no_nails", need: TURRET_COST };

  const inside = buildings.some(b => {
    const pad = 10;
    return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
  });
  if (inside) return { fail: "inside_building" };

  const overlaps = turrets.some(t => !t.destroyed && dist(t.x, t.y, x, y) < 32);
  if (overlaps) return { fail: "overlap" };

  removeFromInventory(player.inventory, "scrap", TURRET_COST.scrap);
  removeFromInventory(player.inventory, "nails", TURRET_COST.nails);
  const turret = createTurret(x, y);
  turrets.push(turret);
  return { success: true, turret };
}
export function updateTurrets(turrets, zombies, dt, soundEvents) {
  turrets.forEach(t => {
    if (t.destroyed) return;
    if (t.shootCooldown > 0) { t.shootCooldown -= dt; return; }

    let nearest = null, nearestDist = Infinity;
    zombies.forEach(z => {
      if (z.dead) return;
      const d = dist(t.x, t.y, z.x, z.y);
      if (d < t.range && d < nearestDist) { nearest = z; nearestDist = d; }
    });

    if (!nearest) return;

    nearest.hp -= t.damage;
    if (nearest.hp <= 0) { nearest.dead = true; nearest._killedByTurret = t.id; }
    t.shootCooldown = 1 / t.fireRate;

    if (soundEvents) {
      if (soundEvents.length >= 20) soundEvents.shift();
      soundEvents.push(createSoundEvent("turret", t.x, t.y, t.attractRadius, 0.85));
    }
  });
}
export function applyTurretDamage(turrets, zombies, dt) {
  const events = [];
  zombies.forEach(z => {
    if (z.dead) return;
    if (z.state !== "attack_turret") return;
    if ((z._turretAttackCd ?? 0) > 0) { z._turretAttackCd -= dt; return; }

    const t = turrets.find(tr => tr.id === z._turretTargetId && !tr.destroyed);
    if (!t) { z.state = "wander"; z._turretTargetId = null; return; }

    const d = dist(z.x, z.y, t.x, t.y);
    if (d > t.radius + ZOMBIE_RADIUS + TURRET_ZOMBIE_ATTACK_RANGE) return;

    t.hp = Math.max(0, t.hp - TURRET_ZOMBIE_DAMAGE);
    z._turretAttackCd = 1 / ZOMBIE_ATTACK_RATE;
    events.push({ turretId: t.id, hp: t.hp });

    if (t.hp <= 0 && !t.destroyed) {
      t.destroyed = true;
      events.push({ turretId: t.id, hp: 0, destroyed: true });
      zombies.forEach(z2 => {
        if (z2._turretTargetId === t.id) {
          z2.state = "wander";
          z2._turretTargetId = null;
        }
      });
    }
  });
  return events;
}
export function tryRepairTurret(player, turrets) {
  if (player.inVehicle) return null;
  for (const t of turrets) {
    if (t.destroyed) continue;
    if (dist(player.x, player.y, t.x, t.y) > TURRET_REPAIR_RANGE) continue;
    if (t.hp >= t.maxHp) return { fail: "full_hp", turret: t };
    if (getInventoryCount(player.inventory, "scrap") < TURRET_REPAIR_COST_SCRAP)
      return { fail: "no_scrap", turret: t };
    removeFromInventory(player.inventory, "scrap", TURRET_REPAIR_COST_SCRAP);
    t.hp = Math.min(t.maxHp, t.hp + TURRET_REPAIR_HP);
    return { success: true, turret: t };
  }
  return null;
}

// ─── Free crop plot placement ─────────────────────────────────────────────────
export function tryPlaceCropPlot(player, x, y, gardenPlots, buildings) {
  if (player.inVehicle) return null;

  const plotW = 80, plotH = 70;
  const plotL = x - plotW / 2, plotR = x + plotW / 2;
  const plotT = y - plotH / 2, plotB = y + plotH / 2;

  const GAP = 12;
  const tooCloseToBuilding = buildings.some(b =>
    plotL < b.x + b.w + GAP &&
    plotR > b.x - GAP &&
    plotT < b.y + b.h + GAP &&
    plotB > b.y - GAP
  );
  if (tooCloseToBuilding) return { fail: "inside_building" };

  const overlaps = gardenPlots.some(p =>
    Math.abs(p.x + p.w / 2 - x) < (p.w + plotW) / 2 + 8 &&
    Math.abs(p.y + p.h / 2 - y) < (p.h + plotH) / 2 + 8
  );
  if (overlaps) return { fail: "overlap" };

  const plot = {
    id: `plot_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    x: x - plotW / 2,
    y: y - plotH / 2,
    w: plotW, h: plotH,
    crop: null, growTimer: 0,
  };
  gardenPlots.push(plot);
  return { success: true, plot };
}

// ─── Map fragment + settlement breadcrumb system ─────────────────────────────
export function collectMapFragment(state, fragmentItem) {
  if (!fragmentItem || fragmentItem.type !== "map_fragment") return null;

  state.mapFragmentCollected = true;
  if (!state.fragmentsCollected) state.fragmentsCollected = [];

  const nextSid = fragmentItem.nextSettlementId;

  if (nextSid === "exit" || nextSid === null) {
    const curSid2 = state.compassTarget?.settlementId ?? 0;
    if (!state.fragmentsCollected.includes(curSid2)) {
      state.fragmentsCollected.push(curSid2);
      if (state.clearedSettlements) state.clearedSettlements.add(curSid2);
    }

    const startSett = state.settlements?.[0];
    let bossSettlement = state.settlements?.[state.settlements.length - 1];
    if (state.settlements && state.settlements.length > 1 && startSett) {
      let maxDist = -1;
      for (const sett of state.settlements) {
        const d = dist(sett.cx, sett.cy, startSett.cx, startSett.cy);
        if (d > maxDist) { maxDist = d; bossSettlement = sett; }
      }
    }
    const bossX = bossSettlement ? bossSettlement.cx + 120 : WORLD_W / 2;
    const bossY = bossSettlement ? bossSettlement.cy + 80  : WORLD_H / 2;
    const boss = createBossZombie("boss_final", bossX, bossY);
    state.zombies.push(boss);
    state.bossZombie = boss;

    state.compassTarget = { x: bossX, y: bossY, isBoss: true };
    return { isEndgame: false, bossSpawned: true };
  }

  const curSid = state.compassTarget?.settlementId ?? 0;
  if (!state.fragmentsCollected.includes(curSid)) {
    state.fragmentsCollected.push(curSid);
    if (state.clearedSettlements) state.clearedSettlements.add(curSid);
  }

  // Pick the closest unvisited settlement instead of following the fixed chain.
  const px2 = state.player?.x ?? 0;
  const py2 = state.player?.y ?? 0;
  const unvisited = (state.settlements ?? []).filter(
    s => s.id !== curSid && !state.fragmentsCollected.includes(s.id)
  );
  const nextSettlement = unvisited.reduce((best, s) => {
    if (!best) return s;
    return dist(px2, py2, s.cx, s.cy) < dist(px2, py2, best.cx, best.cy) ? s : best;
  }, null);
  if (!nextSettlement) return { isEndgame: false };
  const nextSid2 = nextSettlement.id;

  const nextFragBuilding = state.buildings?.find(
    b => b.settlementId === nextSid2 && b.isFragmentBuilding
  );

  state.compassTarget = nextFragBuilding
    ? { x: nextFragBuilding.x + nextFragBuilding.w / 2, y: nextFragBuilding.y + nextFragBuilding.h / 2, settlementId: nextSid2 }
    : { x: nextSettlement.cx, y: nextSettlement.cy, settlementId: nextSid2 };

  // Remember that the AI still needs to finish looting the settlement where
  // the fragment was just found before heading to the next one.
  state.pendingLootSettlementId = curSid;

  return { isEndgame: false, nextSettlement };
}
export function checkEndgame(state) {
  if (!state.bossZombie) return false;
  return state.bossZombie.dead === true;
}
export function checkLevelExit(state) {
  return checkEndgame(state);
}

// ─── Cast action system ───────────────────────────────────────────────────────
export function updateCastAction(castAction, dt, wasHit) {
  if (!castAction) return null;
  if (wasHit && castAction.interruptible !== false) return "interrupted";
  castAction.elapsed += dt;
  if (castAction.elapsed >= castAction.duration) return "done";
  return "ticking";
}

// ─── Convoy AI ───────────────────────────────────────────────────────────────
export function updateConvoyVehicles(convoyVehicles, playerVehicle, survivors, dt, buildings) {
  if (!playerVehicle._crumbs) playerVehicle._crumbs = [{ x: playerVehicle.x, y: playerVehicle.y }];
  const lastCrumb = playerVehicle._crumbs[playerVehicle._crumbs.length - 1];
  const dToLast = dist(playerVehicle.x, playerVehicle.y, lastCrumb.x, lastCrumb.y);
  if (dToLast >= CONVOY_CRUMB_SPACING) {
    playerVehicle._crumbs.push({ x: playerVehicle.x, y: playerVehicle.y });
    if (playerVehicle._crumbs.length > 120) playerVehicle._crumbs.splice(0, playerVehicle._crumbs.length - 120);
  }

  const ejected = [];

  for (const entry of convoyVehicles) {
    const { vehicle: cv, survivor: sv } = entry;
    if (!sv || sv.hp <= 0 || cv.hp <= 0) continue;

    // FIX 5: initialise _crumbIdx to the most recent crumb (end of trail) so newly
    // assigned convoy vehicles start chasing near the player's current position
    // rather than teleporting all the way back to the oldest crumb.
    if (sv._crumbIdx === undefined) sv._crumbIdx = Math.max(0, crumbs.length - 1);

    const crumbs = playerVehicle._crumbs;
    if (!crumbs || crumbs.length === 0) continue;

    sv._crumbIdx = Math.max(0, Math.min(sv._crumbIdx, crumbs.length - 1));

    const targetCrumb = crumbs[sv._crumbIdx];

    const dx = targetCrumb.x - cv.x;
    const dy = targetCrumb.y - cv.y;
    const dToCrumb = Math.sqrt(dx * dx + dy * dy);

    if (dToCrumb < CONVOY_EJECT_RANGE && sv._crumbIdx < crumbs.length - 1) {
      sv._crumbIdx++;
      continue;
    }

    const dToPlayer = dist(cv.x, cv.y, playerVehicle.x, playerVehicle.y);

    let speed;
    if (dToPlayer > CONVOY_GAP_FAR)       speed = CONVOY_SPEED_CATCH_UP;
    else if (dToPlayer < CONVOY_GAP_NEAR) speed = CONVOY_SPEED_SLOW;
    else {
      const t = (dToPlayer - CONVOY_GAP_NEAR) / (CONVOY_GAP_FAR - CONVOY_GAP_NEAR);
      speed = CONVOY_SPEED_SLOW + (CONVOY_SPEED_BASE - CONVOY_SPEED_SLOW) * t;
    }

    if (dToCrumb > 1) {
      const nx = dx / dToCrumb, ny = dy / dToCrumb;
      cv.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, cv.x + nx * speed * dt));
      cv.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, cv.y + ny * speed * dt));
      cv.facing = Math.atan2(ny, nx);
      cv.occupied = true;
      sv.x = cv.x; sv.y = cv.y; sv.facing = cv.facing;
      if (buildings) {
        for (const b of buildings) resolveWallCollision(cv, b);
      }
    }

    if (cv.hp <= 0) {
      sv.x = cv.x + VEHICLE_RADIUS + PLAYER_RADIUS + 4;
      sv.y = cv.y;
      sv.command = "follow";
      sv.state = "idle";
      delete sv._crumbIdx;
      ejected.push(sv);
      entry._ejected = true;
    }
  }

  return ejected;
}

// ─── Survivor AI ─────────────────────────────────────────────────────────────