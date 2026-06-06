// engine_geometry.js — split from deadMilesEngine.js (pure functions, no React)

import { PLAYER_RADIUS, REPAIR_HP_GAIN, REPAIR_RANGE, VEHICLE_RADIUS, WORLD_H, WORLD_W } from "./engine_constants";
import { createInitialState } from "./engine_entities";
import { getInventoryCount, removeFromInventory } from "./engine_player";

export function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
export function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Vehicle placement validation ─────────────────────────────────────────────
export function isValidVehiclePosition(x, y, buildings, radius = VEHICLE_RADIUS) {
  // Check world bounds
  if (x - radius < 50 || x + radius > WORLD_W - 50 || y - radius < 50 || y + radius > WORLD_H - 50) {
    return false;
  }
  
  // Check collision with all buildings
  for (const b of buildings) {
    // Expand building bounds by vehicle radius + margin
    const margin = radius + 8;
    if (x + margin > b.x && x - margin < b.x + b.w && y + margin > b.y && y - margin < b.y + b.h) {
      return false;
    }
  }
  return true;
}
export function findSafeVehiclePosition(baseX, baseY, buildings, radius = VEHICLE_RADIUS, maxAttempts = 30, seed = null) {
  // Use a deterministic seed so P1 and P2 produce identical vehicle positions
  // when both call createInitialState with the same game seed.
  const deterministicSeed = seed ?? (Math.floor(baseX * 7 + baseY * 13) & 0x7fffffff);
  const rand = seededRand(deterministicSeed);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Spiral outward from base position
    const angle = rand() * Math.PI * 2;
    const distance = 60 + rand() * 150;
    const testX = baseX + Math.cos(angle) * distance;
    const testY = baseY + Math.sin(angle) * distance;
    
    if (isValidVehiclePosition(testX, testY, buildings, radius)) {
      return { x: testX, y: testY };
    }
  }
  
  // Fallback: try cardinal directions at increasing distances
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1]
  ];
  
  for (let dist = 80; dist <= 300; dist += 40) {
    for (const [dx, dy] of directions) {
      const testX = baseX + dx * dist;
      const testY = baseY + dy * dist;
      if (isValidVehiclePosition(testX, testY, buildings, radius)) {
        return { x: testX, y: testY };
      }
    }
  }
  
  // Ultimate fallback: return a position far away - caller will need to handle
  return { x: baseX + 200, y: baseY + 200 };
}
export function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Door geometry ────────────────────────────────────────────────────────────
export function getBuildingWallSegments(building) {
  const { x, y, w, h, doors } = building;
  const segs = [];

  const sides = ["north", "south", "west", "east"];
  for (const side of sides) {
    const len = (side === "north" || side === "south") ? w : h;
    const doorSpans = (doors || [])
      .filter(d => d.side === side && (d.open || d.broken))
      .map(d => {
        const center = len * d.offset;
        const hw = d.width / 2;
        return [Math.max(0, center - hw), Math.min(len, center + hw)];
      })
      .sort((a, b) => a[0] - b[0]);

    let cursor = 0;
    for (const [s, e] of doorSpans) {
      if (cursor < s) segs.push(makeSeg(building, side, cursor, s));
      cursor = e;
    }
    if (cursor < len) segs.push(makeSeg(building, side, cursor, len));
  }
  return segs;
}
function makeSeg(building, side, from, to) {
  const { x, y, w, h } = building;
  switch (side) {
    case "north": return { x1: x + from, y1: y,     x2: x + to, y2: y };
    case "south": return { x1: x + from, y1: y + h, x2: x + to, y2: y + h };
    case "west":  return { x1: x,       y1: y + from, x2: x,       y2: y + to };
    case "east":  return { x1: x + w,   y1: y + from, x2: x + w,   y2: y + to };
    default: return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }
}
function closestPointOnSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}
function resolveSegCollision(entity, seg, radius, pushStrength = 1.0) {
  const r = radius ?? PLAYER_RADIUS;
  const cp = closestPointOnSeg(entity.x, entity.y, seg.x1, seg.y1, seg.x2, seg.y2);
  let dx = entity.x - cp.x;
  let dy = entity.y - cp.y;
  let d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) { dx = 0; dy = -1; d = 0.001; }
  if (d < r) {
    // Soft push - don't overshoot
    const push = Math.min((r - d) * pushStrength, 8);
    entity.x += (dx / d) * push;
    entity.y += (dy / d) * push;
    return true;
  }
  return false;
}
export function resolveWallCollision(entity, building) {
  const r = entity.radius ?? PLAYER_RADIUS;
  const { x, y, w, h } = building;
  
  // Quick bounds check with a larger margin
  if (entity.x + r < x - 8 || entity.x - r > x + w + 8) return false;
  if (entity.y + r < y - 8 || entity.y - r > y + h + 8) return false;

  const segs = getBuildingWallSegments(building);
  let anyCollision = false;
  
  // Multiple passes with diminishing returns
  for (let pass = 0; pass < 4; pass++) {
    let collided = false;
    // Use diminishing push strength on later passes to prevent overshoot
    const strength = pass === 0 ? 1.0 : 0.4;
    for (const seg of segs) {
      if (resolveSegCollision(entity, seg, r, strength)) {
        collided = true;
        anyCollision = true;
      }
    }
    if (!collided) break;
  }
  
  // Apply world bounds after collision
  entity.x = Math.max(r, Math.min(WORLD_W - r, entity.x));
  entity.y = Math.max(r, Math.min(WORLD_H - r, entity.y));
  
  return anyCollision;
}
export function isInsideBuilding(entity, building) {
  const { x, y, w, h } = building;
  return entity.x > x && entity.x < x + w && entity.y > y && entity.y < y + h;
}
export function getDoorCenter(building, door) {
  const { x, y, w, h } = building;
  const len = (door.side === "north" || door.side === "south") ? w : h;
  const pos = len * door.offset;
  switch (door.side) {
    case "north": return { x: x + pos, y: y };
    case "south": return { x: x + pos, y: y + h };
    case "west":  return { x: x,       y: y + pos };
    case "east":  return { x: x + w,   y: y + pos };
    default:      return { x: x + w / 2, y: y + h / 2 };
  }
}
export function isNearDoor(entity, building, range = 36) {
  if (!building.doors) return false;
  return building.doors.some(door => {
    const c = getDoorCenter(building, door);
    return dist(entity.x, entity.y, c.x, c.y) < range;
  });
}

