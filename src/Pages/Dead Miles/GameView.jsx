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
  checkLevelExit, updateCastAction,
  collectMapFragment, checkEndgame, FRAGMENT_PULSE_RANGE,
  WORLD_W, WORLD_H, PLAYER_RADIUS, ZOMBIE_RADIUS,
  NEEDS_TUNE, LOOT_RANGE, DOOR_MAX_HP, REPAIR_RANGE, REPAIR_HP_GAIN,
  BARRICADE_COST_WOOD, BARRICADE_COST_NAILS,
  MELEE_RANGE, MELEE_ARC,
  dist, lerp, shouldInterruptFastSleep, createZombie,
  BOSS_HP, BOSS_RADIUS,
  // Sound system
  createSoundEvent, updateSoundEvents,
  VEHICLE_ENGINE_RANGE, COMBAT_SOUND_RANGE,
  // Turrets & placement
  tryPlaceTurret, updateTurrets, tryRepairTurret, applyTurretDamage,
  tryPlaceCropPlot,
  TURRET_COST, TURRET_HP, TURRET_RANGE, TURRET_REPAIR_RANGE, TURRET_REPAIR_COST_SCRAP, TURRET_REPAIR_HP,
  // Survivor AI
  updateSurvivors, tryAssignSurvivor,
  SURVIVOR_INTERACT_RANGE, SURVIVOR_REPAIR_CAST, SURVIVOR_HARVEST_CAST,
  // Convoy AI
  updateConvoyVehicles,
  assignSurvivorToConvoy,
  CONVOY_GAP_FAR, CONVOY_GAP_NEAR,
  // Vehicle types
  VEHICLE_TYPES,
  // Opening horror
  activateAwakeningRing,
  // Phase 2: base screen
  pushActivity,
  WEATHER_TYPES,
  getCurrentWeather,
  updateWeather,
  CROP_TYPES,
  getSeasonalBonus,
  getInventoryCount,
  addToInventory,

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

function drawPathToTarget(ctx, player, target, cam, W, H, s) {
  if (!target || !target.x || !target.y) return;
  
  const playerX = player.inVehicle ? s.vehicle.x : player.x;
  const playerY = player.inVehicle ? s.vehicle.y : player.y;
  const distToTarget = Math.hypot(target.x - playerX, target.y - playerY);
  
  if (distToTarget < 500) return;
  
  const start = worldToCanvas(playerX, playerY, cam);
  const end = worldToCanvas(target.x, target.y, cam);
  
  if (start.cx < -100 || start.cx > W + 100 || start.cy < -100 || start.cy > H + 100) return;
  if (end.cx < -100 || end.cx > W + 100 || end.cy < -100 || end.cy > H + 100) return;
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(start.cx, start.cy);
  ctx.lineTo(end.cx, end.cy);
  ctx.strokeStyle = "rgba(255,220,80,0.35)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 12]);
  ctx.stroke();
  
  const angle = Math.atan2(end.cy - start.cy, end.cx - start.cx);
  const arrowSize = 10;
  const arrowX = end.cx;
  const arrowY = end.cy;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.fillStyle = "rgba(255,220,80,0.5)";
  ctx.fill();
  ctx.setLineDash([]);
  ctx.restore();
}

