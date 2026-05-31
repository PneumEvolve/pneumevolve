// src/Pages/DeadMiles/GameView.jsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDeadMilesRoom } from "./useDeadMilesRoom";
import {
  createInitialState,
  movePlayer, driveVehicle, syncPlayerToVehicle,
  tryEnterVehicle, exitVehicle,
  updateNeeds, updateZombies, applyZombieDamage,
  updateVehicleCollisions, playerAttack,
  tryToggleDoor, tryCollectLoot, tryDiscoverSurvivor,
  tryBarricade, updateBarricades, updateDoorBashing, getSleepLocation,
  tryPlantCrop, updateCrops, tryHarvestCrop,
  tryRepairVehicle,
  eatFood, drinkWater,
  updateDayNight, updateCamera, updateNightSpawns,
  addFloater, updateFloaters,
  worldToCanvas, getDoorCenter, getBuildingWallSegments,
  isInsideBuilding, getProximityActions,
  checkLevelExit,
  WORLD_W, WORLD_H, PLAYER_RADIUS, ZOMBIE_RADIUS,
  NEEDS_TUNE, LOOT_RANGE, DOOR_MAX_HP, REPAIR_RANGE, REPAIR_HP_GAIN,
  EXIT_TARGET_X, EXIT_TARGET_Y,
  lerp, shouldInterruptFastSleep, createZombie,
} from "./deadMilesEngine";
import {
  createJoystick, joystickTouchStart, joystickTouchMove,
  joystickTouchEnd, drawJoystick,
} from "../Stronghold/mobileControls";

const MOVE_THROTTLE  = 100;
const SYNC_THROTTLE  = 200;
const NEEDS_THROTTLE = 500;

const COL = {
  player:      "rgba(255,180,60,0.95)",
  player2:     "rgba(120,200,255,0.95)",
  zombie:      "#cc2222",
  zombieChase: "#ff4444",
};