// ─── Loot pile ────────────────────────────────────────────────────────────────
export function createLootPile(buildingId, items, x, y) {
  return {
    id:         `loot_${buildingId}_${Math.floor(Math.random() * 99999)}`,
    buildingId,
    items,
    x, y,
    collected:  false,
  };
}

// ─── Vehicle repair ───────────────────────────────────────────────────────────
export function tryRepairVehicle(player, vehicle) {
  if (player.inVehicle) return null;
  if (dist(player.x, player.y, vehicle.x, vehicle.y) > REPAIR_RANGE) return null;
  if (getInventoryCount(player.inventory, "car_parts") < 1) return { fail: "no_parts" };
  if (vehicle.hp >= vehicle.maxHp) return { fail: "full_hp" };

  removeFromInventory(player.inventory, "car_parts", 1);
  vehicle.hp = Math.min(vehicle.maxHp, vehicle.hp + REPAIR_HP_GAIN);
  return { success: true, hp: vehicle.hp };
}

export function refuelVehicle(player, vehicle) {
  if (!vehicle || player.inVehicle) return null;
  if (dist(player.x, player.y, vehicle.x, vehicle.y) > REPAIR_RANGE) return null;
  if (getInventoryCount(player.inventory, "fuel") < 1) return { fail: "no_fuel" };
  if (vehicle.fuel >= vehicle.maxFuel) return { fail: "full_tank" };
  removeFromInventory(player.inventory, "fuel", 1);
  vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + 30);
  return { success: true, fuel: vehicle.fuel };
}

// ─── Level 1 map ─────────────────────────────────────────────────────────────
export function areWallSeparated(ax, ay, bx, by, buildings) {
  if (!buildings) return false;
  for (const b of buildings) {
    const aInside = ax > b.x && ax < b.x + b.w && ay > b.y && ay < b.y + b.h;
    const bInside = bx > b.x && bx < b.x + b.w && by > b.y && by < b.y + b.h;
    if (aInside === bInside) continue;
    const allSealed = (b.doors || []).every(d => !d.open && !d.broken);
    if (allSealed) return true;
  }
  return false;
}