export default function GameView({ room, role = "p1", onGameOver, level = 1, onStateSnapshot, onOpenBase, activityLog }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef(createJoystick());
  const rafRef      = useRef(null);
  const holdZRef        = useRef(0);
  const zHoldActiveRef  = useRef(false);
  const flashRef        = useRef(0);
  const gameOverFiredRef = useRef(false);
  // Opening horror refs
  const powerMomentRef  = useRef(0);   // countdown timer for the vehicle power-surge effect (seconds)
  const powerZoomRef    = useRef(1);   // current zoom scale (1 = normal, >1 = zoomed out)

  const [quickSlotItems, setQuickSlotItems] = useState(["food", "water", null, null, null]);

  // ── Cast system ───────────────────────────────────────────────────────────
  // castActionRef: { type, duration, elapsed, onComplete, label, icon } | null
  const castActionRef = useRef(null);
  // castBar is driven entirely via hud.castBar (set every 6 ticks) so it renders
  // correctly for both P1 and P2. A separate React state for cast progress was
  // previously used here but React 18 automatic batching suppressed the frequent
  // rAF-driven state updates on the non-host (P2) client, causing the bar to
  // appear but never fill.

  // ── Key handler ref — keeps the useEffect([],...) listener up-to-date ────
  // Without this, the keydown listener captures a stale closure of handleKeyAction
  // from mount, so P2's eat/drink/quick-slots use outdated state/callbacks.
  const handleKeyActionRef = useRef(null);

  const lastMoveRef  = useRef(0);
  const lastSyncRef  = useRef(0);
  const lastNeedsRef = useRef(0);
  const fuelWarnedRef = useRef(false); // tracks whether low-fuel warning already fired this tank
  const mouseAngleRef = useRef(null);  // world-space angle from player to mouse cursor (null = no mouse)

  const [sleepVoteModal, setSleepVoteModal] = useState(null); // { requestingPlayer: "p1" or "p2", timer: number }
  const sleepVoteTimerRef = useRef(null);
  const sleepVoteActiveRef = useRef(false); // ref-based guard so handlers.current closure sees live value
  const fastSleepVoteRequestedRef = useRef(false);

  const [hud, setHud]                   = useState({ food: 100, water: 100, sleep: 100, hp: 100, dayNumber: 1, isNight: false });
  const [sleepFlash, setSleepFlash]      = useState(false);
  const [awakeningFlash, setAwakeningFlash] = useState(false);
  const [notification, setNote]         = useState(null);
  const [inventory, setInv]             = useState({});
  const [p2Connected, setP2]            = useState(false);
  // Mirrors p2Connected for use inside the rAF loop, plus a timestamp of the last
  // message we received from the partner — used to drive the "P2 away" indicator
  // from real data activity rather than only the (unreliable) presence event.
  const p2ConnectedRef                  = useRef(false);
  const lastPartnerMsgRef               = useRef(0);
  const markPartnerActive = useRef(() => {
    lastPartnerMsgRef.current = Date.now();
    if (!p2ConnectedRef.current) { p2ConnectedRef.current = true; setP2(true); }
  }).current;
  const [contextActions, setCtxActions] = useState([]);
  const [showControls, setShowControls] = useState(false);
  const [showInventory, setShowInv]     = useState(false);
  const [buildMenu, setBuildMenu]       = useState(false);
  const [placingMode, setPlacingMode]   = useState(null); // null | "turret" | "crop_plot"
  const placingModeRef                  = useRef(null);
  const placingHintRef                  = useRef(null);
  const [placingHint, setPlacingHint]   = useState(null); // { x, y } canvas coords

  // ── Survivor command UI ───────────────────────────────────────────────────
  const [survivorMenu, setSurvivorMenu] = useState(null); // { survivor } | null
  const [assigningMode, setAssigningMode] = useState(null); // { survivor } | null
  const assigningRef = useRef(null);

  const isP1 = role === "p1";
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ── Host/authority tracking ──────────────────────────────────────────────
  // The "host" is the authoritative simulation runner — defaults to P1 but
  // transfers to P2 if P1 disconnects, so either player can host.
  const isHostRef = useRef(isP1); // starts true for p1, false for p2
  const [isHost, setIsHost] = useState(isP1);
  const handlers = useRef({
    onP1Move: ({ x, y, facing, inVehicle }) => {
      if (roleRef.current === "p1") return;
      const s = stateRef.current; if (!s) return;
      markPartnerActive();
      if (!s.player2) s.player2 = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle, radius: 7 };
      s.p2Target = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle };
    },
    onP2Move: ({ x, y, facing, inVehicle }) => {
      if (roleRef.current !== "p1") return;
      const s = stateRef.current; if (!s) return;
      markPartnerActive();
      if (!s.player2) s.player2 = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle, radius: 7 };
      // ── If P2 moves first, trigger the awakening ring on the host ────────
      if (!s.zombiesAwakened) {
        s.zombiesAwakened = true;
        activateAwakeningRing(s.zombies, x, y);
      }
      s.p2Target = { x, y, facing: facing ?? 0, inVehicle: !!inVehicle };
    },
    onSleepRequest: ({ from }) => {
      if (roleRef.current === from) return; // Ignore own request
      if (sleepVoteActiveRef.current) return; // Already have a pending vote (ref — never stale)

      sleepVoteActiveRef.current = true;
      setSleepVoteModal({ requestingPlayer: from, timer: 10 });

      // Auto-decline after 10 seconds
      sleepVoteTimerRef.current = setTimeout(() => {
        if (sleepVoteActiveRef.current) {
          sleepVoteActiveRef.current = false;
          setSleepVoteModal(null);
          notify(`${from === "p1" ? "Player 1" : "Player 2"} didn't respond — fast sleep cancelled`, "rgba(255,100,100,0.95)");
          if (room) sendSleepResponse(false);
        }
      }, 10000);
    },
    onSleepResponse: ({ agree }) => {
      if (!fastSleepVoteRequestedRef.current) return;

      if (sleepVoteTimerRef.current) {
        clearTimeout(sleepVoteTimerRef.current);
        sleepVoteTimerRef.current = null;
      }

      if (agree) {
        // Partner agreed — start fast sleep
        const s = stateRef.current;
        if (s) {
          s.isFastSleeping = true;
          s.player.isSleeping = true;
          fastSleepVoteRequestedRef.current = false;
          notify("Both players sleeping — fast-sleeping! (any movement cancels)", "rgba(120,220,80,0.95)");
          if (room) sendFastSleepStart();
        }
      } else {
        // Partner declined
        fastSleepVoteRequestedRef.current = false;
        notify("Partner declined fast sleep", "rgba(255,100,100,0.95)");
      }
    },
    onFastSleepStart: () => {
      // Partner started fast sleep — sync to this client
      const s = stateRef.current;
      if (s && !s.isFastSleeping) {
        s.isFastSleeping = true;
        s.player.isSleeping = true;
        notify("Partner started fast sleep", "rgba(120,220,80,0.95)");
      }
    },
    onFastSleepCancel: () => {
      // Partner cancelled fast sleep — wake this client too
      const s = stateRef.current;
      if (s && s.isFastSleeping) {
        s.isFastSleeping = false;
        s.player.isSleeping = false;
        holdZRef.current = 0;
        fastSleepVoteRequestedRef.current = false;
        notify("Partner woke up — fast sleep cancelled", "rgba(255,220,80,0.95)");
      }
    },
    onVehicleUpdate: ({ vehicleId, x, y, facing, hp, fuel, driver, passenger }) => {
      const s = stateRef.current; if (!s) return;
      // Find the specific vehicle this update belongs to
      const vehicles = s.vehicles ?? [s.vehicle];
      const targetVehicle = vehicleId
        ? vehicles.find(v => v.id === vehicleId)
        : s.vehicle; // fallback for old messages without id
      if (!targetVehicle) return;

      // Store per-vehicle interpolation target
      if (!s.vehicleTargets) s.vehicleTargets = new Map();
      s.vehicleTargets.set(targetVehicle.id, { x, y, facing, hp, fuel });

      // Update driver/passenger only if we're not the one in that seat
      if (targetVehicle.driver !== roleRef.current) targetVehicle.driver = driver ?? null;
      if (targetVehicle.passenger !== roleRef.current) targetVehicle.passenger = passenger ?? null;
      targetVehicle.occupied = targetVehicle.driver !== null || targetVehicle.passenger !== null;
    },
    onConvoyVehicleUpdate: ({ vehicles: cvUpdates }) => {
      // P2 receives convoy positions from P1 and interpolates them
      const s = stateRef.current; if (!s) return;
      if (!s.convoyVehicleTargets) s.convoyVehicleTargets = new Map();
      for (const upd of (cvUpdates ?? [])) {
        s.convoyVehicleTargets.set(upd.id, upd);
      }
    },
    onZombieUpdate: ({ zombies }) => {
      const s = stateRef.current; if (!s) return;
      if (isHostRef.current) {
        // Host receives P2's zombie hits — apply damage/deaths from partner's attacks
        zombies.forEach(incoming => {
          const z = s.zombies.find(z2 => z2.id === incoming.id);
          if (!z) return;
          if (incoming.dead) {
            z.dead = true;
            // Clear the broadcast flag so the host re-sends dead:true back to P2 on
            // the next sync tick, giving P2 a definitive confirmation of the kill.
            z._deathBroadcastSent = false;
          } else if (incoming.hp < z.hp) {
            z.hp = incoming.hp;
          }
        });
        return;
      }
      if (!s.zombieTargets) s.zombieTargets = new Map();
      const existingIds = new Set(s.zombies.map(z => z.id));
      zombies.forEach(z => {
        s.zombieTargets.set(z.id, z);
        if (!existingIds.has(z.id) && !z.dead) {
          // Use type-correct stats so brutes/bosses look and collide correctly on P2.
          // The engine uses z.type (not z.zombieType), so read both to handle all message shapes.
          const zType   = z.type ?? z.zombieType ?? "walker";
          const zRadius = z.radius ?? (zType === "boss" ? 22 : zType === "brute" ? 9 : 9);
          const zMaxHp  = z.maxHp  ?? (zType === "boss" ? 500 : zType === "brute" ? 60 : 30);
          s.zombies.push({
            id: z.id, x: z.x, y: z.y, hp: z.hp, maxHp: zMaxHp,
            type: zType, state: z.state, dead: false,
            radius: zRadius, speed: 38, attackCooldown: 0,
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
        // Don't overwrite HP on locally-dead zombies — P2 killed them, waiting for host to confirm
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
    onNeedsUpdate: ({ food, water, sleep, hp, isDowned }) => {
      const s = stateRef.current; if (!s) return;
      markPartnerActive();
      if (s.player2) Object.assign(s.player2, { food, water, sleep, hp, isDowned: !!isDowned });
      // Co-op both-downed check on the non-host side.
      // The host detects this in the game loop; P2 (non-host) detects it here when
      // the host broadcasts its own isDowned=true and P2 is already downed locally.
      if (isDowned === true && s.player?.isDowned && !isHostRef.current && !gameOverFiredRef.current) {
        // Let the host fire the authoritative game_over broadcast; P2 just waits
        // — it will receive the game_over event and transition via onGameOver.
        // But as a fallback (e.g. host tab is throttled), P2 also fires after a
        // short delay if no game_over has arrived.
        setTimeout(() => {
          if (!gameOverFiredRef.current) {
            const s2 = stateRef.current;
            if (s2?.player?.isDowned && s2?.player2?.isDowned) {
              triggerGameOver(s2, { survived: false, coopBothDowned: true });
            }
          }
        }, 1500);
      }
      // If the remote player sent isDowned=false and we are downed locally, it means
      // our partner just revived us — wake up.
      // _reviveHandled is a one-shot gate: prevents the floater from re-firing every
      // time the partner's continuous needs_update broadcast arrives with isDowned=false.
      if (isDowned === false && s.player?.isDowned && !s.player._reviveHandled) {
        s.player._reviveHandled = true;
        s.player.isDowned = false;
        s.player.downedReason = null;
        s.player.isSleeping = false;
        s.player.hp = Math.max(s.player.hp, 15);
        // addFloater needs the state, use a deferred notify
        setTimeout(() => {
          const s2 = stateRef.current;
          if (s2) addFloater(s2, "🫀 Revived by partner!", s2.player.x, s2.player.y - 25, "rgba(120,255,180,0.95)", 14);
        }, 50);
      }
    },
    onSurvivorFound: ({ survivor, foundBy }) => {
  const s = stateRef.current;
  if (!s) return;
  if (!s.survivors.some(sv => sv.id === survivor.id)) {
    // Determine which player found the survivor
    if (foundBy === roleRef.current) {
      // This client's player found the survivor locally
      survivor.followLeader = s.player;
    } else {
      // The remote player found the survivor
      survivor.followLeader = s.player2 ?? s.player;
    }
    s.survivors.push(survivor);
  }
},
    onSurvivorCommand: ({ survivorId, command, assignedTo }) => {
  const s = stateRef.current;
  if (!s) return;
  
  const survivor = s.survivors?.find(sv => sv.id === survivorId);
  if (!survivor) return;
  
  survivor.command = command;
  survivor.state = "idle";
  survivor._castTimer = 0;
  survivor._castType = null;
  
  if (assignedTo) {
    survivor.assignedTo = assignedTo;
  } else if (command !== "assign") {
    survivor.assignedTo = null;
    survivor.barricaded = false;
    survivor.barricadeBuilding = null;
  }
  
  // If command is "follow", set followLeader to whoever issued the command
  if (command === "follow") {
    // Determine which player issued the command (sender)
    survivor.followLeader = s.player2 ?? s.player;
  }
},
    onCropPlant: ({ crop }) => {
  const s = stateRef.current;
  if (!s) return;
  
  // Check if we already have this crop (avoid duplicates)
  const existingCrop = s.crops.find(c => c.id === crop.id);
  if (!existingCrop) {
    // Initialize crop properties that might be missing from network data
    s.crops.push({
      ...crop,
      // Ensure these properties exist for P2 rendering
      stage: crop.stage ?? "growing",
      growTimer: crop.growTimer ?? 0,
      growTime: crop.growTime ?? 60,
      dead: false
    });
  }
},
    onGardenPlotPlace: ({ plot }) => {
      const s = stateRef.current; if (!s) return;
      if (!s.gardenPlots.some(p => p.id === plot.id)) s.gardenPlots.push(plot);
    },    onCropHarvest:  ({ cropId }) => { const s = stateRef.current; if (s) s.crops = s.crops.filter(c => c.id !== cropId); },
    onPhaseChange:  ({ phase, dayNumber }) => {
      if (isHostRef.current) return; // host drives the sim, ignore own echo
      const s = stateRef.current; if (!s) return;
      s.isNight = phase === "night"; s.dayNumber = dayNumber;
    },
    onMapFragment: () => {
      const s = stateRef.current; if (!s) return;
      s.mapFragmentCollected = true;
    },
    onVehicleRepair: ({ vehicleId, hp }) => {
      const s = stateRef.current; if (!s) return;
      const vehicles = s.vehicles ?? [s.vehicle];
      const v = vehicleId ? vehicles.find(v => v.id === vehicleId) : s.vehicle;
      if (v) v.hp = hp;
    },
    onP2Damage: ({ amount, isVehicle, vehicleId }) => {
      // Sent by the host when zombies hit P2 (or P2's vehicle). Only P2 applies it,
      // since P2 is authoritative over its own HP / vehicle HP.
      if (roleRef.current !== "p2") return;
      const s = stateRef.current; if (!s) return;
      if (!amount || amount <= 0) return;

      if (isVehicle) {
        const vehicles = s.vehicles ?? [s.vehicle];
        const v = vehicleId ? vehicles.find(v2 => v2.id === vehicleId) : s.vehicle;
        if (v) {
          v.hp = Math.max(0, v.hp - amount);
          addFloater(s, `-${Math.round(amount)}`, v.x, v.y - 20, "rgba(255,160,60,0.9)");
          // Immediately broadcast the new authoritative vehicle HP back to the host
          // (the host has no vehicle_damage handler, but it does apply vehicle_update).
          if (room && (v.driver === roleRef.current || v.passenger === roleRef.current)) {
            sendVehicleUpdate(v.id, v.x, v.y, v.facing, v.hp, v.fuel, v.driver, v.passenger);
          }
        }
      } else {
        if (s.player.isDowned) return;
        s.player.hp = Math.max(0, s.player.hp - amount);
        addFloater(s, `-${Math.round(amount)}`, s.player.x, s.player.y - 15, "rgba(255,80,80,0.9)");
        if (s.player.hp <= 0 && !s.player.isDowned) {
          s.player.isDowned = true;
          s.player.downedReason = "zombie";
        }
        if (room) sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp, !!s.player.isDowned);
      }
    },
    onInventoryUpdate: ({ inventory }) => {
      // Partner's inventory changed — update the shared world view (e.g. shared fuel)
      // We intentionally do NOT overwrite our own inventory; this is the remote player's.
      const s = stateRef.current; if (!s) return;
      if (s.player2) s.player2.inventory = inventory;
    },
    onLootPickup: ({ buildingId, gained, fuelGained }) => {
  const s = stateRef.current; if (!s) return;
  
  // Apply fuel to vehicle
  if (fuelGained > 0) {
    s.vehicle.fuel = Math.min(s.vehicle.maxFuel ?? 80, (s.vehicle.fuel ?? 0) + fuelGained);
  }
  
  // Mark building as searched (removes glow)
  const b = s.buildings.find(b2 => b2.id === buildingId);
  if (b) b.searched = true;
  
  // Mark the loot pile as collected (prevents re-looting)
  const lootPile = s.lootPiles?.find(p => p.buildingId === buildingId && !p.collected);
  if (lootPile) {
    lootPile.collected = true;
  }
  
  // Add items to shared inventory
  gained.forEach(item => {
    if (!item.autoFueled) {
      addToInventory(s.player.inventory, item.type, item.qty);
    }
  });
  syncInv(s.player.inventory);
},
    onSurvivorPositions: ({ survivors }) => {
      // Host broadcasts survivor positions so non-host client can render them
      if (isHostRef.current) return; // we are the host, ignore our own echo
      const s = stateRef.current; if (!s) return;
      // Store targets for smooth interpolation in the rAF loop (same pattern as vehicles)
      if (!s.survivorTargets) s.survivorTargets = new Map();
      for (const upd of survivors) {
        s.survivorTargets.set(upd.id, upd);
        // Apply non-positional state immediately
        const sv = s.survivors.find(sv2 => sv2.id === upd.id);
        if (sv) { sv.hp = upd.hp; sv.state = upd.state; }
      }
    },
    onTurretStates: ({ turrets }) => {
      // Host broadcasts full turret HP/destroyed snapshot each sync tick
      if (isHostRef.current) return;
      const s = stateRef.current; if (!s) return;
      for (const upd of turrets) {
        const t = s.turrets?.find(t2 => t2.id === upd.id);
        if (t) { t.hp = upd.hp; t.destroyed = upd.destroyed; }
      }
    },
    onTurretPlace: ({ turret }) => {
      const s = stateRef.current; if (!s) return;
      if (!s.turrets) s.turrets = [];
      if (!s.turrets.some(t => t.id === turret.id)) s.turrets.push(turret);
    },
    onTurretDamage: ({ turretId, hp }) => {
      const s = stateRef.current; if (!s) return;
      const t = s.turrets?.find(t => t.id === turretId);
      if (t) t.hp = hp;
    },
    onTurretRepair: ({ turretId, hp }) => {
      const s = stateRef.current; if (!s) return;
      const t = s.turrets?.find(t => t.id === turretId);
      if (t) { t.hp = hp; t.destroyed = false; }
    },
    onTurretDestroy: ({ turretId }) => {
      const s = stateRef.current; if (!s) return;
      const t = s.turrets?.find(t => t.id === turretId);
      if (t) t.destroyed = true;
    },
    // FIX 3/4: base storage co-op handlers
    onBaseStorageUpdate: ({ storage }) => {
      const s = stateRef.current; if (!s) return;
      s.baseStorage = storage ?? {};
    },
    onBaseStorageDeposit: ({ items }) => {
      const s = stateRef.current; if (!s) return;
      if (!s.baseStorage) s.baseStorage = {};
      for (const [key, amount] of Object.entries(items ?? {})) {
        s.baseStorage[key] = (s.baseStorage[key] ?? 0) + amount;
      }
    },
    onBaseStorageWithdraw: ({ items }) => {
      const s = stateRef.current; if (!s) return;
      if (!s.baseStorage) s.baseStorage = {};
      for (const [key, amount] of Object.entries(items ?? {})) {
        s.baseStorage[key] = Math.max(0, (s.baseStorage[key] ?? 0) - amount);
      }
    },
    onPartnerConnected: () => {
      p2ConnectedRef.current = true;
      lastPartnerMsgRef.current = Date.now();
      setP2(true);
      const s = stateRef.current;
      if (s && !s.player2) {
        s.player2 = { x: s.player.x, y: s.player.y, facing: 0, inVehicle: false, radius: 7 };
      }
      // If we're P2 and just got a partner (P1), cede host authority back to P1
      if (roleRef.current === "p2") {
        isHostRef.current = false;
        setIsHost(false);
      }
    },
    onPartnerDisconnected: () => {
      p2ConnectedRef.current = false;
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
      // Promote this client to host if partner disconnected — keeps simulation running
      if (!isHostRef.current) {
        isHostRef.current = true;
        setIsHost(true);
      }
    },
  }).current;

  const {
    sendP1Move, sendP2Move, sendVehicleUpdate, sendZombieUpdate,
    sendBuildingSearch, sendBarricadePlace, sendDoorUpdate, sendNeedsUpdate,
    sendSurvivorFound, sendCropPlant, sendCropHarvest, sendPhaseChange,
    sendMapFragment, sendVehicleRepair, sendP2Damage,
    sendTurretPlace, sendTurretDamage, sendTurretRepair, sendTurretDestroy,
    sendConvoyUpdate, sendRoomSeedUpdate, sendGardenPlotPlace,
    sendSleepRequest, sendSleepResponse, sendFastSleepStart,
    sendInventoryUpdate, sendLootPickup,
    sendSurvivorPositions, sendSurvivorCommand, sendTurretStates,
    sendGameOver,
    sendReadyUp,
    // FIX 3/4: base storage co-op senders
    sendBaseStorageUpdate, sendBaseStorageDeposit, sendBaseStorageWithdraw,
  } = useDeadMilesRoom(room?.id ?? null, handlers);
  const sendMyMove = isP1 ? sendP1Move : sendP2Move;

  // ── Inventory sync helper — call instead of bare setInv ─────────────────
  // FIX 4: All inventory mutations must go through syncInv so the partner's
  // UI stays consistent.  Never call setInv directly.
  function syncInv(inventory) {
    setInv({ ...inventory });
    if (room) sendInventoryUpdate(inventory);
  }

  // ── FIX 4/5: Base storage sync helper ─────────────────────────────────────
  // Mirrors syncInv but for baseStorage.  Called after any baseTick mutation
  // or manual deposit/withdraw so P2's BaseView reflects the same stockpile.
  function syncBaseStorage(storage) {
    const s = stateRef.current;
    if (s) s.baseStorage = storage;
    if (room) sendBaseStorageUpdate(storage);
  }

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

    const recap = s.player.deathRecap?.getRecap() || "";
    const score = {
      survived: false,
      dayssurvived: s.dayNumber,
      zombiesKilled: s.zombiesKilled ?? 0,
      buildingsSearched: s.buildingsSearched ?? 0,
      survivorsFound: s.survivorsFound ?? 0,
      deathRecap: recap,
      ...extra,
    };
    // Broadcast to partner so their screen transitions too
    if (room) sendGameOver(score);
    onGameOver(score);
  }

  // ── Unified F key handler ──────────────────────────────────────────────────
  function handleF(s) {
    // ── Co-op revive: press F near a downed partner ──────────────────────
    if (room && s.player2?.isDowned) {
      const d = dist(s.player.x, s.player.y, s.player2.x, s.player2.y);
      if (d < 60) {
        startCast({
          type: "revive",
          duration: 3.0,
          label: "Reviving partner",
          icon: "🫀",
          onComplete: () => {
            // Revive the remote player's representation locally
            if (s.player2) {
              s.player2.isDowned = false;
              s.player2.downedReason = null;
              s.player2.hp = Math.max(s.player2.hp, 15);
            }
            // Tell the partner they've been revived via a needs_update with isDowned=false
            sendNeedsUpdate(
              s.player2?.food ?? 50,
              s.player2?.water ?? 50,
              s.player2?.sleep ?? 50,
              Math.max(s.player2?.hp ?? 15, 15),
              false
            );
            notify("🫀 Partner revived!", "rgba(120,255,180,0.95)");
          },
        });
        return;
      }
    }
    if (s.player.inVehicle) {
      exitVehicle(s.player, s.vehicle, roleRef.current);
      notify("Got out of vehicle");
      if (room) sendVehicleUpdate(
        s.vehicle.id,
        s.vehicle.x, s.vehicle.y, s.vehicle.facing,
        s.vehicle.hp, s.vehicle.fuel,
        s.vehicle.driver, s.vehicle.passenger
      );
      return;
    }

    // Find nearest vehicle from the fleet
    const vehicles = s.vehicles ?? [s.vehicle];
    let nearestVehicle = null;
    let nearestDist = Infinity;
    for (const v of vehicles) {
      const d = dist(s.player.x, s.player.y, v.x, v.y);
      if (d < nearestDist) { nearestDist = d; nearestVehicle = v; }
    }
    if (!nearestVehicle || nearestDist > 70) {
      // Fall through to door/loot interaction below
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
        s.buildingsSearched = (s.buildingsSearched ?? 0) + 1;
        const fuelMsg = lootResult.fuelGained > 0 ? ` (+${lootResult.fuelGained} fuel ⛽)` : "";
        const nonFuelItems = lootResult.gained.filter(i => !i.autoFueled);
        const itemMsg = nonFuelItems.length > 0
          ? `Picked up: ${nonFuelItems.map(i => `${i.qty}× ${i.type}`).join(", ")}${fuelMsg}`
          : `Fueled up!${fuelMsg}`;
        notify(itemMsg, "rgba(120,255,150,0.95)");
        syncInv(s.player.inventory);
        const hadFragment = lootResult.gained.some(i => i.type === "map_fragment");
        if (hadFragment) {
          const fragmentItem = lootResult.gained.find(i => i.type === "map_fragment");
          const result = collectMapFragment(s, fragmentItem);
          if (!s.mapFragmentCollected) {
            s.mapFragmentCollected = true;
          }
          if (result?.isEndgame) {
            addFloater(s, "🗺️ all fragments found!", s.player.x, s.player.y - 30, "rgba(120,255,150,0.95)", 15);
            notify("🗺️ All settlements found! You've mapped the region — you survived!", "rgba(120,255,150,0.95)");
          } else if (result?.bossSpawned) {
            addFloater(s, "☠ A boss zombie has appeared!", s.player.x, s.player.y - 30, "rgba(255,80,80,0.95)", 16);
            notify("☠ Final fragment! A massive boss zombie has spawned — kill it to win!", "rgba(255,80,80,0.95)");
          } else if (result?.nextSettlement) {
            const ns = result.nextSettlement;
            addFloater(s, `🗺️ fragment! head to ${ns.name}`, s.player.x, s.player.y - 30, "rgba(255,220,80,0.95)", 14);
            notify(`🗺️ Map fragment! Next: ${ns.name}`, "rgba(255,220,80,0.95)");
          } else {
            addFloater(s, "🗺️ map fragment!", s.player.x, s.player.y - 30, "rgba(255,220,80,0.95)", 14);
            notify("🗺️ Map fragment collected!", "rgba(255,220,80,0.95)");
          }
          if (room && sendMapFragment) sendMapFragment();
        }
        const surv = tryDiscoverSurvivor(s.player, s.buildings, s.survivors, s.lootPiles);
if (surv) {
  surv.survivor.followLeader = s.player;
  s.survivors.push(surv.survivor);
  s.survivorsFound = (s.survivorsFound ?? 0) + 1;
  notify(`${surv.survivor.name} (${surv.survivor.role}) was hiding here!`, "rgba(120,255,180,0.95)");
  if (room) sendSurvivorFound(surv.survivor, roleRef.current); // Pass finder role
}
        // Broadcast both the building ID (so partner marks it searched) AND the items
        // gained so partner can apply them to their shared world state if needed.
        if (room) {
          sendBuildingSearch(lootResult.pile.buildingId);
          sendLootPickup(lootResult.pile.buildingId, lootResult.gained, lootResult.fuelGained ?? 0);
        }
        return;
      }
      handleFCrops(s);
      return;
    }

    // Switch active vehicle reference to the nearest one
    s.vehicle = nearestVehicle;

    const myRole = roleRef.current;
    const alreadyInVehicle = s.vehicle.driver === myRole || s.vehicle.passenger === myRole;
    const vehicleFull = s.vehicle.driver !== null && s.vehicle.passenger !== null;

    if (!alreadyInVehicle && vehicleFull) {
      notify("Vehicle is full!", "rgba(255,100,100,0.95)");
      return;
    }

    const enteredAs = tryEnterVehicle(s.player, s.vehicle, myRole);
    if (enteredAs) {
      const cfg = VEHICLE_TYPES[s.vehicle.vehicleType] ?? VEHICLE_TYPES.car;
      const msg = enteredAs === "driver" ? `Driving ${cfg.label} — F to exit` : `Riding shotgun — F to exit`;
      notify(msg);
      // ── Power moment: first time player enters any vehicle ──────────────────
      if (!s.firstVehicleEntered && enteredAs === "driver") {
        s.firstVehicleEntered = true;
        powerMomentRef.current = 2.2;   // 2.2 seconds of zoom-out effect
        powerZoomRef.current = 1.0;
        flashRef.current = 0.4;         // screen flash
        notify("⚡ FLOOR IT — zombies everywhere!", "rgba(255,80,40,0.98)");
      }
      if (room) sendVehicleUpdate(
        s.vehicle.id,
        s.vehicle.x, s.vehicle.y, s.vehicle.facing,
        s.vehicle.hp, s.vehicle.fuel,
        s.vehicle.driver, s.vehicle.passenger
      );
      return;
    }
  }

  // ── F key fallback: crops/planting when no vehicle nearby ─────────────────
  function handleFCrops(s) {
    // Check for ready harvest near player — start cast
    const nearReadyCrop = s.crops.find(c => {
      if (c.stage !== "ready") return false;
      const plot = s.gardenPlots.find(p => p.id === c.plotId);
      return plot && dist(s.player.x, s.player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) < 60;
    });
    if (nearReadyCrop) {
      if (castActionRef.current?.type === "harvest") return;
      startCast({
        type: "harvest",
        duration: 2.0,
        label: "Harvesting crops",
        icon: "🌾",
        onComplete: () => {
          const result = tryHarvestCrop(s.player, s.gardenPlots, s.crops, s.dayNumber, s.buildings);
          if (result) {
            notify(`Harvested ${result.qty}× ${result.type}!`, "rgba(120,220,80,0.95)");
            if (room) sendCropHarvest(result.id);
            syncInv(s.player.inventory);
          }
        },
      });
      return;
    }

    // Check for empty plot near player — start cast
    const nearEmptyPlot = s.gardenPlots.find(p =>
      !s.crops.some(c => c.plotId === p.id) &&
      dist(s.player.x, s.player.y, p.x + p.w / 2, p.y + p.h / 2) < 60
    );
    if (nearEmptyPlot) {
      if (castActionRef.current?.type === "plant") return;
      if ((s.player.inventory.seeds ?? 0) < 1) {
        notify("Need seeds first!", "rgba(255,100,100,0.95)");
        return;
      }
      startCast({
        type: "plant",
        duration: 2.5,
        label: "Planting potatoes",
        icon: "🌱",
        onComplete: () => {
          const result = tryPlantCrop(s.player, s.gardenPlots, s.crops, "potato");
          if (result?.success) {
            notify("Planted potatoes", "rgba(120,220,80,0.95)");
            if (room) sendCropPlant(result.crop);
            syncInv(s.player.inventory);
          } else if (result?.fail === "no_seeds") {
            notify("No seeds left!", "rgba(255,100,100,0.95)");
          }
        },
      });
      return;
    }

    notify("Nothing to interact with here", "rgba(180,180,180,0.6)");
  }

  // ── Cast system helpers ────────────────────────────────────────────────────
  function startCast({ type, duration, label, icon, onComplete }) {
    castActionRef.current = { type, duration, elapsed: 0, label, icon, onComplete };
  }

  function cancelCast(reason = "") {
    if (!castActionRef.current) return;
    castActionRef.current = null;
    if (reason) notify(`Interrupted! ${reason}`, "rgba(255,100,100,0.95)");
  }

  function tickCast(dt, wasHit) {
    const ca = castActionRef.current;
    if (!ca) return;
    if (wasHit) { cancelCast(""); notify("Cast interrupted!", "rgba(255,100,100,0.95)"); return; }
    ca.elapsed += dt;
    if (ca.elapsed >= ca.duration) {
      const cb = ca.onComplete;
      castActionRef.current = null;
      cb();
    }
  }

  // Always keep the ref pointed at the latest closure so the useEffect's
  // keydown listener (which closes over nothing except the ref) picks up
  // current syncInv / notify / quickSlotItems / sendNeedsUpdate etc.
  handleKeyActionRef.current = handleKeyAction;
  function handleKeyAction(key, s) {
    if (key === "f" || key === "F") { handleF(s); return; }

    // HP-downed in co-op: player is incapacitated — block ALL actions except F (revive)
    if (s.player.isDowned && s.player.downedReason === "hp" && room) return;

    if (key === "e" || key === "E") {
      // Find the nearest vehicle to avoid stale s.vehicle pointer
      const repairVehicles = s.vehicles ?? [s.vehicle];
      let repairTarget = null;
      let repairDist = Infinity;
      for (const v of repairVehicles) {
        const d = dist(s.player.x, s.player.y, v.x, v.y);
        if (d < repairDist) { repairDist = d; repairTarget = v; }
      }
      if (!repairTarget || repairDist > REPAIR_RANGE) { return; }
      const result = tryRepairVehicle(s.player, repairTarget);
      if (!result) { return; }
      if (result.fail === "no_parts") { notify("Need car parts!", "rgba(255,100,100,0.95)"); return; }
      if (result.fail === "full_hp") { notify("Vehicle is already at full health!", "rgba(180,180,180,0.6)"); return; }
      notify(`Vehicle repaired +${REPAIR_HP_GAIN} HP 🔧`, "rgba(120,255,150,0.95)");
      if (room && sendVehicleRepair) sendVehicleRepair(repairTarget.id, repairTarget.hp);
      syncInv(s.player.inventory);
      return;
    }

    if (key === "b" || key === "B") {
      if (castActionRef.current?.type === "barricade") return;
      const nearBuilding = s.buildings.find(b => {
        if (!b.barricadeable || b.barricadeHp > 0) return false;
        const nearDoor = (b.doors || []).some(d => {
          const c = getDoorCenter(b, d);
          return dist(s.player.x, s.player.y, c.x, c.y) < 60;
        });
        return nearDoor || isInsideBuilding(s.player, b);
      });
      if (!nearBuilding) { notify("No barricadeable building nearby", "rgba(180,180,180,0.6)"); return; }
      const actualDoors = nearBuilding.barricadeDoors ?? 1;
      const costW = BARRICADE_COST_WOOD  * actualDoors;
      const costN = BARRICADE_COST_NAILS * actualDoors;
      if ((s.player.inventory.wood ?? 0) < costW || (s.player.inventory.nails ?? 0) < costN) {
        notify(`Need ${costW} wood + ${costN} nails`, "rgba(255,100,100,0.95)");
        return;
      }
      startCast({
        type: "barricade",
        duration: 3.0,
        label: `Barricading ${nearBuilding.label}`,
        icon: "🪵",
        onComplete: () => {
          const r = tryBarricade(s.player, s.buildings);
          if (!r) { notify("No barricadeable building nearby", "rgba(180,180,180,0.6)"); return; }
          if (r.fail) { notify(`Need ${r.need.wood} wood + ${r.need.nails} nails`, "rgba(255,100,100,0.95)"); return; }
          notify(`${r.building.label} barricaded!`, "rgba(180,230,120,0.95)");
          if (room) sendBarricadePlace(r.building.id, r.building.barricadeHp);
          syncInv(s.player.inventory);
        },
      });
      return;
    }

    if (key === "q" || key === "Q") {
      if (castActionRef.current?.type === "eat") return;
      if ((s.player.inventory.food ?? 0) < 1) { notify("No food in inventory!", "rgba(255,100,100,0.95)"); return; }
      startCast({
        type: "eat",
        duration: 1.5,
        label: "Eating food",
        icon: "🍞",
        onComplete: () => {
          if (eatFood(s.player)) {
            notify("Ate food (+25 🍞)");
            syncInv(s.player.inventory);
            if (s.player.isDowned) {
              // HP-downed in co-op can only be revived by the partner (F key), not by eating
              if (s.player.downedReason === "hp" && room) {
                notify("You need your partner to revive you!", "rgba(255,100,100,0.95)");
              } else {
                // Needs-collapse: eating (food/sleep cause) revives
                s.player.isDowned = false;
                s.player.downedReason = null;
                s.player.isSleeping = false;
                s.isFastSleeping = false; // stop fast-sleep so needs don't drain 15x immediately
                holdZRef.current = 0;
                s.player.hp = Math.max(s.player.hp, 15);
                s.player.food  = Math.max(s.player.food,  NEEDS_TUNE.food.critAt  + 5);
                s.player.water = Math.max(s.player.water, NEEDS_TUNE.water.critAt + 5);
                s.player.sleep = Math.max(s.player.sleep, NEEDS_TUNE.sleep.critAt + 5);
                notify("🫀 Revived!", "rgba(120,255,180,0.95)");
                if (room) sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp, false);
              }
            }
          } else {
            notify("No food left!", "rgba(255,100,100,0.95)");
          }
        },
      });
      return;
    }

    if (key === "r" || key === "R") {
      if (castActionRef.current?.type === "drink") return;
      const nearWell = s.wells?.some(w => dist(s.player.x, s.player.y, w.x, w.y) < 60);
      const nearBuildingWell = s.buildings.some(b => b.hasWell &&
        dist(s.player.x, s.player.y, b.x + b.w / 2, b.y + b.h / 2) < 80);
      const hasWater = (s.player.inventory.water ?? 0) > 0;
      if (!nearWell && !nearBuildingWell && !hasWater) {
        notify("No water nearby!", "rgba(255,100,100,0.95)");
        return;
      }
      startCast({
        type: "drink",
        duration: 1.5,
        label: "Drinking water",
        icon: "💧",
        onComplete: () => {
          const ok = drinkWater(s.player, s.buildings, s.wells);
          if (ok) {
            notify(ok.source === "well" ? "Drank from well (+30 💧)" : "Drank water (+30 💧)");
            syncInv(s.player.inventory);
            if (s.player.isDowned) {
              // HP-downed in co-op can only be revived by the partner (F key), not by drinking
              if (s.player.downedReason === "hp" && room) {
                notify("You need your partner to revive you!", "rgba(255,100,100,0.95)");
              } else {
                // Needs-collapse: drinking (water/sleep cause) revives
                s.player.isDowned = false;
                s.player.downedReason = null;
                s.player.isSleeping = false;
                s.isFastSleeping = false; // stop fast-sleep so needs don't drain 15x immediately
                holdZRef.current = 0;
                s.player.hp = Math.max(s.player.hp, 15);
                s.player.food  = Math.max(s.player.food,  NEEDS_TUNE.food.critAt  + 5);
                s.player.water = Math.max(s.player.water, NEEDS_TUNE.water.critAt + 5);
                s.player.sleep = Math.max(s.player.sleep, NEEDS_TUNE.sleep.critAt + 5);
                notify("🫀 Revived!", "rgba(120,255,180,0.95)");
                if (room) sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp, false);
              }
            }
          } else {
            notify("No water nearby!", "rgba(255,100,100,0.95)");
          }
        },
      });
      return;
    }

    if (key === "z" || key === "Z") {
  if (s.player.isSleeping) {
    // If already sleeping, Z does nothing (use movement to wake)
    if (!s.isFastSleeping && !zHoldActiveRef.current) {
      notify("Move to wake up", "rgba(180,180,180,0.6)");
    }
    return;
  }
  // Not sleeping - start sleeping
  s.player.isSleeping = true;
  s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
  holdZRef.current = 0;
  zHoldActiveRef.current = false;
  notify("Sleeping — move to wake up", "rgba(255,220,80,0.9)");
  return;
    }

    if (key === "i" || key === "I") { setShowInv(v => !v); return; }

    if (key === "h" || key === "H") {
      if (s.player.inVehicle) return;
      if (!s.turrets?.length) { notify("No turrets nearby", "rgba(180,180,180,0.5)"); return; }
      // Check if near a damaged turret
      const nearDamagedTurret = s.turrets.find(t =>
        !t.destroyed && t.hp < t.maxHp &&
        Math.sqrt((s.player.x - t.x)**2 + (s.player.y - t.y)**2) < TURRET_REPAIR_RANGE
      );
      if (!nearDamagedTurret) { notify("No damaged turret nearby", "rgba(180,180,180,0.5)"); return; }
      if (castActionRef.current?.type === "repair_turret") return; // already casting
      const scrap = (s.player.inventory.scrap ?? 0);
      if (scrap < TURRET_REPAIR_COST_SCRAP) {
        notify(`Need ${TURRET_REPAIR_COST_SCRAP} scrap to repair!`, "rgba(255,100,100,0.95)");
        return;
      }
      startCast({
        type: "repair_turret",
        duration: 2.5,
        label: `Repairing turret (+${TURRET_REPAIR_HP} HP)`,
        icon: "🔧",
        onComplete: () => {
          const result = tryRepairTurret(s.player, s.turrets ?? []);
          if (result?.success) {
            notify(`🔧 Turret repaired (+${TURRET_REPAIR_HP} HP)`, "rgba(120,255,150,0.95)");
            addFloater(s, `+${TURRET_REPAIR_HP} HP`, result.turret.x, result.turret.y - 20, "rgba(120,255,150,0.9)");
            syncInv(s.player.inventory);
            if (room && sendTurretRepair) sendTurretRepair(result.turret.id, result.turret.hp);
          } else if (result?.fail === "no_scrap") {
            notify("Out of scrap!", "rgba(255,100,100,0.95)");
          } else if (result?.fail === "full_hp") {
            notify("Turret is already at full HP", "rgba(180,180,180,0.6)");
          }
        },
      });
      return;
    }

    if (key === "g" || key === "G") {
      if (placingModeRef.current) {
        placingModeRef.current = null;
        placingHintRef.current = null;
        setPlacingMode(null);
        setPlacingHint(null);
        notify("Placement cancelled");
      } else {
        setBuildMenu(v => !v);
      }
      return;
    }

    if (key === "t" || key === "T") {
      if (assigningRef.current) {
        const sv = assigningRef.current.survivor;
        const nearTurret = (s.turrets ?? []).find(t =>
          !t.destroyed && dist(s.player.x, s.player.y, t.x, t.y) < 60
        );
        if (nearTurret) {
          tryAssignSurvivor(sv, nearTurret.id, "turret");
          assigningRef.current = null;
          setAssigningMode(null);
          notify(`${sv.name} assigned to turret`, "rgba(120,220,255,0.95)");
          if (room && sendSurvivorCommand) {
            sendSurvivorCommand(sv.id, "assign", { structureId: nearTurret.id, structureType: "turret" });
          }
          return;
        }
        const nearPlot = (s.gardenPlots ?? []).find(p =>
          dist(s.player.x, s.player.y, p.x + p.w / 2, p.y + p.h / 2) < 80
        );
        if (nearPlot) {
          tryAssignSurvivor(sv, nearPlot.id, "crop");
          assigningRef.current = null;
          setAssigningMode(null);
          notify(`${sv.name} assigned to crop plot`, "rgba(120,220,80,0.95)");
          if (room && sendSurvivorCommand) {
            sendSurvivorCommand(sv.id, "assign", { structureId: nearPlot.id, structureType: "crop" });
          }
          return;
        }
        notify("No turret or crop plot nearby to assign to", "rgba(180,180,180,0.6)");
        return;
      }
      // Open survivor command menu if near a survivor
      const nearbySv = (s.survivors ?? []).find(sv2 =>
        sv2.hp > 0 && dist(s.player.x, s.player.y, sv2.x, sv2.y) < SURVIVOR_INTERACT_RANGE
      );
      if (nearbySv) {
        setSurvivorMenu({ survivor: nearbySv });
      } else {
        notify("No survivor nearby", "rgba(180,180,180,0.6)");
      }
      return;
    }

    if (key === "Escape") {
      setShowInv(false); setShowControls(false);
      setSurvivorMenu(null);
      if (assigningRef.current) {
        assigningRef.current = null;
        setAssigningMode(null);
        notify("Assignment cancelled");
      } else if (placingModeRef.current) {
        placingModeRef.current = null;
        placingHintRef.current = null;
        setPlacingMode(null);
        setPlacingHint(null);
        setBuildMenu(false);
        notify("Placement cancelled");
      } else {
        setBuildMenu(false);
      }
      return;
    }

    if (key >= "1" && key <= "5") {
      const slotIdx = parseInt(key) - 1;
      const itemType = quickSlotItems[slotIdx];
      if (!itemType) {
        notify(`Quick slot ${key} is empty! Press I to assign items`, "rgba(180,180,180,0.6)");
        return;
      }
      const qty = getInventoryCount(s.player.inventory, itemType);
      if (qty < 1) {
        notify(`No ${itemType} in quick slot ${key}!`, "rgba(255,100,100,0.95)");
        return;
      }
      if (itemType === "food") {
        if (castActionRef.current?.type === "eat") return;
        startCast({
          type: "eat",
          duration: 1.5,
          label: "Eating food",
          icon: "🍞",
          onComplete: () => {
            if (eatFood(s.player)) {
              notify("Ate food (+25 🍞)");
              syncInv(s.player.inventory);
            }
          },
        });
      } else if (itemType === "water") {
        if (castActionRef.current?.type === "drink") return;
        startCast({
          type: "drink",
          duration: 1.5,
          label: "Drinking water",
          icon: "💧",
          onComplete: () => {
            const ok = drinkWater(s.player, s.buildings, s.wells);
            if (ok) {
              notify(ok.source === "well" ? "Drank from well (+30 💧)" : "Drank water (+30 💧)");
              syncInv(s.player.inventory);
            }
          },
        });
      }
      return;
    }

    if (key === " ") {
      if (!s.player.weapon) { notify("No weapon — find one first!", "rgba(255,100,100,0.95)"); return; }
      if (s.player.inVehicle) return;
      playerAttack(s.player, s.zombies, 0);
    }
  }  // end handleKeyAction

  // Timer countdown for sleep vote