export default function GameView({ room, role = "p1", onGameOver, level = 1 }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef(createJoystick());
  const rafRef      = useRef(null);
  const holdZRef        = useRef(0);
  const zHoldActiveRef  = useRef(false);
  const flashRef        = useRef(0);
  const gameOverFiredRef = useRef(false);

  const lastMoveRef  = useRef(0);
  const lastSyncRef  = useRef(0);
  const lastNeedsRef = useRef(0);

  const [hud, setHud]                   = useState({ food: 100, water: 100, sleep: 100, hp: 100, dayNumber: 1, isNight: false });
  const [sleepFlash, setSleepFlash]      = useState(false);
  const [notification, setNote]         = useState(null);
  const [inventory, setInv]             = useState({});
  const [p2Connected, setP2]            = useState(false);
  const [contextActions, setCtxActions] = useState([]);
  const [showControls, setShowControls] = useState(false);
  const [showInventory, setShowInv]     = useState(false);

  const isP1 = role === "p1";
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ── Websocket handlers ─────────────────────────────────────────────────────
  const handlers = useRef({
    onP1Move: ({ x, y, facing, inVehicle }) => {
      if (roleRef.current === "p1") return;
      const s = stateRef.current; if (!s) return;
      if (!s.player2) s.player2 = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle, radius: 7 };
      s.p2Target = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle };
    },
    onP2Move: ({ x, y, facing, inVehicle }) => {
      if (roleRef.current !== "p1") return;
      const s = stateRef.current; if (!s) return;
      if (!s.player2) s.player2 = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle, radius: 7 };
      s.p2Target = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle };
    },
    onVehicleUpdate: ({ x, y, facing, hp, fuel, driver, passenger }) => {
      const s = stateRef.current; if (!s) return;
      s.vehicleTarget = { x, y, facing, hp, fuel };
      if (s.vehicle.driver !== roleRef.current) s.vehicle.driver = driver ?? null;
      if (s.vehicle.passenger !== roleRef.current) s.vehicle.passenger = passenger ?? null;
      s.vehicle.occupied = s.vehicle.driver !== null;
    },
    onZombieUpdate: ({ zombies }) => {
      const s = stateRef.current; if (!s) return;
      if (roleRef.current === "p1") {
        zombies.forEach(incoming => {
          const z = s.zombies.find(z2 => z2.id === incoming.id);
          if (!z) return;
          if (incoming.dead) z.dead = true;
          else if (incoming.hp < z.hp) z.hp = incoming.hp;
        });
        return;
      }
      if (!s.zombieTargets) s.zombieTargets = new Map();
      const existingIds = new Set(s.zombies.map(z => z.id));
      zombies.forEach(z => {
        s.zombieTargets.set(z.id, z);
        if (!existingIds.has(z.id) && !z.dead) {
          s.zombies.push({
            id: z.id, x: z.x, y: z.y, hp: z.hp, maxHp: z.hp ?? 30,
            state: z.state, dead: false,
            radius: 9, speed: 38, attackCooldown: 0,
            targetX: z.x, targetY: z.y, wanderTimer: 2,
            alertTimer: 0, giveUpTimer: 0, _p2AttackCd: 0,
          });
          existingIds.add(z.id);
        }
      });
      s.zombies.forEach(z => {
        const t = s.zombieTargets.get(z.id);
        if (!t) return;
        if (t.dead) { z.dead = true; return; }
        if (!z._p2HitThisFrame && !z.dead) z.hp = t.hp;
      });
    },
    onDoorUpdate: ({ buildingId, doorId, open, hp, broken }) => {
      const s = stateRef.current; if (!s) return;
      const b = s.buildings.find(b => b.id === buildingId);
      if (!b) return;
      const door = b.doors?.find(d => d.id === doorId);
      if (!door) return;
      door.open = open; door.hp = hp; door.broken = broken;
    },
    onBuildingSearch: ({ buildingId }) => {
      const s = stateRef.current; if (!s) return;
      const b = s.buildings.find(b => b.id === buildingId);
      if (b) b.searched = true;
    },
    onBarricadePlace: ({ buildingId, hp }) => {
      const s = stateRef.current; if (!s) return;
      const b = s.buildings.find(b => b.id === buildingId);
      if (b) b.barricadeHp = hp;
    },
    onNeedsUpdate: ({ food, water, sleep, hp }) => {
      const s = stateRef.current; if (!s) return;
      if (s.player2) Object.assign(s.player2, { food, water, sleep, hp });
    },
    onSurvivorFound: ({ survivor }) => {
      const s = stateRef.current; if (!s) return;
      if (!s.survivors.some(sv => sv.id === survivor.id)) s.survivors.push(survivor);
    },
    onCropPlant:    ({ crop })   => { const s = stateRef.current; if (s && !s.crops.some(c => c.id === crop.id)) s.crops.push(crop); },
    onCropHarvest:  ({ cropId }) => { const s = stateRef.current; if (s) s.crops = s.crops.filter(c => c.id !== cropId); },
    onPhaseChange:  ({ phase, dayNumber }) => {
      if (roleRef.current === "p1") return;
      const s = stateRef.current; if (!s) return;
      s.isNight = phase === "night"; s.dayNumber = dayNumber;
    },
    onMapFragment: () => {
      const s = stateRef.current; if (!s) return;
      s.mapFragmentCollected = true;
    },
    onVehicleRepair: ({ hp }) => {
      const s = stateRef.current; if (!s) return;
      s.vehicle.hp = hp;
    },
    onPartnerConnected: () => {
      setP2(true);
      const s = stateRef.current;
      if (s && !s.player2) {
        s.player2 = { x: s.player.x, y: s.player.y, facing: 0, inVehicle: false, radius: 7 };
      }
    },
    onPartnerDisconnected: () => {
      setP2(false);
      const s = stateRef.current;
      if (s) {
        s.player2 = null;
        const disconnectedRole = roleRef.current === "p1" ? "p2" : "p1";
        if (s.vehicle.driver === disconnectedRole) {
          s.vehicle.driver = null;
          s.vehicle.occupied = s.vehicle.passenger !== null;
        }
        if (s.vehicle.passenger === disconnectedRole) {
          s.vehicle.passenger = null;
        }
      }
    },
  }).current;

  const {
    sendP1Move, sendP2Move, sendVehicleUpdate, sendZombieUpdate,
    sendBuildingSearch, sendBarricadePlace, sendDoorUpdate, sendNeedsUpdate,
    sendSurvivorFound, sendCropPlant, sendCropHarvest, sendPhaseChange,
    sendMapFragment, sendVehicleRepair,
  } = useDeadMilesRoom(room?.id ?? null, handlers);
  const sendMyMove = isP1 ? sendP1Move : sendP2Move;

  function getMovementVec() {
    const keys = keysRef.current, joy = joystickRef.current;
    let dx = 0, dy = 0;
    if (joy.active) { dx = joy.vec.x; dy = joy.vec.y; }
    else {
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) dx -= 1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx += 1;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"]) dy -= 1;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"]) dy += 1;
    }
    return { dx, dy };
  }

  function notify(text, color = "rgba(255,220,80,0.95)") {
    setNote({ text, color });
    setTimeout(() => setNote(null), 2800);
  }

  function triggerGameOver(s, extra = {}) {
    if (gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;
    const score = {
      survived: false,
      dayssurvived: s.dayNumber,
      zombiesKilled: s.zombiesKilled ?? 0,
      buildingsSearched: s.buildingsSearched ?? 0,
      survivorsFound: s.survivorsFound ?? 0,
      ...extra,
    };
    onGameOver(score);
  }

  // ── Unified F key handler ──────────────────────────────────────────────────
  function handleF(s) {
    if (s.player.inVehicle) {
      exitVehicle(s.player, s.vehicle, roleRef.current);
      notify("Got out of vehicle");
      if (room) sendVehicleUpdate(
        s.vehicle.x, s.vehicle.y, s.vehicle.facing,
        s.vehicle.hp, s.vehicle.fuel,
        s.vehicle.driver, s.vehicle.passenger
      );
      return;
    }

    const myRole = roleRef.current;
    const alreadyInVehicle = s.vehicle.driver === myRole || s.vehicle.passenger === myRole;
    const vehicleFull = s.vehicle.driver !== null && s.vehicle.passenger !== null;

    if (!alreadyInVehicle && vehicleFull) {
      notify("Vehicle is full!", "rgba(255,100,100,0.95)");
      return;
    }

    const enteredAs = tryEnterVehicle(s.player, s.vehicle, myRole);
    if (enteredAs) {
      const msg = enteredAs === "driver" ? "Driving — F to exit" : "Riding shotgun — F to exit";
      notify(msg);
      if (room) sendVehicleUpdate(
        s.vehicle.x, s.vehicle.y, s.vehicle.facing,
        s.vehicle.hp, s.vehicle.fuel,
        s.vehicle.driver, s.vehicle.passenger
      );
      return;
    }

    const doorResult = tryToggleDoor(s.player, s.buildings);
    if (doorResult) {
      notify(doorResult.door.open ? `Opened door` : `Closed door`);
      if (room) {
        const d = doorResult.door;
        sendDoorUpdate(doorResult.building.id, d.id, d.open, d.hp ?? DOOR_MAX_HP, !!d.broken);
      }
      return;
    }

    const lootResult = tryCollectLoot(s.player, s.lootPiles, s.vehicle);
    if (lootResult) {
      // Count buildings searched
      s.buildingsSearched = (s.buildingsSearched ?? 0) + 1;

      const fuelMsg = lootResult.fuelGained > 0 ? ` (+${lootResult.fuelGained} fuel ⛽)` : "";
      const nonFuelItems = lootResult.gained.filter(i => !i.autoFueled);
      const itemMsg = nonFuelItems.length > 0
        ? `Picked up: ${nonFuelItems.map(i => `${i.qty}× ${i.type}`).join(", ")}${fuelMsg}`
        : `Fueled up!${fuelMsg}`;
      notify(itemMsg, "rgba(120,255,150,0.95)");
      setInv({ ...s.player.inventory });

      // Check for map fragment in loot
      const hadFragment = lootResult.gained.some(i => i.type === "map_fragment");
      if (hadFragment && !s.mapFragmentCollected) {
        s.mapFragmentCollected = true;
        addFloater(s, "🗺️ map fragment! head north!", s.player.x, s.player.y - 30, "rgba(255,220,80,0.95)", 14);
        notify("🗺️ Map fragment found! Drive north to escape!", "rgba(255,220,80,0.95)");
        if (room && sendMapFragment) sendMapFragment();
      }

      const surv = tryDiscoverSurvivor(s.player, s.buildings, s.survivors, s.lootPiles);
      if (surv) {
        s.survivors.push(surv.survivor);
        s.survivorsFound = (s.survivorsFound ?? 0) + 1;
        notify(`${surv.survivor.name} (${surv.survivor.role}) was hiding here!`, "rgba(120,255,180,0.95)");
        if (room) sendSurvivorFound(surv.survivor);
      }
      if (room) sendBuildingSearch(lootResult.pile.buildingId);
      return;
    }

    const harvestResult = tryHarvestCrop(s.player, s.gardenPlots, s.crops);
    if (harvestResult) {
      notify(`Harvested ${harvestResult.qty}× ${harvestResult.type}!`, "rgba(120,220,80,0.95)");
      if (room) sendCropHarvest(harvestResult.id);
      setInv({ ...s.player.inventory });
      return;
    }

    const plantResult = tryPlantCrop(s.player, s.gardenPlots, s.crops, "potato");
    if (plantResult && plantResult.success) {
      notify("Planted potatoes", "rgba(120,220,80,0.95)");
      if (room) sendCropPlant(plantResult.crop);
      setInv({ ...s.player.inventory });
      return;
    }
    if (plantResult?.fail === "no_seeds") { notify("Need seeds first!", "rgba(255,100,100,0.95)"); return; }

    notify("Nothing to interact with here", "rgba(180,180,180,0.6)");
  }

  function handleKeyAction(key, s) {
    if (key === "f" || key === "F") { handleF(s); return; }

    if (key === "e" || key === "E") {
      const result = tryRepairVehicle(s.player, s.vehicle);
      if (!result) { return; }
      if (result.fail === "no_parts") { notify("Need car parts!", "rgba(255,100,100,0.95)"); return; }
      if (result.fail === "full_hp") { notify("Vehicle is already at full health!", "rgba(180,180,180,0.6)"); return; }
      notify(`Vehicle repaired +${REPAIR_HP_GAIN} HP 🔧`, "rgba(120,255,150,0.95)");
      if (room && sendVehicleRepair) sendVehicleRepair(s.vehicle.hp);
      setInv({ ...s.player.inventory });
      return;
    }

    if (key === "b" || key === "B") {
      const r = tryBarricade(s.player, s.buildings);
      if (!r) { notify("No barricadeable building nearby", "rgba(180,180,180,0.6)"); return; }
      if (r.fail) { notify(`Need ${r.need.wood} wood + ${r.need.nails} nails`, "rgba(255,100,100,0.95)"); return; }
      notify(`${r.building.label} barricaded!`, "rgba(180,230,120,0.95)");
      if (room) sendBarricadePlace(r.building.id, r.building.barricadeHp);
      setInv({ ...s.player.inventory });
      return;
    }

    if (key === "q" || key === "Q") {
      if (eatFood(s.player)) { notify("Ate food (+25 🍞)"); setInv({ ...s.player.inventory }); }
      else notify("No food in inventory!", "rgba(255,100,100,0.95)");
      return;
    }

    if (key === "r" || key === "R") {
      const ok = drinkWater(s.player, s.buildings, s.wells);
      if (ok) { notify(ok.source === "well" ? "Drank from well (+30 💧)" : "Drank water (+30 💧)"); setInv({ ...s.player.inventory }); }
      else notify("No water nearby!", "rgba(255,100,100,0.95)");
      return;
    }

    if (key === "z" || key === "Z") {
      if (s.isFastSleeping) {
        s.isFastSleeping = false;
        s.player.isSleeping = false;
        holdZRef.current = 0;
        zHoldActiveRef.current = false;
        notify("Woke up");
        return;
      }
      if (s.player.isSleeping && zHoldActiveRef.current) {
        s.player.isSleeping = false;
        holdZRef.current = 0;
        zHoldActiveRef.current = false;
        notify("Woke up");
        return;
      }
      if (s.player.isSleeping) {
        zHoldActiveRef.current = true;
        holdZRef.current = 0;
        return;
      }
      s.player.isSleeping = true;
      s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
      holdZRef.current = 0;
      zHoldActiveRef.current = false;
      notify("Sleeping — press & hold Z to fast-sleep ⏩");
      return;
    }

    if (key === "i" || key === "I") { setShowInv(v => !v); return; }
    if (key === " ") {
      if (!s.player.weapon) { notify("No weapon — find one first!", "rgba(255,100,100,0.95)"); return; }
      if (s.player.inVehicle) return;
      playerAttack(s.player, s.zombies, 0);
    }
    if (key === "Escape") { setShowInv(false); setShowControls(false); }
  }

  // ── Game loop setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    gameOverFiredRef.current = false;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
    }
    resize();
    const resizeTimer = setTimeout(resize, 0);
    window.addEventListener("resize", resize);

    stateRef.current = createInitialState(room?.map_seed ?? Date.now(), level);

    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      const s = stateRef.current;
      if (s) handleKeyAction(e.key, s);
    }
    function onKeyUp(e) { keysRef.current[e.key] = false; }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line

  function loop() {
    rafRef.current = requestAnimationFrame(loop);
    const s = stateRef.current;
    if (!s) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const now = performance.now();
    const dtActual = Math.min((now - s.lastTime) / 1000, 0.05);
    s.lastTime = now; s.tick++;
    const t = now / 1000;

    if (!s.isFastSleeping) s.isFastSleeping = false;
    if (s.player.isSleeping && !s.isFastSleeping && zHoldActiveRef.current) {
      if (keysRef.current["z"] || keysRef.current["Z"]) {
        holdZRef.current += dtActual;
        if (holdZRef.current >= 1.0) {
          s.isFastSleeping = true;
          holdZRef.current = 0;
          zHoldActiveRef.current = false;
        }
      } else {
        holdZRef.current = 0;
        zHoldActiveRef.current = false;
      }
    }

    if (flashRef.current > 0) flashRef.current -= dtActual;

    if (s.isFastSleeping) {
      if (shouldInterruptFastSleep(s.player, s.zombies, s.buildings)) {
        s.isFastSleeping = false;
        s.player.isSleeping = false;
        flashRef.current = 0.6;
        setSleepFlash(true);
        setTimeout(() => setSleepFlash(false), 700);
      }
    }

    const dt = s.isFastSleeping ? dtActual * 15 : dtActual;
    const { dx, dy } = getMovementVec();
    const moving = dx !== 0 || dy !== 0;

    if (!s.player.isSleeping) {
      if (s.player.inVehicle) {
        const isDriver = s.vehicle.driver === roleRef.current;
        if (moving && isDriver) driveVehicle(s.vehicle, dx, dy, dt, s.buildings);
        syncPlayerToVehicle(s.player, s.vehicle);
      } else {
        if (moving) movePlayer(s.player, dx, dy, dt, s.buildings);
      }
    }

    if (s.player2 && s.p2Target) {
      const lf = Math.min(1, 12 * dtActual);
      s.player2.x       = lerp(s.player2.x,   s.p2Target.x,   lf);
      s.player2.y       = lerp(s.player2.y,   s.p2Target.y,   lf);
      s.player2.facing  = s.p2Target.facing  ?? s.player2.facing;
      s.player2.inVehicle = s.p2Target.inVehicle;
    }

    const remoteRole = isP1 ? "p2" : "p1";
    if (s.vehicleTarget && s.vehicle.driver === remoteRole) {
      const lf = Math.min(1, 10 * dtActual);
      s.vehicle.x      = lerp(s.vehicle.x,      s.vehicleTarget.x,      lf);
      s.vehicle.y      = lerp(s.vehicle.y,      s.vehicleTarget.y,      lf);
      s.vehicle.facing = lerp(s.vehicle.facing, s.vehicleTarget.facing,  lf);
      s.vehicle.hp     = s.vehicleTarget.hp;
      s.vehicle.fuel   = s.vehicleTarget.fuel;
    }

    if (!isP1 && s.zombieTargets) {
      const lf = Math.min(1, 10 * dtActual);
      s.zombies.forEach(z => {
        const t = s.zombieTargets.get(z.id);
        if (!t) return;
        z.x     = lerp(z.x, t.x, lf);
        z.y     = lerp(z.y, t.y, lf);
        z.state = t.state;
        if (t.dead) { z.dead = true; return; }
        if (!z._p2HitThisFrame) z.hp = t.hp;
        z._p2HitThisFrame = false;
      });
    }

    if (!isP1 && room) {
      const ZOMBIE_DMG_RATE = 0.8;
      const attackR = 7 + 9 + 4;
      s.zombies.forEach(z => {
        if (z.dead) return;
        if (z.state !== "attack" && z.state !== "chase") return;
        const d = Math.sqrt((z.x - s.player.x) ** 2 + (z.y - s.player.y) ** 2);
        if (d > attackR) return;
        if (!z._p2AttackCd || z._p2AttackCd <= 0) {
          s.player.hp = Math.max(0, s.player.hp - 8);
          z._p2AttackCd = ZOMBIE_DMG_RATE;
          addFloater(s, "-8", s.player.x, s.player.y - 15, "rgba(255,80,80,0.9)");
        } else {
          z._p2AttackCd -= dtActual;
        }
      });
    }

    const collapsed = updateNeeds(s.player, dt, s.player.isSleeping, s.player.sleepLocation);
    if (collapsed && s.player.hp > 0) {
      addFloater(s, "💀 collapsed!", s.player.x, s.player.y - 20, "rgba(255,80,80,0.95)", 15);
      s.player.isSleeping = true;
      s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
    }

    // ── Death check ────────────────────────────────────────────────────────
    if (s.player.hp <= 0 && !gameOverFiredRef.current) {
      triggerGameOver(s, { survived: false });
      return;
    }

    // ── Level exit check ───────────────────────────────────────────────────
    if (isP1 && checkLevelExit(s) && !gameOverFiredRef.current) {
      addFloater(s, "🛣️ You found the highway…", s.player.x, s.player.y - 40, "rgba(255,220,80,0.95)", 16);
      triggerGameOver(s, {
        survived: true,
        nextLevel: true,
        dayssurvived: s.dayNumber,
        zombiesKilled: s.zombiesKilled ?? 0,
        buildingsSearched: s.buildingsSearched ?? 0,
        survivorsFound: s.survivorsFound ?? 0,
      });
      return;
    }

    if (isP1) {
      updateZombies(s.zombies, s.player, s.vehicle, dt, s.isNight, s.buildings, s.player2);

      // Track zombie kills before applying damage (count newly-dead)
      const prevDeadCount = s.zombies.filter(z => z.dead).length;

      const { playerDmg, vehicleDmg, p2Dmg } = applyZombieDamage(s.zombies, s.player, s.vehicle, s.buildings, s.player2);
      if (playerDmg > 0) addFloater(s, `-${playerDmg}`, s.player.x, s.player.y - 15, "rgba(255,80,80,0.9)");
      if (vehicleDmg > 0) addFloater(s, `-${vehicleDmg}`, s.vehicle.x, s.vehicle.y - 20, "rgba(255,160,60,0.9)");
      if (p2Dmg > 0 && s.player2) addFloater(s, `-${p2Dmg}`, s.player2.x, s.player2.y - 15, "rgba(255,80,80,0.9)");

      const newDeadCount = s.zombies.filter(z => z.dead).length;
      s.zombiesKilled = (s.zombiesKilled ?? 0) + (newDeadCount - prevDeadCount);

      updateBarricades(s.buildings, s.zombies, dt);
      const doorEvents = updateDoorBashing(s.buildings, s.zombies, dt);
      doorEvents.forEach(ev => {
        const b = s.buildings.find(b2 => b2.id === ev.buildingId);
        if (!b) return;
        if (ev.broken) {
          addFloater(s, `💀 door broken!`, b.x + b.w / 2, b.y - 16, "rgba(255,80,60,0.95)", 14);
        } else if (ev.hp < DOOR_MAX_HP * 0.5) {
          if (ev.hp + 4 >= DOOR_MAX_HP * 0.5) {
            addFloater(s, `door cracking…`, b.x + b.w / 2, b.y - 14, "rgba(255,160,60,0.85)", 12);
          }
        }
        if (room) {
          const door = b.doors?.find(d => d.id === ev.doorId);
          if (door) sendDoorUpdate(b.id, door.id, door.open, door.hp ?? 0, !!door.broken);
        }
      });
      updateNightSpawns(s, dt);
    }

    if (s.player.inVehicle) updateVehicleCollisions(s.vehicle, s.zombies, dt, s.buildings);

    if (keysRef.current[" "]) {
      const prevDeadForAttack = s.zombies.filter(z => z.dead).length;
      const hits = playerAttack(s.player, s.zombies, dt);
      if (isP1) {
        const newDeadForAttack = s.zombies.filter(z => z.dead).length;
        s.zombiesKilled = (s.zombiesKilled ?? 0) + (newDeadForAttack - prevDeadForAttack);
      }
      hits.forEach(() =>
        addFloater(s, "hit!", s.player.x + (Math.random()-0.5)*20, s.player.y-15, "rgba(255,200,80,0.85)")
      );
      if (!isP1 && room && hits.length > 0) {
        hits.forEach(id => {
          const z = s.zombies.find(z2 => z2.id === id);
          if (z) z._p2HitThisFrame = true;
        });
        sendZombieUpdate(s.zombies.filter(z => !z.dead));
      }
    }

    if (isP1) {
      updateCrops(s.crops, dt).forEach(() =>
        addFloater(s, "Crop ready! (F to harvest)", s.player.x, s.player.y - 30, "rgba(120,220,80,0.95)", 14)
      );
      const flipped = updateDayNight(s, dt);
      if (flipped) {
        const msg = s.isNight ? "🌙 Night is falling..." : "☀️ Dawn";
        addFloater(s, msg, s.player.x, s.player.y - 40, s.isNight ? "rgba(120,160,255,0.9)" : "rgba(255,200,80,0.9)", 16);
        if (room) sendPhaseChange(s.isNight ? "night" : "day", s.dayNumber);
      }
    }

    updateFloaters(s.floaters, dt);
    updateCamera(s.cam, s.player, s.vehicle, W, H);

    if (room) {
      if (now - lastMoveRef.current > MOVE_THROTTLE) {
        lastMoveRef.current = now;
        sendMyMove(s.player.x, s.player.y, s.player.facing, s.player.inVehicle);
      }
      if (now - lastSyncRef.current > SYNC_THROTTLE) {
        lastSyncRef.current = now;
        if (s.player.inVehicle && s.vehicle.driver === roleRef.current) {
          sendVehicleUpdate(s.vehicle.x, s.vehicle.y, s.vehicle.facing, s.vehicle.hp, s.vehicle.fuel, s.vehicle.driver, s.vehicle.passenger);
        } else if (s.player.inVehicle && s.vehicle.passenger === roleRef.current) {
          sendVehicleUpdate(s.vehicle.x, s.vehicle.y, s.vehicle.facing, s.vehicle.hp, s.vehicle.fuel, s.vehicle.driver, s.vehicle.passenger);
        }
        if (isP1) sendZombieUpdate(s.zombies.filter(z => !z.dead));
      }
      if (now - lastNeedsRef.current > NEEDS_THROTTLE) {
        lastNeedsRef.current = now;
        sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp);
      }
    }

    if (s.tick % 6 === 0) {
      const isDriver = s.vehicle.driver === roleRef.current;
      const isPassenger = s.vehicle.passenger === roleRef.current;
      setHud({
        food: s.player.food, water: s.player.water,
        sleep: s.player.sleep, hp: s.player.hp,
        dayNumber: s.dayNumber, isNight: s.isNight,
        dayTimer: s.dayTimer, debuffs: s.player.debuffs,
        fuel: s.vehicle.fuel, inVehicle: s.player.inVehicle,
        isDriver, isPassenger,
        weapon: s.player.weapon,
        isFastSleeping: s.isFastSleeping,
        holdZ: holdZRef.current,
        isSleeping: s.player.isSleeping,
        vehicleDriver: s.vehicle.driver,
        vehiclePassenger: s.vehicle.passenger,
        mapFragmentCollected: s.mapFragmentCollected,
        vehicleHp: s.vehicle.hp,
        vehicleMaxHp: s.vehicle.maxHp,
      });
      setCtxActions(getProximityActions(
        s.player, s.buildings, s.vehicle, s.gardenPlots, s.crops, s.lootPiles, s.wells
      ));
    }

    const ctx = canvas.getContext("2d");
    ctx.save(); ctx.scale(dpr, dpr);
    draw(ctx, s, t, W, H);
    ctx.restore();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, s, t, W, H) {
    const { cam, player, player2, vehicle, buildings, zombies, floaters,
            gardenPlots, crops, lootPiles, wells, isNight } = s;

    ctx.fillStyle = isNight ? "#040609" : "#08090c";
    ctx.fillRect(0, 0, W, H);

    const { cx: wox, cy: woy } = worldToCanvas(0, 0, cam);
    ctx.fillStyle = isNight ? "#0d100b" : "#111510";
    ctx.fillRect(wox, woy, WORLD_W, WORLD_H);

    // Roads
    ctx.save();
    ctx.strokeStyle = isNight ? "#181c18" : "#1e2220";
    ctx.lineWidth = 42; ctx.lineCap = "round";
    s.roads.forEach(r => {
      const a = worldToCanvas(r.x1, r.y1, cam), b2 = worldToCanvas(r.x2, r.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 18]);
    s.roads.forEach(r => {
      const a = worldToCanvas(r.x1, r.y1, cam), b2 = worldToCanvas(r.x2, r.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.restore();

    // Garden plots
    gardenPlots.forEach(plot => {
      const { cx, cy } = worldToCanvas(plot.x, plot.y, cam);
      const crop = crops.find(c => c.plotId === plot.id);
      ctx.save();
      ctx.fillStyle = crop?.stage === "ready" ? "rgba(80,180,40,0.22)" : "rgba(40,90,20,0.22)";
      ctx.strokeStyle = crop?.stage === "ready" ? "rgba(100,210,60,0.6)" : "rgba(60,120,30,0.4)";
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.fillRect(cx, cy, plot.w, plot.h);
      ctx.strokeRect(cx, cy, plot.w, plot.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      if (crop) {
        const pct = Math.min(1, crop.growTimer / crop.growTime);
        ctx.fillText(crop.stage === "ready" ? "🌿 F to harvest" : `${Math.floor(pct*100)}% grown`, cx + plot.w/2, cy + plot.h/2 + 4);
      } else {
        ctx.fillText("garden plot · F to plant", cx + plot.w/2, cy + plot.h/2 + 4);
      }
      ctx.restore();
    });

    // Wells
    if (wells) {
      wells.forEach(well => {
        const { cx: wx, cy: wy } = worldToCanvas(well.x, well.y, cam);
        ctx.save();
        ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,145,120,0.92)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,60,100,0.85)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx - 2, wy - 2, 4 + 1.5 * Math.sin(t * 2.2), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,160,255,0.35)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,185,155,0.7)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "rgba(140,100,55,0.85)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx - 13, wy - 10); ctx.lineTo(wx - 13, wy + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx + 13, wy - 10); ctx.lineTo(wx + 13, wy + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx - 13, wy - 10); ctx.lineTo(wx + 13, wy - 10); ctx.stroke();
        ctx.fillStyle = "rgba(180,230,255,0.7)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💧 well", wx, wy + 22);
        ctx.restore();
      });
    }

    // Buildings
    buildings.forEach(b => { drawBuilding(ctx, b, cam, isNight, player); });

    // Loot piles (glow)
    lootPiles.forEach(pile => {
      if (pile.collected) return;
      const { cx, cy } = worldToCanvas(pile.x, pile.y, cam);
      const pulse = 0.6 + 0.4 * Math.sin(t * 3.5);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,60,${0.08 * pulse})`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,60,${0.8 * pulse})`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,200,0.6)"; ctx.fill();
      ctx.restore();
    });

    // Vehicle
    {
      const { cx, cy } = worldToCanvas(vehicle.x, vehicle.y, cam);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(vehicle.facing + Math.PI / 2);
      ctx.fillStyle = vehicle.hp < vehicle.maxHp * 0.3 ? "rgba(255,120,40,0.85)" : "rgba(200,200,180,0.9)";
      ctx.fillRect(-12, -22, 24, 44);
      ctx.fillStyle = "rgba(120,180,255,0.3)"; ctx.fillRect(-9, -18, 18, 12);
      if (vehicle.hp < vehicle.maxHp) {
        ctx.rotate(-(vehicle.facing + Math.PI / 2));
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-14, -30, 28, 3);
        ctx.fillStyle = vehicle.hp / vehicle.maxHp > 0.5 ? "#88ff88" : "#ff5555";
        ctx.fillRect(-14, -30, 28 * (vehicle.hp / vehicle.maxHp), 3);
      }
      ctx.restore();

      if (!player.inVehicle) {
        const d = Math.sqrt((player.x - vehicle.x)**2 + (player.y - vehicle.y)**2);
        if (d < 70) {
          const driverFree    = vehicle.driver === null;
          const passengerFree = vehicle.passenger === null;
          const bothFull      = !driverFree && !passengerFree;
          ctx.save();
          ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          if (bothFull) {
            ctx.fillStyle = "rgba(255,100,100,0.75)";
            ctx.fillText("full", cx, cy - 34);
          } else {
            ctx.fillStyle = "rgba(255,220,80,0.85)";
            ctx.fillText(driverFree ? "[F] drive" : "[F] ride shotgun", cx, cy - 34);
          }
          // Show repair prompt if nearby
          if (d < REPAIR_RANGE && vehicle.hp < vehicle.maxHp) {
            ctx.fillStyle = "rgba(120,255,150,0.75)";
            ctx.fillText("[E] repair", cx, cy - 46);
          }
          ctx.restore();
        }
      }
    }

    // Zombies
    zombies.forEach(z => {
      if (z.dead) return;
      const { cx, cy } = worldToCanvas(z.x, z.y, cam);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save(); ctx.globalAlpha = 0.88;
      const isBashing = z.state === "bash_door";
      const offX = isBashing ? (Math.random() - 0.5) * 3 : 0;
      const offY = isBashing ? (Math.random() - 0.5) * 3 : 0;
      ctx.beginPath(); ctx.arc(cx + offX, cy + offY, z.radius, 0, Math.PI * 2);
      ctx.fillStyle = isBashing ? "rgba(255,80,0,0.95)"
        : z.state === "chase" || z.state === "attack" ? COL.zombieChase : COL.zombie;
      ctx.fill();
      if (isBashing) {
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 12);
        ctx.strokeStyle = "rgba(255,140,0,0.9)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + offX, cy + offY, z.radius + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "rgba(255,180,0,0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💥", cx, cy - z.radius - 3);
      } else if (z.state === "alert") {
        ctx.globalAlpha = 0.9; ctx.fillStyle = "rgba(255,220,40,0.9)";
        ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("!", cx, cy - z.radius - 3);
      }
      const hpFrac = z.hp / z.maxHp;
      if (hpFrac < 1) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(cx - 8, cy - z.radius - 5, 16, 2.5);
        ctx.fillStyle = "#ff4444"; ctx.fillRect(cx - 8, cy - z.radius - 5, 16 * hpFrac, 2.5);
      }
      ctx.restore();
    });

    // P2
    if (player2 && !player2.inVehicle) {
      const { cx, cy } = worldToCanvas(player2.x, player2.y, cam);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 11 + 1.5*Math.sin(t*3), 0, Math.PI*2);
      ctx.fillStyle = "rgba(120,200,255,0.1)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
      ctx.fillStyle = COL.player2; ctx.fill();
      ctx.restore();
    }

    // Player
    if (!player.inVehicle) {
      const { cx, cy } = worldToCanvas(player.x, player.y, cam);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 13 + 2*Math.sin(t*3), 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,180,60,0.08)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
      ctx.fillStyle = player.hp <= 0 ? "rgba(255,80,80,0.5)" : COL.player; ctx.fill();
      if (player.weapon && player.attackCooldown > 0) {
        ctx.globalAlpha = player.attackCooldown * 2;
        ctx.strokeStyle = "rgba(255,220,80,0.9)"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(player.facing)*28, cy + Math.sin(player.facing)*28);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Map fragment compass arrow ─────────────────────────────────────────
    if (s.mapFragmentCollected) {
      drawCompassArrow(ctx, s, t, W, H);
    }

    // Floaters
    floaters.forEach(f => {
      const { cx, cy } = worldToCanvas(f.x, f.y, cam);
      ctx.save(); ctx.globalAlpha = 1 - f.age / f.ttl;
      ctx.fillStyle = f.color ?? "rgba(255,220,80,0.95)";
      ctx.font = `${f.size ?? 12}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(f.text, cx, cy - f.age * 24); ctx.restore();
    });

    // Night vignette
    if (isNight) {
      const grad = ctx.createRadialGradient(W/2, H/2, H*0.14, W/2, H/2, H*0.78);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,12,0.76)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }

    drawMinimap(ctx, s, W, H);
    drawJoystick(ctx, joystickRef.current, W, H);
  }

  // ── Compass arrow toward north exit ───────────────────────────────────────
  function drawCompassArrow(ctx, s, t, W, H) {
    const playerX = s.player.inVehicle ? s.vehicle.x : s.player.x;
    const playerY = s.player.inVehicle ? s.vehicle.y : s.player.y;

    // Direction from player to exit target
    const dx = EXIT_TARGET_X - playerX;
    const dy = EXIT_TARGET_Y - playerY;
    const angle = Math.atan2(dy, dx);
    const distToExit = Math.sqrt(dx * dx + dy * dy);

    // Pulse when close
    const alpha = distToExit < 800
      ? 0.7 + 0.3 * Math.sin(t * 6)
      : 0.7 + 0.15 * Math.sin(t * 2);

    // Arrow position — top-center area
    const arrowX = W / 2;
    const arrowY = 60;
    const arrowLen = 28;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle + Math.PI / 2); // +90° because our arrow points up by default

    // Draw chevron arrow
    ctx.strokeStyle = "rgba(255,220,80,0.95)";
    ctx.fillStyle   = "rgba(255,220,80,0.85)";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";

    ctx.beginPath();
    ctx.moveTo(0, -arrowLen / 2);
    ctx.lineTo(10, arrowLen / 2 - 4);
    ctx.lineTo(0, arrowLen / 2 - 12);
    ctx.lineTo(-10, arrowLen / 2 - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Label below the arrow
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "rgba(255,220,80,0.9)";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("find the highway →", arrowX, arrowY + 28);
    if (distToExit < 1500) {
      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${Math.round(distToExit / 10)}m away`, arrowX, arrowY + 42);
    }
    ctx.restore();
  }

  function drawBuilding(ctx, b, cam, isNight, player) {
    const { cx: bx, cy: by } = worldToCanvas(b.x, b.y, cam);
    ctx.save();
    const insidePlayer = isInsideBuilding(player, b);
    ctx.fillStyle = insidePlayer ? "rgba(255,255,240,0.07)" : "rgba(255,255,240,0.03)";
    ctx.fillRect(bx, by, b.w, b.h);

    if (b.barricadeHp > 0) {
      const frac = b.barricadeHp / (120 * (b.barricadeDoors ?? 1));
      ctx.fillStyle = "rgba(100,70,10,0.5)"; ctx.fillRect(bx + 2, by + b.h - 5, b.w - 4, 4);
      ctx.fillStyle = frac > 0.5 ? "#a07820" : "#cc4422"; ctx.fillRect(bx + 2, by + b.h - 5, (b.w-4)*frac, 4);
    }

    const WALL_W = 6;
    const wallColor = b.barricadeHp > 0
      ? "rgba(160,120,40,0.95)"
      : isNight ? "rgba(200,190,160,0.75)" : "rgba(210,200,175,0.92)";
    ctx.strokeStyle = wallColor; ctx.lineWidth = WALL_W; ctx.lineCap = "square";

    const segs = getBuildingWallSegments(b);
    segs.forEach(seg => {
      const a = worldToCanvas(seg.x1, seg.y1, cam);
      const bpt = worldToCanvas(seg.x2, seg.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(bpt.cx, bpt.cy); ctx.stroke();
    });

    if (b.doors) {
      b.doors.forEach(door => {
        const dc = getDoorCenter(b, door);
        const { cx: dcx, cy: dcy } = worldToCanvas(dc.x, dc.y, cam);
        const hw = door.width / 2;
        ctx.lineWidth = WALL_W; ctx.lineCap = "round";
        if (door.open) {
          ctx.strokeStyle = "rgba(120,80,30,0.85)";
          const perp = (door.side === "north" || door.side === "south") ? { dx: 0, dy: 1 } : { dx: 1, dy: 0 };
          const spt = worldToCanvas(
            dc.x + perp.dx * (door.side === "west" || door.side === "north" ? -door.width : door.width),
            dc.y + perp.dy * (door.side === "west" || door.side === "north" ? -door.width : door.width),
            cam
          );
          ctx.beginPath(); ctx.moveTo(dcx, dcy); ctx.lineTo(spt.cx, spt.cy); ctx.stroke();
          if (door.broken) {
            ctx.strokeStyle = "rgba(180,40,40,0.7)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(dcx, dcy); ctx.lineTo(spt.cx, spt.cy); ctx.stroke();
          }
        } else {
          const hpFrac = (door.hp ?? DOOR_MAX_HP) / DOOR_MAX_HP;
          ctx.strokeStyle = hpFrac > 0.6 ? "rgba(100,65,30,0.95)"
            : hpFrac > 0.3 ? "rgba(180,90,20,0.95)" : "rgba(220,40,20,0.95)";
          ctx.lineWidth = 4;
          const isHoriz = door.side === "north" || door.side === "south";
          const a2 = worldToCanvas(isHoriz ? dc.x - hw : dc.x, isHoriz ? dc.y : dc.y - hw, cam);
          const b2 = worldToCanvas(isHoriz ? dc.x + hw : dc.x, isHoriz ? dc.y : dc.y + hw, cam);
          ctx.beginPath(); ctx.moveTo(a2.cx, a2.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
          if (hpFrac < 1) {
            const barW = door.width - 4, barH = 3;
            const barX = dcx - barW / 2, barY = dcy - 9;
            ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = hpFrac > 0.5 ? "#cc8833" : "#dd3322";
            ctx.fillRect(barX, barY, barW * hpFrac, barH);
          }
        }
      });
    }

    ctx.fillStyle = "rgba(255,245,220,0.5)";
    ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(b.label, bx + b.w / 2, by + b.h / 2);
    if (b.zombieGuards) {
      ctx.fillStyle = "rgba(220,60,60,0.85)"; ctx.font = "bold 12px sans-serif";
      ctx.fillText("⚠", bx + b.w - 10, by + 14);
    }
    ctx.restore();
  }

  function drawMinimap(ctx, s, W, H) {
    const MM = 90, pad = 12;
    const mx = W - MM - pad, my = pad;
    const sx = MM / WORLD_W, sy = MM / WORLD_H;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(mx, my, MM, MM);
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, MM, MM);
    s.buildings.forEach(b => {
      const hasLoot = s.lootPiles.some(p => p.buildingId === b.id && !p.collected);
      ctx.fillStyle = hasLoot ? "rgba(255,220,80,0.4)" : "rgba(255,255,255,0.15)";
      ctx.fillRect(mx + b.x*sx, my + b.y*sy, Math.max(3, b.w*sx), Math.max(3, b.h*sy));
    });
    ctx.fillStyle = "#cc2222";
    s.zombies.filter(z => !z.dead).forEach(z => {
      ctx.beginPath(); ctx.arc(mx + z.x*sx, my + z.y*sy, 1.5, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = "rgba(200,200,180,0.8)";
    ctx.beginPath(); ctx.arc(mx + s.vehicle.x*sx, my + s.vehicle.y*sy, 2.5, 0, Math.PI*2); ctx.fill();
    if (s.wells) {
      ctx.fillStyle = "rgba(80,160,255,0.7)";
      s.wells.forEach(w => {
        ctx.beginPath(); ctx.arc(mx + w.x*sx, my + w.y*sy, 2.5, 0, Math.PI*2); ctx.fill();
      });
    }
    // Draw exit marker on minimap when fragment collected
    if (s.mapFragmentCollected) {
      ctx.fillStyle = "rgba(255,220,80,0.9)";
      ctx.beginPath();
      ctx.arc(mx + EXIT_TARGET_X * sx, my + EXIT_TARGET_Y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,80,0.6)";
      ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("EXIT", mx + EXIT_TARGET_X * sx, my + EXIT_TARGET_Y * sy + 10);
    }
    ctx.fillStyle = COL.player;
    ctx.beginPath(); ctx.arc(mx + s.player.x*sx, my + s.player.y*sy, 3, 0, Math.PI*2); ctx.fill();
    if (s.player2) {
      ctx.fillStyle = COL.player2;
      ctx.beginPath(); ctx.arc(mx + s.player2.x*sx, my + s.player2.y*sy, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // Touch
  const joystickTouchIds = useRef(new Set());
  function onTouchStart(e) {
    const canvas = canvasRef.current;
    for (const touch of e.changedTouches) {
      const rect = canvas?.getBoundingClientRect();
      if (rect && touch.clientY >= rect.top + rect.height / 2) {
        e.preventDefault();
        joystickTouchIds.current.add(touch.identifier);
        joystickTouchStart(joystickRef.current, touch);
      }
    }
  }
  function onTouchMove(e) {
    let isDrag = false;
    for (const touch of e.changedTouches) {
      if (!joystickTouchIds.current.has(touch.identifier)) continue;
      if (joystickTouchMove(joystickRef.current, touch) === "drag") isDrag = true;
    }
    if (isDrag) e.preventDefault();
  }
  function onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      joystickTouchIds.current.delete(touch.identifier);
      joystickTouchEnd(joystickRef.current, touch);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#08090c", touchAction: "pan-y", userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} />

      {/* Day/night */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="text-xs tracking-widest px-3 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", color: hud.isNight ? "rgba(140,170,255,0.9)" : "rgba(255,200,80,0.9)", border: `1px solid ${hud.isNight ? "rgba(140,170,255,0.15)" : "rgba(255,200,80,0.15)"}` }}>
          {hud.isNight ? "🌙" : "☀️"} Day {hud.dayNumber}
        </div>
        <div className="mt-1 rounded-full overflow-hidden" style={{ width: 80, height: 3, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height:"100%", width:`${Math.max(0,(hud.dayTimer??0)/300*100)}%`, background: hud.isNight ? "rgba(140,170,255,0.7)" : "rgba(255,200,80,0.7)", transition:"width 0.3s linear" }} />
        </div>
      </div>

      {/* Needs */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        <NeedsBar label="❤️" value={hud.hp}    max={100} color="#ff5555" warn={30} />
        <NeedsBar label="🍞" value={hud.food}  max={100} color="#f0a030" warn={NEEDS_TUNE.food.warnAt}  crit={NEEDS_TUNE.food.critAt} />
        <NeedsBar label="💧" value={hud.water} max={100} color="#44aaff" warn={NEEDS_TUNE.water.warnAt} crit={NEEDS_TUNE.water.critAt} />
        <NeedsBar label="😴" value={hud.sleep} max={100} color="#9966ff" warn={NEEDS_TUNE.sleep.warnAt} crit={NEEDS_TUNE.sleep.critAt} />
        {hud.inVehicle && <NeedsBar label="⛽" value={hud.fuel ?? 0} max={100} color="#88dd44" warn={25} crit={10} />}
        {hud.inVehicle && <NeedsBar label="🚗" value={hud.vehicleHp ?? 0} max={hud.vehicleMaxHp ?? 300} color="#88aaff" warn={80} crit={40} />}
      </div>

      {/* Vehicle role badge */}
      {hud.inVehicle && (
        <div className="absolute bottom-44 left-4 pointer-events-none">
          <div className="text-xs px-2 py-1 rounded"
            style={{ background: "rgba(0,0,0,0.55)", color: hud.isDriver ? "rgba(255,220,80,0.9)" : "rgba(120,200,255,0.9)", border: `1px solid ${hud.isDriver ? "rgba(255,220,80,0.2)" : "rgba(120,200,255,0.2)"}` }}>
            {hud.isDriver ? "🚗 driver" : "🪑 passenger"}
          </div>
        </div>
      )}

      {/* Debuffs */}
      {hud.debuffs?.length > 0 && (
        <div className="absolute bottom-32 left-4 flex flex-col gap-1 pointer-events-none" style={{ marginBottom: hud.inVehicle ? 36 : 0 }}>
          {hud.debuffs.map(d => (
            <div key={d} className="text-xs px-2 py-0.5 rounded" style={{ background:"rgba(200,50,50,0.7)", color:"rgba(255,200,200,0.95)" }}>{d}</div>
          ))}
        </div>
      )}

      {/* Weapon */}
      {hud.weapon && (
        <div className="absolute bottom-4 right-4 text-xs px-2 py-1 rounded pointer-events-none"
          style={{ background:"rgba(0,0,0,0.55)", color:"rgba(255,220,80,0.9)", border:"1px solid rgba(255,220,80,0.18)" }}>
          🪓 {hud.weapon} · Space to swing
        </div>
      )}

      {/* Map fragment banner */}
      {hud.mapFragmentCollected && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{ background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,220,80,0.35)", color:"rgba(255,220,80,0.9)" }}>
            🗺️ <span>Drive north to the highway exit</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-lg pointer-events-none"
          style={{ background:"rgba(0,0,0,0.72)", color:notification.color, border:"1px solid rgba(255,255,255,0.1)" }}>
          {notification.text}
        </div>
      )}

      {/* Danger flash */}
      {sleepFlash && (
        <div className="absolute inset-0 pointer-events-none z-50"
          style={{ background: "rgba(255,30,30,0.35)", animation: "none" }} />
      )}

      {/* Fast-sleep badge */}
      {hud.isFastSleeping && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2 z-20">
          <div className="text-2xl">⏩</div>
          <div className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background: "rgba(0,0,0,0.75)", color: "rgba(160,140,255,0.95)", border: "1px solid rgba(140,120,255,0.3)" }}>
            fast-sleeping — press Z to wake
          </div>
        </div>
      )}

      {/* Hold-Z progress bar */}
      {hud.isSleeping && !hud.isFastSleeping && hud.holdZ > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-20"
          style={{ marginTop: 32, width: 140 }}>
          <div className="text-xs text-center mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>hold Z to fast-sleep</div>
          <div className="rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.1)" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (hud.holdZ / 1.0) * 100)}%`, background: "rgba(160,140,255,0.8)", transition: "width 0.05s linear" }} />
          </div>
        </div>
      )}

      {/* Context actions */}
      {contextActions.length > 0 && !showInventory && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none" style={{ minWidth: 220 }}>
          {contextActions.slice(0, 4).map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full"
              style={{ background:"rgba(0,0,0,0.72)", border:"1px solid rgba(255,255,255,0.1)" }}>
              <span className="font-mono font-bold px-1.5 py-0.5 rounded text-xs shrink-0"
                style={{ background:"rgba(255,220,80,0.12)", color:"rgba(255,220,80,0.95)", border:"1px solid rgba(255,220,80,0.28)", minWidth: 52, textAlign:"center" }}>
                {a.key}
              </span>
              <span style={{ color:"rgba(255,255,255,0.72)" }}>{a.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top-left HUD buttons */}
      <div className="absolute top-3 left-3 flex gap-2">
        <button onClick={() => setShowControls(v => !v)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.45)" }}>
          {showControls ? "✕" : "?"} controls
        </button>
        <button onClick={() => setShowInv(v => !v)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,220,80,0.7)" }}>
          [I] inventory
        </button>
      </div>

      {/* Controls panel */}
      {showControls && (
        <div className="absolute top-12 left-3 rounded-xl p-3 text-xs z-20"
          style={{ background:"rgba(8,9,12,0.95)", border:"1px solid rgba(255,255,255,0.1)", minWidth: 220, maxWidth: 240 }}>
          <div className="text-xs tracking-widest mb-2 font-medium" style={{ color:"rgba(255,200,80,0.7)" }}>CONTROLS</div>
          {[
            ["WASD / ↑↓←→", "Move / steer (driver only)"],
            ["F", "Interact (doors, loot, vehicle, crops)"],
            ["E", "Repair vehicle (needs car parts)"],
            ["B", "Barricade building"],
            ["Q", "Eat food"],
            ["R", "Drink water"],
            ["Z", "Sleep / wake"],
            ["I", "Inventory"],
            ["Space", "Attack"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-start gap-2 mb-1.5">
              <span className="font-mono font-bold shrink-0 px-1.5 py-0.5 rounded"
                style={{ background:"rgba(255,220,80,0.1)", color:"rgba(255,220,80,0.85)", border:"1px solid rgba(255,220,80,0.2)", minWidth:64, textAlign:"center" }}>
                {key}
              </span>
              <span style={{ color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>{desc}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 text-xs" style={{ borderTop:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.22)" }}>
            Find a map fragment to reveal the highway exit. Drive north to escape!
          </div>
        </div>
      )}

      {/* Inventory panel */}
      {showInventory && (
        <InventoryPanel
          inventory={inventory}
          player={stateRef.current?.player}
          onClose={() => setShowInv(false)}
          onEat={() => {
            const s = stateRef.current; if (!s) return;
            if (eatFood(s.player)) { notify("Ate food (+25 🍞)"); setInv({ ...s.player.inventory }); }
            else notify("No food!", "rgba(255,100,100,0.95)");
          }}
          onDrink={() => {
            const s = stateRef.current; if (!s) return;
            const ok = drinkWater(s.player, s.buildings, s.wells);
            if (ok) { notify(ok.source === "well" ? "Drank from well" : "Drank water"); setInv({ ...s.player.inventory }); }
            else notify("No water!", "rgba(255,100,100,0.95)");
          }}
        />
      )}

      {/* P2 badge */}
      {room && (
        <div className="absolute top-3 right-28 text-xs pointer-events-none"
          style={{ color: p2Connected ? "rgba(120,200,255,0.7)" : "rgba(255,255,255,0.2)" }}>
          {p2Connected ? "● P2" : "○ P2 away"}
        </div>
      )}
    </div>
  );
}

// ─── Needs bar ────────────────────────────────────────────────────────────────

function NeedsBar({ label, value, max, color, warn = 35, crit = 15 }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const isCrit = value <= crit, isWarn = value <= warn && !isCrit;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-4 text-center" style={{ opacity: 0.65 }}>{label}</span>
      <div className="rounded-full overflow-hidden" style={{ width: 88, height: 5, background:"rgba(255,255,255,0.08)" }}>
        <div style={{ height:"100%", width:`${pct*100}%`, background: isCrit ? "#ff3333" : isWarn ? "#ff9900" : color, transition:"width 0.4s ease, background 0.3s ease" }} />
      </div>
    </div>
  );
}

// ─── Inventory panel ──────────────────────────────────────────────────────────

const ITEM_META = {
  food:         { icon: "🍞", name: "Food",        desc: "Press Q to eat (+25 food)" },
  water:        { icon: "💧", name: "Water",       desc: "Press R to drink (+30 water)" },
  wood:         { icon: "🪵", name: "Wood",        desc: "Used for barricading" },
  nails:        { icon: "📌", name: "Nails",       desc: "Used for barricading" },
  tools:        { icon: "🔧", name: "Tools",       desc: "Useful for repairs" },
  bat:          { icon: "🪓", name: "Baseball Bat",desc: "Melee weapon — auto-equipped" },
  seeds:        { icon: "🌱", name: "Seeds",       desc: "Plant in a garden (F near plot)" },
  car_parts:    { icon: "⚙️",  name: "Car Parts",  desc: "Press E near vehicle to repair (+40 HP)" },
  fuel:         { icon: "⛽", name: "Fuel",        desc: "Auto-applied to vehicle tank" },
  map_fragment: { icon: "🗺️", name: "Map Fragment",desc: "Shows the highway exit — drive north!" },
};

function InventoryPanel({ inventory, player, onClose, onEat, onDrink }) {
  const items = Object.entries(inventory || {}).filter(([, qty]) => qty > 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 380, maxHeight: "80vh", background:"rgba(8,9,12,0.97)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color:"rgba(255,200,80,0.85)" }}>Inventory</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.05)" }}>
            ESC / close
          </button>
        </div>
        {player && (
          <div className="px-5 py-3 grid grid-cols-2 gap-2" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            {[
              { label:"Health", val: player.hp,    color:"#ff5555" },
              { label:"Food",   val: player.food,  color:"#f0a030" },
              { label:"Water",  val: player.water, color:"#44aaff" },
              { label:"Sleep",  val: player.sleep, color:"#9966ff" },
            ].map(n => (
              <div key={n.label} className="flex items-center gap-2">
                <span className="text-xs w-12" style={{ color:"rgba(255,255,255,0.4)" }}>{n.label}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height:4, background:"rgba(255,255,255,0.08)" }}>
                  <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,n.val))}%`, background: n.val < 20 ? "#ff3333" : n.val < 40 ? "#ff9900" : n.color, transition:"width 0.3s" }} />
                </div>
                <span className="text-xs w-6 text-right" style={{ color:"rgba(255,255,255,0.3)" }}>{Math.floor(n.val)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 flex gap-2" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onEat}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background:"rgba(240,160,48,0.12)", border:"1px solid rgba(240,160,48,0.25)", color:"rgba(240,160,48,0.9)" }}>
            🍞 Eat food (Q)
          </button>
          <button onClick={onDrink}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background:"rgba(68,170,255,0.12)", border:"1px solid rgba(68,170,255,0.25)", color:"rgba(68,170,255,0.9)" }}>
            💧 Drink water (R)
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: 320 }}>
          {items.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color:"rgba(255,255,255,0.2)" }}>
              No items. Explore buildings and press F near loot.
            </div>
          ) : (
            items.map(([type, qty]) => {
              const meta = ITEM_META[type] ?? { icon: "📦", name: type, desc: "" };
              return (
                <div key={type} className="flex items-center gap-3 px-2 py-2.5 rounded-lg mb-1"
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-xl w-8 text-center">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color:"rgba(255,255,255,0.75)" }}>{meta.name}</div>
                    <div className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.3)" }}>{meta.desc}</div>
                  </div>
                  <div className="text-sm font-mono font-bold" style={{ color:"rgba(255,220,80,0.85)", minWidth:28, textAlign:"right" }}>
                    ×{qty}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {player?.weapon && (
          <div className="px-5 py-3" style={{ borderTop:"1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-xs mb-1" style={{ color:"rgba(255,255,255,0.3)" }}>equipped weapon</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background:"rgba(255,220,80,0.07)", border:"1px solid rgba(255,220,80,0.2)" }}>
              <span className="text-base">🪓</span>
              <span className="text-xs font-medium" style={{ color:"rgba(255,220,80,0.9)" }}>{player.weapon}</span>
              <span className="ml-auto text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>Space to swing</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}