useEffect(() => {
  if (!sleepVoteModal) return;
  
  const interval = setInterval(() => {
    setSleepVoteModal(prev => {
      if (!prev) return null;
      const newTimer = prev.timer - 0.1;
      if (newTimer <= 0) return null;
      return { ...prev, timer: newTimer };
    });
  }, 100);
  
  return () => clearInterval(interval);
}, [sleepVoteModal]);

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
    // FIX 5: initialise baseStorage on the live state object if absent
    if (!stateRef.current.baseStorage) stateRef.current.baseStorage = {};

    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      // Tab → open base screen
      if (e.key === "Tab") {
        e.preventDefault();
        if (onStateSnapshot) onStateSnapshot(stateRef.current);
        if (onOpenBase) onOpenBase();
        return;
      }
      if (e.repeat) return;
      const s = stateRef.current;
      if (s) handleKeyActionRef.current(e.key, s);
    }
    function onKeyUp(e) { keysRef.current[e.key] = false; }

    function onCanvasClick(e) {
      const mode = placingModeRef.current;
      if (!mode) return;
      const s = stateRef.current; if (!s) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cx = (e.clientX - rect.left);
      const cy = (e.clientY - rect.top);
      // Convert to world coords
      const wx = cx + s.cam.x;
      const wy = cy + s.cam.y;

      if (mode === "turret") {
        if (!s.turrets) s.turrets = [];
        // Auto-transfer materials from baseStorage to field inventory if player
        // is short — this lets turrets be placed at any settlement, not just homebase.
        const bs = s.baseStorage ?? {};
        const scrapShort = Math.max(0, TURRET_COST.scrap - (s.player.inventory.scrap ?? 0));
        const nailsShort = Math.max(0, TURRET_COST.nails - (s.player.inventory.nails ?? 0));
        if (scrapShort > 0 && (bs.scrap ?? 0) >= scrapShort) {
          s.player.inventory.scrap = (s.player.inventory.scrap ?? 0) + scrapShort;
          bs.scrap -= scrapShort;
        }
        if (nailsShort > 0 && (bs.nails ?? 0) >= nailsShort) {
          s.player.inventory.nails = (s.player.inventory.nails ?? 0) + nailsShort;
          bs.nails -= nailsShort;
        }
        const result = tryPlaceTurret(s.player, wx, wy, s.turrets, s.buildings);
        if (!result) { notify("Can't place here", "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "no_scrap") { notify(`Need ${TURRET_COST.scrap} scrap (check field inventory + base storage)`, "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "no_nails") { notify(`Need ${TURRET_COST.nails} nails (check field inventory + base storage)`, "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "inside_building") { notify("Can't place inside a building", "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "overlap") { notify("Too close to another turret", "rgba(255,100,100,0.95)"); return; }
        notify("🗼 Turret placed!", "rgba(120,255,150,0.95)");
        syncInv(s.player.inventory);
        if (room && sendTurretPlace) sendTurretPlace(result.turret);
        placingModeRef.current = null;
        placingHintRef.current = null;
        setPlacingMode(null);
        setPlacingHint(null);
        setBuildMenu(false);
      } else if (mode === "crop_plot") {
        const result = tryPlaceCropPlot(s.player, wx, wy, s.gardenPlots, s.buildings);
        if (!result) { notify("Can't place here", "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "inside_building") { notify("Too close to a building — needs clearance", "rgba(255,100,100,0.95)"); return; }
        if (result.fail === "overlap") { notify("Too close to another plot", "rgba(255,100,100,0.95)"); return; }
        notify("🌱 Garden plot placed!", "rgba(120,220,80,0.95)");
        if (room && sendGardenPlotPlace) sendGardenPlotPlace(result.plot);
        placingModeRef.current = null;
        placingHintRef.current = null;
        setPlacingMode(null);
        setPlacingHint(null);
        setBuildMenu(false);
      }
    }

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Update mouse angle for player facing (screen-space, relative to canvas center)
      mouseAngleRef.current = Math.atan2(cy - rect.height / 2, cx - rect.width / 2);

      if (!placingModeRef.current) return;
      const hint = { x: cx, y: cy };
      placingHintRef.current = hint;
      setPlacingHint(hint);
    }

    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("mousemove", onMouseMove);
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

    // ── Partner presence from data activity ──────────────────────────────────
    // If we're in a room and haven't heard from the partner in a while, show "away".
    // (markPartnerActive flips it back on the next p2_move/needs_update.)
    if (room && p2ConnectedRef.current && Date.now() - lastPartnerMsgRef.current > 6000) {
      p2ConnectedRef.current = false;
      setP2(false);
    }

// Fast sleep request voting system
if (s.player.isSleeping && !s.isFastSleeping && !fastSleepVoteRequestedRef.current && !sleepVoteActiveRef.current) {
  if (keysRef.current["z"] || keysRef.current["Z"]) {
    holdZRef.current += dtActual;
    if (holdZRef.current >= 1.0 && !fastSleepVoteRequestedRef.current && !sleepVoteActiveRef.current) {
      holdZRef.current = 0;

      if (room && sendSleepRequest) {
        fastSleepVoteRequestedRef.current = true;
        notify("Waiting for partner to agree to fast sleep...", "rgba(255,220,80,0.95)");
        sendSleepRequest();
      } else if (room && !sendSleepRequest) {
        // This shouldn't happen if imported correctly, but helpful for debugging
        console.warn("sendSleepRequest not available");
        notify("Sleep request failed - check connection", "rgba(255,100,100,0.95)");
      } else {
        // Solo play - just start fast sleep
        s.isFastSleeping = true;
        notify("Fast-sleeping! (any movement cancels)", "rgba(120,220,80,0.95)");
      }
    }
  } else {
    holdZRef.current = 0;
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
        // Notify partner so they wake up too
        if (room) sendFastSleepCancel?.();
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
    if (moving) {
      movePlayer(s.player, dx, dy, dt, s.buildings);
      // ── Awakening: first movement by either player triggers the horde ────
      if (!s.zombiesAwakened) {
        s.zombiesAwakened = true;
        // Only host runs activateAwakeningRing (authoritative zombie state);
        // P2 client's awakening is triggered via onP2Move on the host side.
        if (isHostRef.current) {
          activateAwakeningRing(s.zombies, s.player.x, s.player.y);
        }
        setAwakeningFlash(true);
        setTimeout(() => setAwakeningFlash(false), 600);
      }
    }
    // ── Mouse-aim: override player.facing with mouse direction when available ──
    // This decouples movement direction from swing direction on desktop.
    if (mouseAngleRef.current !== null && !s.player.inVehicle) {
      s.player.facing = mouseAngleRef.current;
    }
  }
} else {
  // Player is sleeping - check for movement to wake up
  // Don't wake from movement if downed — needs eat/drink to revive
  if (moving && !s.player.isDowned) {
    const wasFastSleeping = s.isFastSleeping;
    s.player.isSleeping = false;
    s.isFastSleeping = false;
    holdZRef.current = 0;
    zHoldActiveRef.current = false;
    fastSleepVoteRequestedRef.current = false;
    sleepVoteActiveRef.current = false;
    if (sleepVoteTimerRef.current) clearTimeout(sleepVoteTimerRef.current);
    setSleepVoteModal(null);
    notify("Woke up");
    addFloater(s, "Woke up!", s.player.x, s.player.y - 20, "rgba(255,220,80,0.9)", 12);
    
    // If in co-op and were fast sleeping, notify partner so they wake too
    if (room && wasFastSleeping) {
      sendFastSleepCancel?.();
    }
  }
}

    if (s.player2 && s.p2Target) {
      const lf = Math.min(1, 12 * dtActual);
      s.player2.x       = lerp(s.player2.x,   s.p2Target.x,   lf);
      s.player2.y       = lerp(s.player2.y,   s.p2Target.y,   lf);
      s.player2.facing  = s.p2Target.facing  ?? s.player2.facing;
      s.player2.inVehicle = s.p2Target.inVehicle;
    }

    // Per-vehicle interpolation: apply network targets for vehicles not driven by this client
    if (s.vehicleTargets?.size) {
      const allVehicles = s.vehicles ?? [s.vehicle];
      for (const v of allVehicles) {
        const tgt = s.vehicleTargets.get(v.id);
        if (!tgt) continue;
        // Only interpolate vehicles we are NOT driving
        if (v.driver === roleRef.current) continue;
        // Use a gentler lerp (6× instead of 10×) so fast vehicles don't snap
        // violently between network updates on the non-driving client.
        const lf = Math.min(1, 6 * dtActual);
        v.x      = lerp(v.x,      tgt.x,      lf);
        v.y      = lerp(v.y,      tgt.y,      lf);
        v.facing = lerp(v.facing, tgt.facing,  lf);
        v.hp     = tgt.hp;
        v.fuel   = tgt.fuel;
      }
    }

    if (!isHostRef.current && s.zombieTargets) {
      const lf = Math.min(1, 10 * dtActual);
      s.zombies.forEach(z => {
        const t = s.zombieTargets.get(z.id);
        if (!t) return;
        // If the zombie is locally dead (killed by P2 or confirmed dead by host),
        // never overwrite its position/HP — let it stay dead until host confirms
        if (z.dead) return;
        z.x     = lerp(z.x, t.x, lf);
        z.y     = lerp(z.y, t.y, lf);
        z.state = t.state;
        if (t.dead) { z.dead = true; return; }
        // Only overwrite HP from host if P2 hasn't hit this zombie this frame
        // AND P2's local HP isn't already at/below zero (partially killed but host not yet aware)
        if (!z._p2HitThisFrame && z.hp > 0) z.hp = t.hp;
        z._p2HitThisFrame = false;
      });
    }

    // ── P2: interpolate convoy vehicle positions from network targets ─────
    if (!isHostRef.current && s.convoyVehicleTargets) {
      if (!s.convoyVehicles) s.convoyVehicles = [];
      for (const [id, upd] of s.convoyVehicleTargets) {
        let entry = s.convoyVehicles.find(e => e.vehicle._id === id);
        if (!entry) {
          // Create a ghost vehicle for rendering
          const { createVehicle: _cv, ..._ } = {}; // no-op; just build manually
          const ghostV = {
            _id: id, x: upd.x, y: upd.y, facing: upd.facing,
            hp: upd.hp, maxHp: upd.maxHp ?? 300,
            vehicleType: upd.vehicleType ?? "car", radius: 22,
            speed: 260, fuel: 80, maxFuel: 80, occupied: true,
            seats: 2, noise: 0.9, zombieKill: false,
          };
          entry = { vehicle: ghostV, survivor: { name: upd.survivorName ?? "?" } };
          s.convoyVehicles.push(entry);
        }
        const lf = Math.min(1, 6 * dtActual);
        entry.vehicle.x      = lerp(entry.vehicle.x,      upd.x,      lf);
        entry.vehicle.y      = lerp(entry.vehicle.y,      upd.y,      lf);
        entry.vehicle.facing = lerp(entry.vehicle.facing, upd.facing,  lf);
        entry.vehicle.hp     = upd.hp;
      }
    }

    // ── P2: interpolate survivor positions from network targets ──────────────
    if (!isHostRef.current && s.survivorTargets?.size) {
      const lf = Math.min(1, 8 * dtActual);
      for (const sv of s.survivors) {
        const tgt = s.survivorTargets.get(sv.id);
        if (!tgt) continue;
        sv.x = lerp(sv.x, tgt.x, lf);
        sv.y = lerp(sv.y, tgt.y, lf);
      }
    }

    if (!isHostRef.current && room) {
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
    if (collapsed && s.player.hp > 0 && !s.player.isDowned) {
      // Determine which need caused the collapse for better UI feedback
      const cause = s.player.food <= 0 ? "food" : s.player.water <= 0 ? "water" : "sleep";
      s.player.isDowned = true;
      s.player.downedReason = cause;
      s.player.isSleeping = true;
      s.player._reviveHandled = false; // reset so the next revive fires correctly
      s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
      const causeLabel = cause === "food" ? "starving" : cause === "water" ? "dehydrated" : "exhausted";
      addFloater(s, `💀 collapsed (${causeLabel})!`, s.player.x, s.player.y - 20, "rgba(255,80,80,0.95)", 15);
      if (room) sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp, true);
    }

    // ── Death check ────────────────────────────────────────────────────────
    if (s.player.hp <= 0) {
      if (room && !s.player.isDowned) {
        // Co-op: go downed so partner can revive — not instant game over
        s.player.isDowned = true;
        s.player.downedReason = "hp";
        s.player.isSleeping = true;
        s.player.hp = 1; // Keep at 1 so we don't re-trigger next frame
        s.player._reviveHandled = false; // reset so the next revive fires correctly
        s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
        addFloater(s, "💀 DOWNED — partner can revive!", s.player.x, s.player.y - 25, "rgba(255,80,80,0.95)", 16);
        sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, 1, true);
      } else if (!room && !gameOverFiredRef.current) {
        // Solo: immediate game over on HP death
        triggerGameOver(s, { survived: false });
        return;
      }
    }

    // ── Co-op both-downed → game over ─────────────────────────────────────
    // Only the host checks this (to avoid double-firing). If both players are
    // downed at the same time, neither can revive the other — trigger game over.
    if (room && isHostRef.current && s.player.isDowned && s.player2?.isDowned && !gameOverFiredRef.current) {
      triggerGameOver(s, { survived: false, coopBothDowned: true });
      return;
    }

    // ── Boss compass tracking — keep compassTarget synced to boss position ──
    if (s.bossZombie && !s.bossZombie.dead && s.compassTarget?.isBoss) {
      s.compassTarget.x = s.bossZombie.x;
      s.compassTarget.y = s.bossZombie.y;
    }

    // ── Endgame check (boss zombie dead) ─────────────────────────────────────
    if (isHostRef.current && checkEndgame(s) && !gameOverFiredRef.current) {
      addFloater(s, "☠ Boss defeated! You win!", s.player.x, s.player.y - 40, "rgba(255,80,80,0.95)", 18);
      triggerGameOver(s, {
        survived: true,
        nextLevel: false,
        dayssurvived: s.dayNumber,
        zombiesKilled: s.zombiesKilled ?? 0,
        buildingsSearched: s.buildingsSearched ?? 0,
        survivorsFound: s.survivorsFound ?? 0,
        settlementsCleared: s.fragmentsCollected?.length ?? 0,
      });
      return;
    }

    if (isHostRef.current) {
        updateWeather(dt, s.dayNumber, s);
      // ── Sound events ─────────────────────────────────────────────────────
      // Emit continuous engine sound if vehicle is occupied and moving
      if (!s.soundEvents) s.soundEvents = [];
      if (s.vehicle.occupied && moving) {
        // Engine sound: recreated each frame, pulled out by updateSoundEvents ttl=0 trick.
        // Instead we just add one each frame — updateSoundEvents clears old ones immediately.
        // Use a persistent engine source updated in place for efficiency.
        const existing = s.soundEvents.find(e => e.type === "engine");
        if (existing) {
          existing.x = s.vehicle.x;
          existing.y = s.vehicle.y;
          existing.strength = s.vehicle.noise ?? 0.9;
          existing.age = 0; // reset so it never expires while driving
        } else {
          s.soundEvents.push(createSoundEvent("engine", s.vehicle.x, s.vehicle.y, VEHICLE_ENGINE_RANGE, s.vehicle.noise ?? 0.9));
        }
      } else {
        // Remove engine sound when vehicle stops
        const idx = s.soundEvents.findIndex(e => e.type === "engine");
        if (idx !== -1) s.soundEvents.splice(idx, 1);
      }

      updateSoundEvents(s.soundEvents, dtActual);

      // During fast sleep, zombies run at dt*15 per frame which causes them to
      // tunnel through walls in a single step. Substep updateZombies with a
      // physics-safe cap (≤0.1s per step) so wall collision is resolved correctly.
      if (s.isFastSleeping && dt > 0.1) {
        const subStepCount = Math.ceil(dt / 0.1);
        const subDt = dt / subStepCount;
        for (let i = 0; i < subStepCount; i++) {
          updateZombies(
            s.zombies, s.player, s.vehicle, subDt, s.isNight, s.buildings, s.player2,
            s.soundEvents, s.hamletCx ?? WORLD_W / 2, s.hamletCy ?? WORLD_H / 2, s.level ?? 1,
            s.turrets ?? [], s.vehicles ?? [s.vehicle],
          );
        }
      } else {
      updateZombies(
        s.zombies, s.player, s.vehicle, dt, s.isNight, s.buildings, s.player2,
        s.soundEvents, s.hamletCx ?? WORLD_W / 2, s.hamletCy ?? WORLD_H / 2, s.level ?? 1,
        s.turrets ?? [], s.vehicles ?? [s.vehicle],
      );
      }

      // Track zombie kills before applying damage (count newly-dead)
      const prevDeadCount = s.zombies.filter(z => z.dead).length;

      const { playerDmg, vehicleDmg, p2Dmg, p2VehicleDmg, p2VehicleId } =
        applyZombieDamage(s.zombies, s.player, s.vehicle, s.buildings, s.player2, s.vehicles ?? [s.vehicle]);
      if (playerDmg > 0) addFloater(s, `-${playerDmg}`, s.player.x, s.player.y - 15, "rgba(255,80,80,0.9)");
      if (vehicleDmg > 0) addFloater(s, `-${vehicleDmg}`, s.vehicle.x, s.vehicle.y - 20, "rgba(255,160,60,0.9)");
      if (p2Dmg > 0 && s.player2) addFloater(s, `-${p2Dmg}`, s.player2.x, s.player2.y - 15, "rgba(255,80,80,0.9)");
      // P2 is authoritative over its own HP / vehicle HP, so forward the damage we
      // computed here to P2's client; otherwise P2's needs/vehicle broadcasts overwrite it.
      if (room) {
        if (p2Dmg > 0)        sendP2Damage(p2Dmg, false);
        if (p2VehicleDmg > 0) sendP2Damage(p2VehicleDmg, true, p2VehicleId);
      }

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

      // Update turrets — shoot zombies, emit sound
      if (s.turrets?.length) {
        updateTurrets(s.turrets, s.zombies, dt, s.soundEvents);

        // Turret kill floaters
        s.zombies.forEach(z => {
          if (z.dead && z._killedByTurret) {
            const t = s.turrets.find(t2 => t2.id === z._killedByTurret);
            if (t) addFloater(s, "💀", z.x, z.y - 10, "rgba(180,255,120,0.8)", 11);
            z._killedByTurret = null;
          }
        });

        // Zombies damage turrets
        const turretDmgEvents = applyTurretDamage(s.turrets, s.zombies, dt);
        turretDmgEvents.forEach(ev => {
          if (ev.destroyed) {
            const t = s.turrets.find(t2 => t2.id === ev.turretId);
            if (t) {
              addFloater(s, "🗼 destroyed!", t.x, t.y - 20, "rgba(255,80,60,0.95)", 13);
              notify("Turret destroyed!", "rgba(255,80,60,0.95)");
            }
            if (room && sendTurretDestroy) sendTurretDestroy(ev.turretId);
          } else {
            if (room && sendTurretDamage) sendTurretDamage(ev.turretId, ev.hp);
          }
        });
      }

      // Update survivors AI
      if (s.survivors?.length) {
        updateSurvivors(
          s.survivors, s.player, s.vehicle, s.zombies,
          s.turrets ?? [], s.gardenPlots, s.crops, s.buildings, dt
        );
        // Clean harvested crops flagged by survivor AI
        for (let i = s.crops.length - 1; i >= 0; i--) {
          if (s.crops[i].dead) {
            addFloater(s, "🌿 harvested!", s.crops[i].x, s.crops[i].y - 10, "rgba(120,220,80,0.9)");
            s.crops.splice(i, 1);
          }
        }
      }

      // ── Convoy vehicle AI (P1 only) ─────────────────────────────────────
      if (!s.convoyVehicles) s.convoyVehicles = [];
      if (s.convoyVehicles.length > 0) {
        // Zombie collisions for each convoy vehicle
        for (const entry of s.convoyVehicles) {
          if (!entry._ejected && entry.vehicle.occupied) {
            updateVehicleCollisions(entry.vehicle, s.zombies, dt, s.buildings);
          }
        }
        const ejected = updateConvoyVehicles(s.convoyVehicles, s.vehicle, s.survivors, dt, s.buildings);
        // Floaters for ejected survivors
        ejected.forEach(sv => {
          addFloater(s, `${sv.name} on foot!`, sv.x, sv.y - 20, "rgba(255,160,60,0.95)", 13);
        });
        // Remove ejected convoy entries
        for (let i = s.convoyVehicles.length - 1; i >= 0; i--) {
          if (s.convoyVehicles[i]._ejected) s.convoyVehicles.splice(i, 1);
        }
      }

    }

    // ── Cast ticking — runs for every player, not just the host ──────────────
    // playerDmg is only known on the host; on P2 we pass 0 (zombie damage
    // already interrupts via the P2 damage path above if needed).
    {
      const dmgThisFrame = isHostRef.current ? (typeof playerDmg !== "undefined" ? playerDmg : 0) : 0;
      tickCast(dt, dmgThisFrame > 0);
    }

    // Cancel turret repair cast if player walked out of range
    if (castActionRef.current?.type === "repair_turret" && s.turrets?.length) {
      const stillNear = s.turrets.some(t =>
        !t.destroyed && Math.sqrt((s.player.x - t.x)**2 + (s.player.y - t.y)**2) < TURRET_REPAIR_RANGE
      );
      if (!stillNear) cancelCast("Moved too far from turret");
    }

    // Cancel harvest cast if player walked away from plot
    if (castActionRef.current?.type === "harvest") {
      const stillNear = s.crops.some(c => {
        if (c.stage !== "ready") return false;
        const plot = s.gardenPlots.find(p => p.id === c.plotId);
        return plot && dist(s.player.x, s.player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) < 80;
      });
      if (!stillNear) cancelCast("Moved away from crop");
    }

    // Cancel plant cast if player walked away from plot
    if (castActionRef.current?.type === "plant") {
      const stillNear = s.gardenPlots.some(p =>
        !s.crops.some(c => c.plotId === p.id) &&
        dist(s.player.x, s.player.y, p.x + p.w / 2, p.y + p.h / 2) < 80
      );
      if (!stillNear) cancelCast("Moved away from plot");
    }

    // Cancel barricade cast if player walked away from building
    if (castActionRef.current?.type === "barricade") {
      const stillNear = s.buildings.some(b => {
        if (!b.barricadeable || b.barricadeHp > 0) return false;
        const nearDoor = (b.doors || []).some(d => {
          const c = getDoorCenter(b, d);
          return dist(s.player.x, s.player.y, c.x, c.y) < 80;
        });
        return nearDoor || isInsideBuilding(s.player, b);
      });
      if (!stillNear) cancelCast("Moved away from building");
    }

    // Vehicle collision — runs for whoever is driving (not P1-only)
    // Each client runs collision for vehicles they are driving to keep physics responsive.
    // Results propagate to the partner via vehicle_update on the sync tick.
    if (s.player.inVehicle) {
      (s.vehicles ?? [s.vehicle]).forEach(v => {
        if (v.occupied && v.driver === roleRef.current) {
          // On P2 (non-host): snapshot zombie HPs before collision so we can
          // mark any zombie that took damage with _p2HitThisFrame. Without this,
          // the host-sync interpolation loop overwrites P2's local HP damage
          // before the host can confirm the kill, making zombies appear unkillable
          // by vehicle — they take damage but HP resets each frame from host data.
          if (!isHostRef.current) {
            const hpBefore = new Map(s.zombies.map(z => [z.id, z.hp]));
            updateVehicleCollisions(v, s.zombies, dt, s.buildings);
            let anyHit = false;
            s.zombies.forEach(z => {
              const prev = hpBefore.get(z.id);
              if (prev !== undefined && (z.hp < prev || z.dead)) {
                z._p2HitThisFrame = true;
                anyHit = true;
              }
            });
            // Send damaged/dead zombies to host so it can confirm kills authoritatively
            if (anyHit && room) {
              const zombiesForVehicle = s.zombies.filter(z => {
                if (hpBefore.get(z.id) !== undefined && (z.hp < (hpBefore.get(z.id) ?? z.hp) || z.dead)) {
                  if (!z.dead) return true;
                  if (!z._deathBroadcastSent) { z._deathBroadcastSent = true; return true; }
                }
                return false;
              });
              if (zombiesForVehicle.length > 0) sendZombieUpdate(zombiesForVehicle);
            }
          } else {
            updateVehicleCollisions(v, s.zombies, dt, s.buildings);
          }
        }
      });
    }

    if (keysRef.current[" "]) {
      const prevDeadForAttack = s.zombies.filter(z => z.dead).length;
      const hits = playerAttack(s.player, s.zombies, dt);
      if (isHostRef.current) {
        const newDeadForAttack = s.zombies.filter(z => z.dead).length;
        s.zombiesKilled = (s.zombiesKilled ?? 0) + (newDeadForAttack - prevDeadForAttack);
        // Combat sound attracts nearby zombies
        if (hits.length > 0) {
          if (!s.soundEvents) s.soundEvents = [];
          s.soundEvents.push(createSoundEvent("combat", s.player.x, s.player.y, COMBAT_SOUND_RANGE, 0.75));
        }
      }
      hits.forEach(() =>
        addFloater(s, "hit!", s.player.x + (Math.random()-0.5)*20, s.player.y-15, "rgba(255,200,80,0.85)")
      );
      if (!isHostRef.current && room && hits.length > 0) {
        hits.forEach(id => {
          const z = s.zombies.find(z2 => z2.id === id);
          if (!z) return;
          z._p2HitThisFrame = true;
          // Immediately kill locally so the zombie disappears on non-host without waiting for the next host sync
          if (z.hp <= 0) z.dead = true;
        });
        // Send the full update including any newly-dead zombies (dead:true) so host applies the HP/death
        const zombiesForAttack = s.zombies.filter(z => {
          if (!z.dead) return true;
          if (!z._deathBroadcastSent) { z._deathBroadcastSent = true; return true; }
          return false;
        });
        sendZombieUpdate(zombiesForAttack);
      }
    }

    // Decay swing animation timer
    if (s.player.swingTimer > 0) s.player.swingTimer -= dtActual;

    if (isHostRef.current) {
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

    // ── Power moment zoom-out effect (fires on first vehicle entry) ──────────
    if (powerMomentRef.current > 0) {
      powerMomentRef.current -= dtActual;
      const t = Math.max(0, powerMomentRef.current / 2.2); // 1 → 0 as effect plays
      // Ease: zoom out then snap back — peak zoom at midpoint
      const phase = 1 - t;
      const zoomPeak = phase < 0.4
        ? 1 + (phase / 0.4) * 0.22          // ease out to 1.22× (wider view)
        : 1 + (1 - (phase - 0.4) / 0.6) * 0.22; // ease back to 1×
      powerZoomRef.current = zoomPeak;
    } else {
      powerZoomRef.current = 1;
    }

    // ── Low-fuel warning (fires once per tank fill, regardless of whether player is in the vehicle)
    {
      const fuelPct = s.vehicle.fuel / (s.vehicle.maxFuel ?? 80);
      if (fuelPct <= 0.15 && !fuelWarnedRef.current) {
        fuelWarnedRef.current = true;
        notify("⛽ Low fuel! Find a fuel can.", "rgba(255,160,40,0.95)");
        addFloater(s, "⛽ low fuel!", s.vehicle.x, s.vehicle.y - 24, "rgba(255,160,40,0.9)", 13);
      }
      // Reset warning flag once tank is refuelled above 30% so the next drain triggers again
      if (fuelPct > 0.30) fuelWarnedRef.current = false;
    }

    if (room) {
      if (now - lastMoveRef.current > MOVE_THROTTLE) {
        lastMoveRef.current = now;
        sendMyMove(s.player.x, s.player.y, s.player.facing, s.player.inVehicle);
      }
      if (now - lastSyncRef.current > SYNC_THROTTLE) {
        lastSyncRef.current = now;
        if (s.player.inVehicle && s.vehicle.driver === roleRef.current) {
          sendVehicleUpdate(s.vehicle.id, s.vehicle.x, s.vehicle.y, s.vehicle.facing, s.vehicle.hp, s.vehicle.fuel, s.vehicle.driver, s.vehicle.passenger);
        }
        if (isHostRef.current) {
          // Include zombies that just died this frame so partner receives dead:true at least once,
          // then mark them as broadcast-complete so they drop out of future payloads.
          const zombiesForSync = s.zombies.filter(z => {
            if (!z.dead) return true;
            if (!z._deathBroadcastSent) { z._deathBroadcastSent = true; return true; }
            return false;
          });
          sendZombieUpdate(zombiesForSync);

          // Fix 5: Sync turret states every tick (not just on events)
          if (s.turrets?.length) {
            sendTurretStates(s.turrets);
          }

          // Fix 6: Sync survivor positions every tick
          if (s.survivors?.length) {
            sendSurvivorPositions(s.survivors);
          }
        }
        // Broadcast convoy vehicle positions so partner can interpolate
        if (isHostRef.current && s.convoyVehicles?.length && room) {
          const cvPayload = s.convoyVehicles
            .filter(e => !e._ejected && e.vehicle)
            .map(e => ({
              id: e.vehicle._id ?? e.vehicle.id ?? `cv_${e.survivor?.id ?? Math.random()}`,
              x: e.vehicle.x, y: e.vehicle.y, facing: e.vehicle.facing,
              hp: e.vehicle.hp, maxHp: e.vehicle.maxHp,
              vehicleType: e.vehicle.vehicleType ?? "car",
              survivorName: e.survivor?.name ?? "?",
            }));
          if (cvPayload.length > 0) sendConvoyUpdate(cvPayload);
        }
      }
      if (now - lastNeedsRef.current > NEEDS_THROTTLE) {
        lastNeedsRef.current = now;
        sendNeedsUpdate(s.player.food, s.player.water, s.player.sleep, s.player.hp, !!s.player.isDowned);
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
        attackReady: (s.player.attackCooldown ?? 0) <= 0,
        isFastSleeping: s.isFastSleeping,
        holdZ: holdZRef.current,
        isSleeping: s.player.isSleeping,
        vehicleDriver: s.vehicle.driver,
        vehiclePassenger: s.vehicle.passenger,
        mapFragmentCollected: s.mapFragmentCollected,
        compassTarget: s.compassTarget,
        fragmentsCollected: s.fragmentsCollected?.length ?? 0,
        totalFragments: s.totalFragments ?? 0,
        nextSettlementName: s.settlements?.find(st => st.id === s.compassTarget?.settlementId)?.name,
        vehicleHp: s.vehicle.hp,
        vehicleMaxHp: s.vehicle.maxHp,
        vehicleType: s.vehicle.vehicleType ?? "car",
        bossSpawned: !!s.bossZombie,
        bossHp: s.bossZombie?.hp ?? 0,
        bossMaxHp: s.bossZombie?.maxHp ?? BOSS_HP,
        bossDead: s.bossZombie?.dead ?? false,
        isDowned: !!s.player.isDowned,
        downedReason: s.player.downedReason ?? null,
        p2IsDowned: !!(s.player2?.isDowned),
        p2Near: !!(s.player2 && dist(s.player.x, s.player.y, s.player2.x, s.player2.y) < 60),
        p2DownedPos: (s.player2?.isDowned)
          ? { x: s.player2.x, y: s.player2.y, playerX: s.player.x, playerY: s.player.y,
              d: dist(s.player.x, s.player.y, s.player2.x, s.player2.y) }
          : null,
        castBar: castActionRef.current
          ? { label: castActionRef.current.label, icon: castActionRef.current.icon, pct: Math.min(1, castActionRef.current.elapsed / castActionRef.current.duration) }
          : null,
      });
      setCtxActions(getProximityActions(
        s.player, s.buildings, s.vehicle, s.gardenPlots, s.crops, s.lootPiles, s.wells, s.turrets ?? []
      ));
      // Push snapshot to base screen (every 6 frames ≈ 100ms)
      if (onStateSnapshot) onStateSnapshot(s);
    }

    const ctx = canvas.getContext("2d");
    ctx.save(); ctx.scale(dpr, dpr);
    // Sync placement ghost state
    s._placingMode = placingModeRef.current;
    s._placingHint = placingHintRef.current;
    draw(ctx, s, t, W, H, powerZoomRef.current);
    ctx.restore();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, s, t, W, H, zoom = 1) {
    const { cam, player, player2, vehicle, buildings, zombies, floaters,
            gardenPlots, crops, lootPiles, wells, isNight } = s;

    ctx.fillStyle = isNight ? "#040609" : "#08090c";
    ctx.fillRect(0, 0, W, H);

    // ── Power zoom: scale around screen centre ────────────────────────────────
    if (zoom !== 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }

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

    // Settlement aura rings (visible from distance as orientation landmarks)
    if (s.settlements) {
      s.settlements.forEach(st => {
        const { cx: scx, cy: scy } = worldToCanvas(st.cx, st.cy, cam);
        if (scx < -600 || scx > W + 600 || scy < -600 || scy > H + 600) return;
        const cleared = s.fragmentsCollected?.includes(st.id);
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.beginPath(); ctx.arc(scx, scy, 500, 0, Math.PI * 2);
        ctx.fillStyle = cleared ? "rgba(120,255,150,1)" : "rgba(255,220,80,1)";
        ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(scx, scy, 500, 0, Math.PI * 2);
        ctx.strokeStyle = cleared ? "rgba(120,255,150,0.7)" : "rgba(255,220,80,0.5)";
        ctx.lineWidth = 1.5; ctx.setLineDash([6, 10]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = cleared ? "rgba(120,255,150,0.85)" : "rgba(255,220,80,0.75)";
        ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText((cleared ? "✓ " : "") + st.name, scx, scy - 520);
        ctx.restore();
      });
    }

    // Buildings
    buildings.forEach(b => { drawBuilding(ctx, b, cam, isNight, player); });

    // Turrets
    if (s.turrets) {
      s.turrets.forEach(t => drawTurret(ctx, t, cam, t.x, t.y, isNight, s, t));
    }

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

    // Vehicles (all — player fleet + convoy)
    const allVehicles = s.vehicles ?? [vehicle];
    // Build a combined list: fleet vehicles + convoy vehicles (with isConvoy flag)
    const convoyCfg = (s.convoyVehicles ?? []).map(e => ({ v: e.vehicle, isConvoy: true, svName: e.survivor?.name ?? "?" }));
    const fleetCfg  = allVehicles.map(v => ({ v, isConvoy: false, svName: null }));
    const allVehicleCfg = [...fleetCfg, ...convoyCfg];

    allVehicleCfg.forEach(({ v, isConvoy, svName }) => {
      const { cx: vcx, cy: vcy } = worldToCanvas(v.x, v.y, cam);
      const cfg = VEHICLE_TYPES[v.vehicleType] ?? VEHICLE_TYPES.car;
      const hw = cfg.width  / 2;
      const hh = cfg.height / 2;
      ctx.save(); ctx.translate(vcx, vcy); ctx.rotate(v.facing + Math.PI / 2);

      // Body colour — dimmer when not the active vehicle
      const isActive = v === vehicle;
      const bodyColor = v.hp < v.maxHp * 0.3 ? cfg.damageColor : cfg.color;
      ctx.globalAlpha = isActive ? 1 : isConvoy ? 0.82 : 0.75;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-hw, -hh, cfg.width, cfg.height);

      // Convoy vehicles: teal tint overlay to distinguish from player fleet
      if (isConvoy) {
        ctx.fillStyle = "rgba(80,220,200,0.18)";
        ctx.fillRect(-hw, -hh, cfg.width, cfg.height);
      }

      // Windscreen tint
      if (v.vehicleType !== "bike") {
        ctx.fillStyle = "rgba(120,180,255,0.3)";
        ctx.fillRect(-hw + 3, -hh + 4, cfg.width - 6, cfg.height * 0.28);
      }

      // Monster truck: big wheels hint
      if (v.vehicleType === "monster_truck") {
        ctx.fillStyle = "rgba(80,50,30,0.7)";
        ctx.fillRect(-hw - 5, -hh + 4, 5, 14);
        ctx.fillRect(hw,      -hh + 4, 5, 14);
        ctx.fillRect(-hw - 5,  hh - 18, 5, 14);
        ctx.fillRect(hw,       hh - 18, 5, 14);
      }

      if (v.hp < v.maxHp) {
        ctx.rotate(-(v.facing + Math.PI / 2));
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-hw - 2, -hh - 10, (hw + 2) * 2, 3);
        ctx.fillStyle = v.hp / v.maxHp > 0.5 ? "#88ff88" : "#ff5555";
        ctx.fillRect(-hw - 2, -hh - 10, (hw + 2) * 2 * (v.hp / v.maxHp), 3);
      }
      ctx.restore();

      if (isConvoy) {
        // Convoy badge: teal label with survivor name
        ctx.save();
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "rgba(80,220,200,0.9)";
        ctx.fillText(`🚗 ${svName}`, vcx, vcy - hh - 10);
        ctx.restore();
      } else {
        // Survivor passenger badge
        const svPassengers = v.survivorPassengers?.length ?? 0;
        if (svPassengers > 0) {
          ctx.save();
          ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,200,60,0.9)";
          ctx.fillText(`👥 ${svPassengers}`, vcx + hh + 8, vcy);
          ctx.restore();
        }
      }
      if (!player.inVehicle) {
        const d = Math.sqrt((player.x - v.x)**2 + (player.y - v.y)**2);
        if (d < 70) {
          const driverFree    = v.driver === null;
          const passengerFree = v.passenger === null;
          const bothFull      = !driverFree && !passengerFree;
          ctx.save();
          ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          if (bothFull) {
            ctx.fillStyle = "rgba(255,100,100,0.75)";
            ctx.fillText("full", vcx, vcy - hh - 12);
          } else {
            ctx.fillStyle = "rgba(255,220,80,0.85)";
            ctx.fillText(driverFree ? `[F] ${cfg.label}` : "[F] ride shotgun", vcx, vcy - hh - 12);
          }
          if (d < REPAIR_RANGE && v.hp < v.maxHp) {
            ctx.fillStyle = "rgba(120,255,150,0.75)";
            ctx.fillText("[E] repair", vcx, vcy - hh - 24);
          }
          ctx.restore();
        }
      }
    });

    // Zombies
    zombies.forEach(z => {
      if (z.dead) return;
      const { cx, cy } = worldToCanvas(z.x, z.y, cam);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save(); ctx.globalAlpha = 0.88;

      // ── Dormant zombies: crouched, dark, only a faint red eye glow ────────
      if (z.state === "dormant") {
        const eyePulse = 0.3 + 0.25 * Math.sin(t * 1.8 + z.id * 0.7);
        ctx.globalAlpha = 0.38 + 0.12 * eyePulse;
        ctx.beginPath(); ctx.arc(cx, cy, z.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(60,10,10,0.95)"; ctx.fill();
        // Red pinprick eyes
        ctx.globalAlpha = 0.55 + 0.4 * eyePulse;
        ctx.beginPath(); ctx.arc(cx - 2.5, cy - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 2.5, cy - 1, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,30,0,${0.7 + 0.3 * eyePulse})`; ctx.fill();
        ctx.restore();
        return;
      }

      const isBoss = z.type === "boss";
      const isBashing = z.state === "bash_door";
      const offX = isBashing ? (Math.random() - 0.5) * 3 : 0;
      const offY = isBashing ? (Math.random() - 0.5) * 3 : 0;

      if (isBoss) {
        // Boss: pulsing red with thick ring and skull
        const pulse = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.globalAlpha = pulse;
        // Outer glow ring
        ctx.beginPath(); ctx.arc(cx, cy, z.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,30,30,0.5)"; ctx.lineWidth = 3; ctx.stroke();
        // Body
        ctx.beginPath(); ctx.arc(cx, cy, z.radius, 0, Math.PI * 2);
        ctx.fillStyle = z.state === "chase" || z.state === "attack"
          ? "rgba(255,30,30,0.98)" : "rgba(200,20,20,0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("☠", cx, cy + 5);
        // HP bar — wider for boss
        const hpFrac = z.hp / z.maxHp;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(cx - 22, cy - z.radius - 8, 44, 4);
        ctx.fillStyle = hpFrac > 0.5 ? "#ff4444" : hpFrac > 0.25 ? "#ff8800" : "#ffcc00";
        ctx.fillRect(cx - 22, cy - z.radius - 8, 44 * hpFrac, 4);
        ctx.fillStyle = "rgba(255,80,80,0.9)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("BOSS", cx, cy - z.radius - 10);
        ctx.restore();
        return;
      }

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

    // Survivors
    if (s.survivors) {
      s.survivors.forEach(sv => {
        if (sv.hp <= 0) return;
        // Survivors riding in a vehicle are rendered on the vehicle, not separately
        if (sv.inVehicle && sv._ridingVehicle) return;
        const { cx, cy } = worldToCanvas(sv.x, sv.y, cam);
        if (cx < -30 || cx > W + 30 || cy < -30 || cy > H + 30) return;
        // Colour by command/state
        const col = sv.barricaded ? "rgba(255,100,100,0.95)"
          : sv.command === "assign" && sv.assignedTo?.structureType === "turret" ? "rgba(80,220,255,0.95)"
          : sv.command === "assign" && sv.assignedTo?.structureType === "crop"   ? "rgba(120,220,80,0.95)"
          : "rgba(255,200,60,0.95)"; // follow / unassigned = gold
        ctx.save();
        // Glow ring
        ctx.beginPath(); ctx.arc(cx, cy, 12 + 1.5 * Math.sin(t * 2.5), 0, Math.PI * 2);
        ctx.fillStyle = col.replace("0.95", "0.08"); ctx.fill();
        // Body
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        // HP bar
        if (sv.hp < sv.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(cx - 10, cy - 14, 20, 2.5);
          ctx.fillStyle = sv.hp / sv.maxHp > 0.5 ? "#88ff88" : "#ff5555";
          ctx.fillRect(cx - 10, cy - 14, 20 * (sv.hp / sv.maxHp), 2.5);
        }
        // Name label
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(sv.name, cx, cy - 17);
        // State icon
        const stateIcon = sv.barricaded ? "🔒"
          : sv._castType === "repair" ? "🔧"
          : sv._castType === "harvest" ? "🌿"
          : sv.state === "fleeing" ? "💨"
          : "";
        if (stateIcon) {
          ctx.font = "10px sans-serif";
          ctx.fillText(stateIcon, cx + 10, cy - 6);
        }
        // Cast bar for survivor working
        if (sv._castType && sv._castTimer > 0) {
          const castDur = sv._castType === "repair" ? SURVIVOR_REPAIR_CAST : SURVIVOR_HARVEST_CAST;
          const pct = Math.min(1, sv._castTimer / castDur);
          ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(cx - 14, cy + 10, 28, 3);
          ctx.fillStyle = sv._castType === "repair" ? "rgba(120,200,255,0.85)" : "rgba(120,220,80,0.85)";
          ctx.fillRect(cx - 14, cy + 10, 28 * pct, 3);
        }
        // Interaction prompt
        const dToPlayer = dist(sv.x, sv.y, player.x, player.y);
        if (dToPlayer < SURVIVOR_INTERACT_RANGE) {
          ctx.fillStyle = "rgba(255,220,80,0.85)"; ctx.font = "bold 10px sans-serif";
          ctx.fillText("[T] command", cx, cy - 28);
        }
        ctx.restore();
      });
    }

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

      // ── Bat swing arc animation ──────────────────────────────────────────
      if (player.weapon && player.swingTimer > 0) {
        const SWING_DUR = 1 / 1.8; // must match MELEE_RATE
        const progress  = Math.min(1, 1 - player.swingTimer / SWING_DUR);
        const arcStart  = player.swingAngle  ?? (player.facing - MELEE_ARC / 2);
        const arcEnd    = player.swingTarget ?? (player.facing + MELEE_ARC / 2);
        const sweepNow  = arcStart + progress * (arcEnd - arcStart);
        const alpha     = Math.max(0, 1 - progress * 1.5);

        // Filled wedge (swing zone)
        ctx.globalAlpha = alpha * 0.20;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, MELEE_RANGE * 0.9, arcStart, sweepNow);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,220,80,1)";
        ctx.fill();

        // Bat stick — sweeps with the arc
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = "rgba(255,210,60,0.95)";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepNow) * MELEE_RANGE * 0.86, cy + Math.sin(sweepNow) * MELEE_RANGE * 0.86);
        ctx.stroke();

        // Tip glow
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sweepNow) * MELEE_RANGE * 0.86, cy + Math.sin(sweepNow) * MELEE_RANGE * 0.86, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,240,120,0.95)";
        ctx.fill();
      } else if (player.weapon) {
        // Idle: faint aim indicator
        ctx.globalAlpha = 0.20;
        ctx.strokeStyle = "rgba(255,220,80,0.9)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(player.facing) * 9, cy + Math.sin(player.facing) * 9);
        ctx.lineTo(cx + Math.cos(player.facing) * 22, cy + Math.sin(player.facing) * 22);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ── Settlement compass arrow ───────────────────────────────────────────
    drawCompassArrow(ctx, s, t, W, H);

    // ── Downed partner arrow (P1 sees this when P2 is down, and vice versa) ─
    if (s.player2?.isDowned) {
      drawDownedPartnerArrow(ctx, s, t, W, H);
    }

    // Floaters
    floaters.forEach(f => {
      const { cx, cy } = worldToCanvas(f.x, f.y, cam);
      ctx.save(); ctx.globalAlpha = 1 - f.age / f.ttl;
      ctx.fillStyle = f.color ?? "rgba(255,220,80,0.95)";
      ctx.font = `${f.size ?? 12}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(f.text, cx, cy - f.age * 24); ctx.restore();
    });

    // Placement ghost (drawn in screen-space via placingHint — updated each React render)
    // We pass placingHintRef so we can read it from inside the draw call
    if (s._placingHint && s._placingMode) {
      const { x: gx, y: gy } = s._placingHint;
      ctx.save();
      if (s._placingMode === "turret") {
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(gx, gy, TURRET_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180,255,120,0.25)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,180,60,0.7)"; ctx.fill();
        ctx.fillStyle = "rgba(180,255,120,0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🗼", gx, gy - 18);
      } else if (s._placingMode === "crop_plot") {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(80,180,40,0.3)";
        ctx.strokeStyle = "rgba(100,210,60,0.7)";
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.fillRect(gx - 40, gy - 35, 80, 70);
        ctx.strokeRect(gx - 40, gy - 35, 80, 70);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(180,255,120,0.9)"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🌱", gx, gy + 4);
      }
      ctx.restore();
    }

    // Night vignette
    if (isNight) {
      const grad = ctx.createRadialGradient(W/2, H/2, H*0.14, W/2, H/2, H*0.78);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,12,0.76)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }

    // ── Close power zoom transform ─────────────────────────────────────────
    if (zoom !== 1) ctx.restore();

    // ── Beacon vehicle golden pulse (draws in screen-space, outside zoom) ──
    if (!s.firstVehicleEntered) {
      const allV = s.vehicles ?? [vehicle];
      allV.forEach(v => {
        if (!v.isBeacon) return;
        const { cx: bvx, cy: bvy } = worldToCanvas(v.x, v.y, cam);
        const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.25 * pulse;
        ctx.beginPath(); ctx.arc(bvx, bvy, 36 + 18 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,220,60,1)"; ctx.fill();
        ctx.globalAlpha = 0.5 + 0.45 * pulse;
        ctx.beginPath(); ctx.arc(bvx, bvy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,220,60,1)"; ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,220,60,0.95)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("GET IN (F)", bvx, bvy - 30);
        ctx.restore();
      });
    }

    drawMinimap(ctx, s, W, H);
    drawPathToTarget(ctx, s.player, s.compassTarget, cam, W, H, s);

    const weather = getCurrentWeather(stateRef.current);
if (weather.colorTint && s.isNight === false) {
  ctx.fillStyle = weather.colorTint;
  ctx.fillRect(0, 0, W, H);
}

    drawJoystick(ctx, joystickRef.current, W, H);
  }

  // ── Compass arrow toward next settlement fragment / boss ──────────────────
  function drawCompassArrow(ctx, s, t, W, H) {
    if (!s.mapFragmentCollected) return; // hidden until first fragment picked up
    const target = s.compassTarget;
    if (!target) return; // no target (shouldn't happen with boss endgame)

    const isBoss = !!target.isBoss;

    const playerX = s.player.inVehicle ? s.vehicle.x : s.player.x;
    const playerY = s.player.inVehicle ? s.vehicle.y : s.player.y;

    const dx = target.x - playerX;
    const dy = target.y - playerY;
    const angle = Math.atan2(dy, dx);
    const distToTarget = Math.sqrt(dx * dx + dy * dy);

    // Pulse when close to target
    const nearPulse = distToTarget < FRAGMENT_PULSE_RANGE;
    const alpha = nearPulse
      ? 0.7 + 0.3 * Math.sin(t * 8)
      : isBoss
        ? 0.75 + 0.25 * Math.sin(t * 5) // boss pulses faster always
        : 0.7 + 0.15 * Math.sin(t * 2);

    const arrowX = W - 54;
    const arrowY = 54;
    const arrowLen = 26;

    // Color scheme: red for boss, gold for fragments
    const ringColor   = isBoss ? "rgba(255,60,60,0.5)"    : nearPulse ? "rgba(120,255,150,0.5)"  : "rgba(255,220,80,0.25)";
    const bgColor     = isBoss ? "rgba(60,0,0,0.55)"      : nearPulse ? "rgba(120,255,150,0.15)" : "rgba(0,0,0,0.45)";
    const strokeColor = isBoss ? "rgba(255,60,60,0.95)"   : nearPulse ? "rgba(120,255,150,0.95)" : "rgba(255,220,80,0.95)";
    const fillColor   = isBoss ? "rgba(255,60,60,0.85)"   : nearPulse ? "rgba(120,255,150,0.85)" : "rgba(255,220,80,0.85)";
    const labelColor  = isBoss ? "rgba(255,80,80,0.95)"   : nearPulse ? "rgba(120,255,150,0.9)"  : "rgba(255,220,80,0.9)";

    // Background circle
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath(); ctx.arc(arrowX, arrowY, 22, 0, Math.PI * 2);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = isBoss ? 2.5 : 1.5; ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle + Math.PI / 2);

    ctx.strokeStyle = strokeColor;
    ctx.fillStyle   = fillColor;
    ctx.lineWidth   = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(0, -arrowLen / 2);
    ctx.lineTo(9, arrowLen / 2 - 4);
    ctx.lineTo(0, arrowLen / 2 - 12);
    ctx.lineTo(-9, arrowLen / 2 - 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Label + distance below compass circle
    const fragCollected = s.fragmentsCollected?.length ?? 0;
    const totalFrag = s.totalFragments ?? 1;
    const nextSettlement = s.settlements?.find(st => st.id === target.settlementId);
    const label = isBoss ? "☠ BOSS" : (nextSettlement ? nextSettlement.name : "?");

    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.textAlign = "center";
    ctx.fillStyle = labelColor;
    ctx.font = isBoss ? "bold 10px sans-serif" : "bold 9px sans-serif";
    ctx.fillText(label, arrowX, arrowY + 32);

    if (!isBoss) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${fragCollected}/${totalFrag}`, arrowX, arrowY + 42);
    }
    if (distToTarget < 3000) {
      ctx.fillStyle = isBoss ? "rgba(255,120,120,0.55)" : "rgba(255,255,255,0.45)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${Math.round(distToTarget / 10)}m`, arrowX, arrowY + (isBoss ? 42 : 52));
    }
    ctx.restore();
  }

  // ── Downed partner directional arrow ─────────────────────────────────────
  // Shown to the non-downed player so they know where to run to revive.
  function drawDownedPartnerArrow(ctx, s, t, W, H) {
    if (!s.player2?.isDowned) return;
    const playerX = s.player.inVehicle ? s.vehicle.x : s.player.x;
    const playerY = s.player.inVehicle ? s.vehicle.y : s.player.y;
    const dx = s.player2.x - playerX;
    const dy = s.player2.y - playerY;
    const distToP2 = Math.sqrt(dx * dx + dy * dy);

    // Position compass just to the left of the main compass (which is at W-54)
    const arrowX = W - 54 - 56; // 56px gap to the left
    const arrowY = 54;
    const arrowLen = 26;
    const angle = Math.atan2(dy, dx);

    // Urgent pulsing
    const pulse = 0.65 + 0.35 * Math.sin(t * 6);

    // Red/orange partner-downed scheme
    ctx.save();
    ctx.globalAlpha = pulse * 0.85;
    ctx.beginPath(); ctx.arc(arrowX, arrowY, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60,0,0,0.65)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,60,60,0.7)";
    ctx.lineWidth = 2; ctx.stroke();

    ctx.globalAlpha = pulse;
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle + Math.PI / 2);
    ctx.strokeStyle = "rgba(255,80,80,0.95)";
    ctx.fillStyle   = "rgba(255,80,80,0.85)";
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, -arrowLen / 2);
    ctx.lineTo(9, arrowLen / 2 - 4);
    ctx.lineTo(0, arrowLen / 2 - 12);
    ctx.lineTo(-9, arrowLen / 2 - 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Label
    ctx.save();
    ctx.globalAlpha = pulse * 0.95;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,100,100,0.95)";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("💀 P2", arrowX, arrowY + 32);
    if (distToP2 < 3000) {
      ctx.fillStyle = "rgba(255,160,160,0.55)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${Math.round(distToP2 / 10)}m`, arrowX, arrowY + 42);
    }
    ctx.restore();
  }

  function drawTurret(ctx, t, cam) {
    const { cx, cy } = worldToCanvas(t.x, t.y, cam);

    if (t.destroyed) {
      // Rubble
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(120,80,40,0.7)";
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(180,80,40,0.8)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("💀", cx, cy + 4);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(255,100,60,0.7)"; ctx.font = "bold 8px sans-serif";
      ctx.fillText("DESTROYED", cx, cy + 18);
      ctx.restore();
      return;
    }

    const hpFrac = t.hp / t.maxHp;
    ctx.save();
    // Range circle (faint)
    ctx.beginPath(); ctx.arc(cx, cy, t.range, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,255,120,0.06)"; ctx.lineWidth = 1.5; ctx.stroke();
    // Base platform
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(80,100,60,0.95)" : hpFrac > 0.25 ? "rgba(150,90,30,0.95)" : "rgba(180,40,30,0.95)";
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    // Tower
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(100,140,70,0.95)" : "rgba(180,100,30,0.9)";
    ctx.fillRect(cx - 5, cy - 8, 10, 16);
    // Barrel
    ctx.strokeStyle = "rgba(200,200,150,0.9)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy - 20); ctx.stroke();
    // HP bar
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(cx - 12, cy + 17, 24, 3);
    ctx.fillStyle = hpFrac > 0.5 ? "#88ff44" : hpFrac > 0.25 ? "#ffaa22" : "#ff3333";
    ctx.fillRect(cx - 12, cy + 17, 24 * hpFrac, 3);
    // Label
    ctx.fillStyle = "rgba(180,255,120,0.65)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🗼", cx, cy - 22);
    // Under-attack indicator — flash red when low HP
    if (hpFrac < 0.35) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 150);
      ctx.strokeStyle = "rgba(255,50,50,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.stroke();
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
    const MM = 100, pad = 12;
    const mx = pad, my = pad + 36; // top-left, below day counter
    const sx = MM / WORLD_W, sy = MM / WORLD_H;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(mx, my, MM, MM);
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, MM, MM);

    // Settlement regions as faint circles
    if (s.settlements) {
      s.settlements.forEach(st => {
        const cleared = s.fragmentsCollected?.includes(st.id);
        const scx = mx + st.cx * sx;
        const scy = my + st.cy * sy;
        ctx.beginPath(); ctx.arc(scx, scy, 6, 0, Math.PI * 2);
        ctx.fillStyle = cleared ? "rgba(120,255,150,0.25)" : "rgba(255,220,80,0.12)";
        ctx.fill();
        ctx.strokeStyle = cleared ? "rgba(120,255,150,0.6)" : "rgba(255,220,80,0.35)";
        ctx.lineWidth = 1; ctx.stroke();
        // Cleared checkmark
        if (cleared) {
          ctx.fillStyle = "rgba(120,255,150,0.85)";
          ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("✓", scx, scy + 2);
        }
      });
    }

    // Inter-settlement roads
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    s.roads.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(mx + r.x1 * sx, my + r.y1 * sy);
      ctx.lineTo(mx + r.x2 * sx, my + r.y2 * sy);
      ctx.stroke();
    });

    // Buildings (show loot piles)
    s.buildings.forEach(b => {
      const hasLoot = s.lootPiles.some(p => p.buildingId === b.id && !p.collected);
      ctx.fillStyle = hasLoot ? "rgba(255,220,80,0.45)" : "rgba(255,255,255,0.1)";
      ctx.fillRect(mx + b.x*sx, my + b.y*sy, Math.max(2, b.w*sx), Math.max(2, b.h*sy));
    });

    // Zombie dots (throttle to avoid perf issues — sample every 3rd)
    ctx.fillStyle = "rgba(200,40,40,0.7)";
    for (let i = 0; i < s.zombies.length; i += 3) {
      const z = s.zombies[i];
      if (z.dead) continue;
      ctx.beginPath(); ctx.arc(mx + z.x*sx, my + z.y*sy, 0.8, 0, Math.PI*2); ctx.fill();
    }

    // Wells
    if (s.wells) {
      ctx.fillStyle = "rgba(80,160,255,0.7)";
      s.wells.forEach(w => {
        ctx.beginPath(); ctx.arc(mx + w.x*sx, my + w.y*sy, 2, 0, Math.PI*2); ctx.fill();
      });
    }

    // Compass target marker (next fragment or boss)
    if (s.mapFragmentCollected && s.compassTarget) {
      const ct = s.compassTarget;
      const isBoss = !!ct.isBoss;
      const pulse = 5 + 2 * Math.sin(Date.now() / (isBoss ? 200 : 400));
      ctx.beginPath(); ctx.arc(mx + ct.x*sx, my + ct.y*sy, isBoss ? 4 : 3, 0, Math.PI*2);
      ctx.fillStyle = isBoss ? "rgba(255,60,60,0.95)" : "rgba(255,220,80,0.9)"; ctx.fill();
      // Pulsing ring
      ctx.beginPath(); ctx.arc(mx + ct.x*sx, my + ct.y*sy, pulse, 0, Math.PI*2);
      ctx.strokeStyle = isBoss ? "rgba(255,60,60,0.6)" : "rgba(255,220,80,0.5)";
      ctx.lineWidth = 1; ctx.stroke();
      if (isBoss) {
        ctx.fillStyle = "rgba(255,60,60,0.9)";
        ctx.font = "7px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("☠", mx + ct.x*sx, my + ct.y*sy - 5);
      }
    }

    // Vehicles
    ctx.fillStyle = "rgba(200,200,180,0.85)";
    (s.vehicles ?? [s.vehicle]).forEach(v => {
      ctx.beginPath(); ctx.arc(mx + v.x*sx, my + v.y*sy, 2, 0, Math.PI*2); ctx.fill();
    });

    // P2
    if (s.player2) {
      ctx.fillStyle = COL.player2;
      ctx.beginPath(); ctx.arc(mx + s.player2.x*sx, my + s.player2.y*sy, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // Player dot (last so always on top)
    ctx.fillStyle = COL.player;
    ctx.beginPath(); ctx.arc(mx + s.player.x*sx, my + s.player.y*sy, 3, 0, Math.PI*2); ctx.fill();

    // "N" north indicator
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("N", mx + MM/2, my + 7);
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

      {/* Awakening flash — red pulse when the horde wakes up */}
      {awakeningFlash && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(180,0,0,0.35)", animation: "none", transition: "opacity 0.6s", opacity: awakeningFlash ? 1 : 0 }} />
      )}

      {/* Sleep interrupt flash */}
      {sleepFlash && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(255,80,0,0.22)" }} />
      )}

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

      {/* Top-right HUD: weather + action buttons */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        {/* Weather indicator */}
        <div className="text-xs px-2 py-1 rounded-full pointer-events-none"
          style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.6)" }}>
          {getCurrentWeather(stateRef.current).icon} {getCurrentWeather(stateRef.current).name}
        </div>

        {/* P2 connection badge */}
        {room && (
          <div className="text-xs pointer-events-none"
            style={{ color: p2Connected ? "rgba(120,200,255,0.7)" : "rgba(255,255,255,0.2)" }}>
            {p2Connected ? "● P2" : "○ P2 away"}
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex gap-2">
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
          <button onClick={() => { const s = stateRef.current; if (s) handleKeyAction("g", s); }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: buildMenu || placingMode ? "rgba(100,180,60,0.25)" : "rgba(0,0,0,0.6)", border:`1px solid ${buildMenu || placingMode ? "rgba(180,255,120,0.45)" : "rgba(255,255,255,0.12)"}`, color: buildMenu || placingMode ? "rgba(180,255,120,0.9)" : "rgba(180,255,120,0.55)" }}>
            [G] build
          </button>
          <button onClick={() => { if (onStateSnapshot) onStateSnapshot(stateRef.current); if (onOpenBase) onOpenBase(); }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background:"rgba(0,0,0,0.6)", border:"1px solid rgba(255,200,80,0.2)", color:"rgba(255,200,80,0.55)" }}>
            [Tab] base
          </button>
        </div>

        {/* Controls panel — drops down from top-right */}
        {showControls && (
          <div className="rounded-xl p-3 text-xs z-20"
            style={{ background:"rgba(8,9,12,0.95)", border:"1px solid rgba(255,255,255,0.1)", minWidth: 220, maxWidth: 240 }}>
            <div className="text-xs tracking-widest mb-2 font-medium" style={{ color:"rgba(255,200,80,0.7)" }}>CONTROLS</div>
            {[
              ["WASD / ↑↓←→", "Move / steer (driver only)"],
              ["Mouse", "Aim attack direction"],
              ["Space", "Swing bat (cone attack)"],
              ["F", "Interact (doors, loot, vehicle, crops)"],
              ["T", "Command nearby survivor"],
              ["E", "Repair vehicle (needs car parts)"],
              ["B", "Barricade building"],
              ["G", "Build menu (turret / crop plot / homebase)"],
              ["H", "Repair nearby turret (hold 2.5s)"],
              ["Q", "Eat food"],
              ["R", "Drink water"],
              ["Z", "Sleep / wake"],
              ["I", "Inventory"],
              ["Tab", "Base screen (crops, survivors, turrets)"],
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
            {hud.isDriver ? "🚗" : "🪑"} {VEHICLE_TYPES[hud.vehicleType]?.label ?? "Car"} · {hud.isDriver ? "driver" : "passenger"}
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
        <div className="absolute bottom-28 right-4 text-xs px-2 py-1 rounded pointer-events-none"
          style={{ background:"rgba(0,0,0,0.55)", color:"rgba(255,220,80,0.9)", border:"1px solid rgba(255,220,80,0.18)" }}>
          🪓 {hud.weapon} · mouse-aim · Space to swing
        </div>
      )}

      {/* Mobile attack button — smart-targets nearest zombie */}
      {hud.weapon && !hud.inVehicle && (
        <button
          onTouchStart={e => {
            e.preventDefault();
            const s = stateRef.current;
            if (!s || s.player.inVehicle) return;
            // Smart aim: face the nearest zombie in melee range first,
            // then fall back to nearest zombie anywhere visible
            const alive = s.zombies.filter(z => !z.dead);
            let best = null, bestDist = Infinity;
            for (const z of alive) {
              const d = Math.hypot(z.x - s.player.x, z.y - s.player.y);
              if (d < bestDist) { bestDist = d; best = z; }
            }
            if (best) {
              s.player.facing = Math.atan2(best.y - s.player.y, best.x - s.player.x);
            }
            const hits = playerAttack(s.player, s.zombies, 0);
            hits.forEach(() =>
              addFloater(s, "hit!", s.player.x + (Math.random()-0.5)*20, s.player.y-15, "rgba(255,200,80,0.85)")
            );
            if (!isHostRef.current && room && hits.length > 0) {
              hits.forEach(id => {
                const z = s.zombies.find(z2 => z2.id === id);
                if (!z) return;
                z._p2HitThisFrame = true;
                if (z.hp <= 0) z.dead = true;
              });
              const zombiesForAttack = s.zombies.filter(z => {
                if (!z.dead) return true;
                if (!z._deathBroadcastSent) { z._deathBroadcastSent = true; return true; }
                return false;
              });
              sendZombieUpdate(zombiesForAttack);
            }
          }}
          style={{
            position: "absolute",
            bottom: 120,
            right: 24,
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: hud.attackReady === false
              ? "rgba(60,40,0,0.75)"
              : "rgba(255,180,30,0.18)",
            border: `2px solid ${hud.attackReady === false ? "rgba(255,180,30,0.2)" : "rgba(255,200,60,0.65)"}`,
            color: "rgba(255,220,80,0.95)",
            fontSize: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}>
          🪓
        </button>
      )}

      {/* Boss spawned banner */}
      {hud.bossSpawned && !hud.bossDead && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{ background:"rgba(40,0,0,0.85)", border:"1px solid rgba(255,60,60,0.5)", color:"rgba(255,80,80,0.95)" }}>
            ☠ <span>Kill the <strong>boss zombie</strong> to win! — HP: {hud.bossHp}/{hud.bossMaxHp}</span>
          </div>
          {/* Boss HP bar */}
          <div className="mt-1 mx-auto rounded-full overflow-hidden" style={{ width: 200, height: 6, background:"rgba(80,0,0,0.7)", border:"1px solid rgba(255,60,60,0.3)" }}>
            <div style={{ height:"100%", width:`${(hud.bossHp / hud.bossMaxHp) * 100}%`, background:"rgba(255,60,60,0.9)", transition:"width 0.1s linear" }} />
          </div>
        </div>
      )}

      {/* Settlement progress banner */}
      {hud.mapFragmentCollected && hud.compassTarget && !hud.bossSpawned && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{ background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,220,80,0.35)", color:"rgba(255,220,80,0.9)" }}>
            🗺️ <span>Find <strong>{hud.nextSettlementName ?? "the next settlement"}</strong> — {hud.fragmentsCollected ?? 0}/{hud.totalFragments ?? "?"} fragments</span>
          </div>
        </div>
      )}

      {/* Placement mode overlay */}
      {placingMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-20"
          style={{ marginTop: -80 }}>
          <div className="text-xs px-4 py-2 rounded-lg text-center"
            style={{ background:"rgba(0,0,0,0.78)", border:"1px solid rgba(180,255,120,0.35)", color:"rgba(180,255,120,0.9)" }}>
            {placingMode === "turret" ? "🗼 Click to place turret" : "🌱 Click to place garden plot"}
            <span className="ml-3" style={{ color:"rgba(255,255,255,0.3)" }}>G / Esc to cancel</span>
          </div>
        </div>
      )}

      {/* Cast bar */}
      {hud.castBar && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center gap-1.5"
          style={{ bottom: 160 }}>
          <div className="text-xs px-2 py-0.5 rounded"
            style={{ background:"rgba(0,0,0,0.7)", color:"rgba(255,220,80,0.9)", border:"1px solid rgba(255,220,80,0.2)" }}>
            {hud.castBar.icon} {hud.castBar.label}
          </div>
          <div className="rounded-full overflow-hidden" style={{ width: 160, height: 5, background:"rgba(255,255,255,0.1)" }}>
            <div style={{ height:"100%", width:`${hud.castBar.pct * 100}%`, background:"rgba(255,220,80,0.85)", transition:"width 0.1s linear" }} />
          </div>
          <div className="text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>
            Move away or take a hit to interrupt
          </div>
        </div>
      )}

      {/* Survivor command menu */}
      {survivorMenu && (
        <SurvivorCommandMenu
  survivor={survivorMenu.survivor}
  onClose={() => setSurvivorMenu(null)}
  onCommand={(cmd) => {
    const sv = survivorMenu.survivor;
    sv.command = cmd;
    sv.state = "idle";
    sv._castTimer = 0;
    sv._castType = null;
    
    // Track who issued the follow command
    if (cmd === "follow") {
      const s = stateRef.current;
      sv.followLeader = s?.player ?? null;
    }
    
    if (cmd !== "assign") {
      sv.assignedTo = null;
      sv.barricaded = false;
      sv.barricadeBuilding = null;
    }
    
    setSurvivorMenu(null);
    
    // Broadcast to partner if in multiplayer
    if (room && sendSurvivorCommand) {
      sendSurvivorCommand(sv.id, cmd, sv.assignedTo);
    }
    
    if (cmd === "assign") {
      assigningRef.current = { survivor: sv };
      setAssigningMode({ survivor: sv });
      notify(`Walk to a turret or crop plot and press T to assign ${sv.name}`, "rgba(255,220,80,0.9)");
    } else if (cmd === "convoy") {
      const s = stateRef.current;
      if (s) {
        if (!s.convoyVehicles) s.convoyVehicles = [];
        if (!s.convoyVehicles.some(e => e.survivor?.id === sv.id)) {
          const entry = assignSurvivorToConvoy(sv, s.convoyVehicles, s.vehicles ?? [s.vehicle]);
          if (entry) {
            notify(`${sv.name} is now driving convoy! 🚗`, "rgba(80,220,200,0.9)");
          } else {
            sv.command = "follow";
            notify("No free vehicle available for convoy!", "rgba(255,100,100,0.95)");
          }
        } else {
          notify(`${sv.name} is already in the convoy`, "rgba(255,220,80,0.6)");
        }
      }
    } else {
      const s = stateRef.current;
      if (s?.convoyVehicles) {
        const idx = s.convoyVehicles.findIndex(e => e.survivor?.id === sv.id);
        if (idx !== -1) {
          const cv = s.convoyVehicles[idx].vehicle;
          cv.occupied = false;
          cv.driver = null;
          s.convoyVehicles.splice(idx, 1);
        }
      }
      notify(`${sv.name}: ${cmd.replace("_", " ")}`, "rgba(255,220,80,0.9)");
    }
  }}
  onTogglePriority={() => {
    const sv = survivorMenu.survivor;
    sv.priority = sv.priority === "safety_first" ? "harvest_first" : "safety_first";
    setSurvivorMenu({ survivor: sv });
    // Broadcast priority change
    if (room && sendSurvivorCommand) {
      sendSurvivorCommand(sv.id, sv.command, sv.assignedTo);
    }
  }}
/>
      )}
      {/* Sleep vote modal */}
{sleepVoteModal && (
  <div className="absolute inset-0 flex items-center justify-center z-30"
    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    onClick={e => e.stopPropagation()}>
    <div className="rounded-2xl overflow-hidden" style={{ width: 300, background: "#0e1214", border: "1px solid rgba(255,200,80,0.3)" }}>
      <div className="px-5 py-4 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-sm font-medium" style={{ color: "rgba(255,200,80,0.9)" }}>💤 Fast Sleep Request</span>
      </div>
      <div className="px-5 py-4 text-center">
        <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sleepVoteModal.requestingPlayer === "p1" ? "Player 1" : "Player 2"} wants to fast-sleep.
        </p>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          Time remaining: {Math.ceil(sleepVoteModal.timer)}s
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (room) sendSleepResponse(true);
              if (sleepVoteTimerRef.current) clearTimeout(sleepVoteTimerRef.current);
              sleepVoteActiveRef.current = false;
              setSleepVoteModal(null);
            }}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "rgba(120,220,80,0.15)", border: "1px solid rgba(120,220,80,0.3)", color: "rgba(120,220,80,0.9)" }}>
            Accept
          </button>
          <button
            onClick={() => {
              if (room) sendSleepResponse(false);
              if (sleepVoteTimerRef.current) clearTimeout(sleepVoteTimerRef.current);
              sleepVoteActiveRef.current = false;
              setSleepVoteModal(null);
              notify("Fast sleep request declined", "rgba(255,100,100,0.95)");
            }}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,100,100,0.9)" }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Assigning mode overlay */}
      {assigningMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-20"
          style={{ marginTop: -80 }}>
          <div className="text-xs px-4 py-2 rounded-lg text-center"
            style={{ background:"rgba(0,0,0,0.78)", border:"1px solid rgba(255,220,80,0.35)", color:"rgba(255,220,80,0.9)" }}>
            Assigning <strong>{assigningMode.survivor.name}</strong> — walk to a turret or crop plot and press T
            <span className="ml-3" style={{ color:"rgba(255,255,255,0.3)" }}>Esc to cancel</span>
          </div>
        </div>
      )}

      {/* Build menu */}
      {buildMenu && !placingMode && (
        <BuildMenu
          inventory={stateRef.current?.player?.inventory ?? {}}
          onClose={() => setBuildMenu(false)}
          onSelectTurret={() => {
            placingModeRef.current = "turret";
            setPlacingMode("turret");
            setBuildMenu(false);
            notify("Click anywhere to place turret (G to cancel)", "rgba(180,255,120,0.9)");
          }}
          onSelectCropPlot={() => {
            placingModeRef.current = "crop_plot";
            setPlacingMode("crop_plot");
            setBuildMenu(false);
            notify("Click anywhere to place a garden plot (G to cancel)", "rgba(180,255,120,0.9)");
          }}
          nearSettlement={(() => {
            const s = stateRef.current;
            if (!s?.settlements) return null;
            const near = s.settlements.find(st => dist(s.player.x, s.player.y, st.cx, st.cy) < 500);
            if (!near) return null;
            return { ...near, isHome: s.homesettlementId === near.id };
          })()}
          onSetHomebase={() => {
            const s = stateRef.current;
            if (!s?.settlements) return;
            const near = s.settlements.find(st => dist(s.player.x, s.player.y, st.cx, st.cy) < 500);
            if (!near) return;
            s.homesettlementId = near.id;
            pushActivity(activityLog ?? [], `🏠 ${near.name ?? "Settlement"} set as homebase`);
            notify(`🏠 ${near.name} is now your homebase`, "rgba(255,200,80,0.95)");
            setBuildMenu(false);
          }}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-lg pointer-events-none"
          style={{ background:"rgba(0,0,0,0.72)", color:notification.color, border:"1px solid rgba(255,255,255,0.1)" }}>
          {notification.text}
        </div>
      )}

      {/* Fast-sleep badge */}
      {/* Downed overlay */}
      {hud.isDowned && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30"
          style={{ background: "rgba(180,20,20,0.22)" }}>
          <div className="text-2xl font-bold mb-2" style={{ color: "rgba(255,80,80,0.95)", textShadow: "0 2px 12px #000" }}>
            💀 DOWNED
          </div>
          <div className="text-sm px-4 py-2 rounded-lg text-center"
            style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,180,180,0.9)", border: "1px solid rgba(255,80,80,0.3)" }}>
            {hud.downedReason === "hp" && room
              ? "You were overwhelmed — wait for your partner to revive you (F)"
              : hud.downedReason === "food"
              ? "You collapsed from starvation — eat food (Q) to get up"
              : hud.downedReason === "water"
              ? "You collapsed from dehydration — drink water (R) to get up"
              : hud.downedReason === "sleep"
              ? "You collapsed from exhaustion — eat (Q) or drink (R) to get up"
              : hud.downedReason === "hp"
              ? "You were downed — no partner to revive you"
              : "Eat (Q) or drink (R) to revive yourself"}
            {hud.downedReason !== "hp" && hud.p2Near ? " — partner nearby (F)" : ""}
          </div>
        </div>
      )}

      {/* Partner revive hint — near */}
      {!hud.isDowned && hud.p2IsDowned && hud.p2Near && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20"
          style={{ bottom: 200 }}>
          <div className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(0,0,0,0.78)", color: "rgba(120,255,180,0.95)", border: "1px solid rgba(120,255,180,0.3)" }}>
            🫀 [F] Revive partner (hold 3s)
          </div>
        </div>
      )}

      {/* Partner downed warning — show when partner is downed and far away */}
      {!hud.isDowned && hud.p2IsDowned && !hud.p2Near && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(120,0,0,0.82)", border: "1px solid rgba(255,60,60,0.45)", animation: "pulse 1s ease-in-out infinite" }}>
          <span style={{ fontSize: 14 }}>💀</span>
          <span className="text-xs font-bold" style={{ color: "rgba(255,120,120,0.95)" }}>
            Partner is DOWNED — get to them to revive!
          </span>
        </div>
      )}

      {hud.isFastSleeping && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2 z-20">
          <div className="text-2xl">⏩</div>
          <div className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background: "rgba(0,0,0,0.75)", color: "rgba(160,140,255,0.95)", border: "1px solid rgba(140,120,255,0.3)" }}>
            fast-sleeping — move to wake
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

{/* Left-middle: context action hints */}
      {contextActions.length > 0 && !showInventory && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none" style={{ zIndex: 20 }}>
          {contextActions.slice(0, 4).map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
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

{/* Bottom-center column: hotbar anchored to bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style={{ minWidth: 220, maxWidth: 340 }}>
        {/* Quick-slot hotbar */}
        <div className="flex gap-2">
          {quickSlotItems.map((item, idx) => {
            const qty = item ? getInventoryCount(stateRef.current?.player?.inventory || {}, item) : 0;
            const meta = { food: { icon: "🍞" }, water: { icon: "💧" } }[item] || { icon: "❓" };
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{
                    background: qty > 0 ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
                    border: `1px solid ${qty > 0 ? "rgba(255,200,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                  {item ? meta.icon : "⌨️"}
                </div>
                <div className="text-xs" style={{ color: qty > 0 ? "rgba(255,200,80,0.7)" : "rgba(255,255,255,0.2)" }}>
                  {idx + 1}
                </div>
                {qty > 0 && <div className="text-[10px] -mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>×{qty}</div>}
              </div>
            );
          })}
        </div>
      </div>{/* end bottom-center column */}

      {/* Inventory panel */}
      {showInventory && (
        <InventoryPanel
          inventory={inventory}
          player={stateRef.current?.player}
          onClose={() => setShowInv(false)}
          onEat={() => {
            const s = stateRef.current; if (!s) return;
            if (eatFood(s.player)) { notify("Ate food (+25 🍞)"); syncInv(s.player.inventory); }
            else notify("No food!", "rgba(255,100,100,0.95)");
          }}
          onDrink={() => {
            const s = stateRef.current; if (!s) return;
            const ok = drinkWater(s.player, s.buildings, s.wells);
            if (ok) { notify(ok.source === "well" ? "Drank from well" : "Drank water"); syncInv(s.player.inventory); }
            else notify("No water!", "rgba(255,100,100,0.95)");
          }}
        />
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

// ─── Build menu ───────────────────────────────────────────────────────────────

function BuildMenu({ inventory, onClose, onSelectTurret, onSelectCropPlot, onSetHomebase, nearSettlement }) {
  const scrap = inventory.scrap ?? 0;
  const nails = inventory.nails ?? 0;
  const canTurret = scrap >= TURRET_COST.scrap && nails >= TURRET_COST.nails;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 340, background:"rgba(8,9,12,0.97)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color:"rgba(180,255,120,0.85)" }}>🏗️ Build</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.05)" }}>
            G / Esc
          </button>
        </div>

        <div className="px-4 py-2 text-xs" style={{ color:"rgba(255,255,255,0.35)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          Resources: <span style={{ color:"rgba(255,200,80,0.8)" }}>🔩 {scrap} scrap</span>
          {" · "}<span style={{ color:"rgba(255,200,80,0.8)" }}>📌 {nails} nails</span>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Turret */}
          <button
            onClick={canTurret ? onSelectTurret : undefined}
            className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
            style={{
              background: canTurret ? "rgba(100,180,60,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${canTurret ? "rgba(180,255,120,0.35)" : "rgba(255,255,255,0.07)"}`,
              cursor: canTurret ? "pointer" : "not-allowed",
              opacity: canTurret ? 1 : 0.5,
            }}>
            <span className="text-2xl mt-0.5">🗼</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: canTurret ? "rgba(180,255,120,0.9)" : "rgba(255,255,255,0.4)" }}>
                Auto-Turret
              </div>
              <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.35)" }}>
                Shoots nearby zombies automatically. Attracts more from range. Needs manual repair.
              </div>
              <div className="text-xs mt-1.5 flex gap-3">
                <span style={{ color: scrap >= TURRET_COST.scrap ? "rgba(180,255,120,0.7)" : "rgba(255,100,100,0.8)" }}>
                  🔩 {TURRET_COST.scrap} scrap ({scrap} have)
                </span>
                <span style={{ color: nails >= TURRET_COST.nails ? "rgba(180,255,120,0.7)" : "rgba(255,100,100,0.8)" }}>
                  📌 {TURRET_COST.nails} nails ({nails} have)
                </span>
              </div>
            </div>
          </button>

          {/* Crop plot */}
          <button
            onClick={onSelectCropPlot}
            className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
            style={{
              background: "rgba(60,120,30,0.1)",
              border: "1px solid rgba(100,180,60,0.35)",
              cursor: "pointer",
            }}>
            <span className="text-2xl mt-0.5">🌱</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color:"rgba(120,210,80,0.9)" }}>
                Garden Plot
              </div>
              <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.35)" }}>
                Place a new plot anywhere on open ground. Needs seeds to plant (F near plot).
              </div>
              <div className="text-xs mt-1.5" style={{ color:"rgba(120,210,80,0.55)" }}>
                Free to place
              </div>
            </div>
          </button>

          {/* Set as Homebase — only shown when near a settlement */}
          {nearSettlement && (
            <button
              onClick={onSetHomebase}
              className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
              style={{
                background: nearSettlement.isHome ? "rgba(255,200,80,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${nearSettlement.isHome ? "rgba(255,200,80,0.3)" : "rgba(255,255,255,0.1)"}`,
                cursor: nearSettlement.isHome ? "default" : "pointer",
              }}>
              <span className="text-2xl mt-0.5">🏠</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: nearSettlement.isHome ? "rgba(255,200,80,0.7)" : "rgba(255,255,255,0.7)" }}>
                  {nearSettlement.isHome ? `✓ ${nearSettlement.name} is your homebase` : `Set ${nearSettlement.name} as Homebase`}
                </div>
                <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.3)" }}>
                  {nearSettlement.isHome ? "Base screen shows crops & survivors here." : "Designates this settlement as your base of operations."}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ITEM_META = {
  food:         { icon: "🍞", name: "Food",        desc: "Press Q to eat (+25 food)" },
  water:        { icon: "💧", name: "Water",       desc: "Press R to drink (+30 water)" },
  wood:         { icon: "🪵", name: "Wood",        desc: "Used for barricading & building" },
  nails:        { icon: "📌", name: "Nails",       desc: "Used for barricading & building" },
  scrap:        { icon: "🔩", name: "Scrap Metal", desc: "Used to build and repair turrets" },
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
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color:"rgba(255,200,80,0.85)" }}>Shared Inventory</span>
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

// ─── Survivor command menu ────────────────────────────────────────────────────

function SurvivorCommandMenu({ survivor, onClose, onCommand, onTogglePriority }) {
  const commands = [
    { cmd: "follow",    label: "Follow me",      icon: "🟡", desc: "Walks near you, fights if needed" },
    { cmd: "stay_here", label: "Stay here",      icon: "🟤", desc: "Holds position, defends area" },
    { cmd: "stay_safe", label: "Stay safe",      icon: "🟢", desc: "Retreats from zombies, wanders nearby" },
    { cmd: "fight",     label: "Fight",          icon: "🔴", desc: "Actively hunts nearby zombies" },
    { cmd: "assign",    label: "Assign to…",     icon: "🔵", desc: "Walk to a turret or crop plot to assign" },
    { cmd: "convoy",    label: "Drive convoy",   icon: "🚗", desc: "Takes a free vehicle and follows your trail" },
  ];
  const colMap = { follow:"rgba(255,200,60,0.9)", stay_here:"rgba(200,150,80,0.9)", stay_safe:"rgba(120,220,80,0.9)", fight:"rgba(255,100,100,0.9)", assign:"rgba(80,200,255,0.9)", convoy:"rgba(80,220,200,0.9)" };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 320, background:"rgba(8,9,12,0.97)", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <span className="text-sm font-medium" style={{ color:"rgba(255,220,80,0.9)" }}>👤 {survivor.name}</span>
            <span className="ml-2 text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>HP {survivor.hp}/{survivor.maxHp}</span>
          </div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.05)" }}>Esc</button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          {commands.map(({ cmd, label, icon, desc }) => (
            <button key={cmd}
              onClick={() => onCommand(cmd)}
              className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
              style={{
                background: survivor.command === cmd ? `${(colMap[cmd] ?? "rgba(255,255,255,0.9)").replace("0.9","0.1")}` : "rgba(255,255,255,0.03)",
                border: `1px solid ${survivor.command === cmd ? (colMap[cmd] ?? "rgba(255,255,255,0.3)").replace("0.9","0.35") : "rgba(255,255,255,0.07)"}`,
                cursor: "pointer",
              }}>
              <span className="text-sm mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium" style={{ color: survivor.command === cmd ? (colMap[cmd] ?? "rgba(255,255,255,0.9)") : "rgba(255,255,255,0.7)" }}>
                  {label} {survivor.command === cmd ? "✓" : ""}
                </div>
                <div className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.3)" }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Priority toggle (only relevant for crop-assigned survivors) */}
        {survivor.command === "assign" && survivor.assignedTo?.structureType === "crop" && (
          <div className="px-4 pb-4">
            <button onClick={onTogglePriority}
              className="w-full py-2 rounded-lg text-xs"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
              Priority: <span style={{ color:"rgba(255,220,80,0.85)" }}>
                {survivor.priority === "safety_first" ? "⚠️ Safety first (flee zombies)" : "🌿 Harvest first (ignore zombies)"}
              </span> — tap to toggle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}