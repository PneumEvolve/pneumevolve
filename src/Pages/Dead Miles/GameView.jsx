// src/Pages/DeadMiles/GameView.jsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDeadMilesRoom } from "./useDeadMilesRoom";
import {
  createInitialState,
  createHomeBaseState,
  movePlayer, driveVehicle, syncPlayerToVehicle,
  tryEnterVehicle, exitVehicle,
  updateNeeds, updateZombies, applyZombieDamage,
  updateVehicleCollisions, playerAttack,
  tryToggleDoor, tryCollectLoot, tryDiscoverSurvivor,
  tryBarricade, updateBarricades, updateDoorBashing, getSleepLocation,
  tryPlantCrop, updateCrops, tryHarvestCrop,
  tryRepairVehicle,
  refuelVehicle,
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
  updateAutoPlayer,
  AUTO_SLEEP_UNTIL,
  BASE_UPGRADE_TREE,
} from "./deadMilesEngine";
import { BLUEPRINT_BUILD_TIME, BLUEPRINT_INTERACT_RANGE, BLUEPRINT_COSTS } from "./engine_homebase";
import {
  createJoystick, joystickTouchStart, joystickTouchMove,
  joystickTouchEnd, drawJoystick,
} from "../Stronghold/mobileControls";
import SurvivorCommandMenu from "./SurvivorCommandMenu";
import BuildMenu from "./BuildMenu";
import InventoryPanel from "./InventoryPanel";
import { draw } from "./gameview_render";
import UpgradeMenu from "./UpgradeMenu";

const MOVE_THROTTLE  = 100;
const SYNC_THROTTLE  = 200;
const NEEDS_THROTTLE = 500;

export default function GameView({ room, role = "p1", onGameOver, level = 1, missionType = "clear", deployInventory = null, deploySurvivors = null, deployVehicles = null, deployBlueprints = null, onStateSnapshot, onOpenBase, activityLog, autoPlay = false, onDropIn, onAutoplay, onUpgradeBase, onGetStateRef }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);

  // ── Forward stateRef to parent (for heartbeat simulation) ────────────────
  useEffect(() => {
    if (onGetStateRef) onGetStateRef(stateRef);
  }, [onGetStateRef]); // eslint-disable-line react-hooks/exhaustive-deps
  const keysRef     = useRef({});
  const joystickRef = useRef(createJoystick());
  const rafRef      = useRef(null);
  const holdZRef        = useRef(0);
  const zHoldActiveRef  = useRef(false);
  const flashRef        = useRef(0);
  const gameOverFiredRef = useRef(false);
  const autoPlayRef     = useRef(autoPlay);
  const autoAttackCooldownRef = useRef(0);
  const autoNeedsCooldownRef  = useRef(0); // separate cooldown for eat/drink so combat doesn't block needs
  // Keep the ref in sync whenever the prop changes (e.g. after Drop In)
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // ── Manager HUD state ─────────────────────────────────────────────────────
  // aiStance: player-controlled toggle that shifts autoplayer priorities
  // goHomeNow: mid-run escape flag — routes AI to exit immediately
  const [aiStance, setAiStance] = useState("loot"); // "loot" | "fight" | "flee"
  const aiStanceRef = useRef("loot");
  const [goHomeNow, setGoHomeNow] = useState(false);
  const goHomeNowRef = useRef(false);
  useEffect(() => { aiStanceRef.current = aiStance; }, [aiStance]);
  useEffect(() => { goHomeNowRef.current = goHomeNow; }, [goHomeNow]);

  const isHomeBase = missionType === "homebase";
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
  // Touch-device flag: drives tappable context-action buttons on mobile.
  // (Joystick + attack button already work on touch; this fills the last gap.)
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
      (("ontouchstart" in window) || (navigator.maxTouchPoints ?? 0) > 0)
    );
  }, []);
  const [showControls, setShowControls] = useState(false);
  const [showInventory, setShowInv]     = useState(false);
  const [buildMenu, setBuildMenu]       = useState(false);
  const [upgradeMenuOpen, setUpgradeMenuOpen] = useState(false);
  const [placingMode, setPlacingMode]   = useState(null); // null | "turret" | "crop_plot"
  const placingModeRef                  = useRef(null);
  const placingHintRef                  = useRef(null);
  const [placingHint, setPlacingHint]   = useState(null); // { x, y } canvas coords

  // ── Secure-base phase (post-victory, before leaving) ─────────────────────
  // Shown after boss death. Player can optionally place turret + garden plot
  // before clicking "Leave" which fires onGameOver with the metadata.
  const [securePhase, setSecurePhase]   = useState(null); // null | "active"
  const securePhaseRef                  = useRef(null);    // mirrors securePhase for rAF loop
  const securePlacedRef                 = useRef({ turret: false, garden: false });
  const [securePlaced, setSecurePlaced] = useState({ turret: false, garden: false });
  // Snapshot of game state at the moment boss died, used when player clicks Leave
  const secureScoreRef                  = useRef(null);

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
    onSurvivorCommand: ({ survivorId, command, assignedTo, issuedBy }) => {
  const s = stateRef.current;
  if (!s) return;
  
  const survivor = s.survivors?.find(sv => sv.id === survivorId);
  if (!survivor) return;
  
  survivor.command = command;
  survivor.state = "idle";
  survivor._castTimer = 0;
  survivor._castType = null;
  // Reset follow slot so it's recalculated for the new leader
  survivor._followSlot = null;
  
  if (assignedTo) {
    survivor.assignedTo = assignedTo;
  } else if (command !== "assign") {
    survivor.assignedTo = null;
    survivor.barricaded = false;
    survivor.barricadeBuilding = null;
  }
  
  // FIX 3: Use issuedBy to determine who the followLeader should be.
  // issuedBy is the role string ("p1"/"p2") of the player who issued the command.
  if (command === "follow") {
    if (issuedBy === roleRef.current) {
      // The command was issued by this client's player
      survivor.followLeader = s.player;
    } else {
      // The command was issued by the remote player
      survivor.followLeader = s.player2 ?? s.player;
    }
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
    onMapFragment: ({ mapFragmentCollected, fragmentsCollected, compassTarget, totalFragments }) => {
      const s = stateRef.current; if (!s) return;
      // Sync all fragment state so P2 count, compass target, and arrow match P1
      if (mapFragmentCollected != null) s.mapFragmentCollected = mapFragmentCollected;
      if (Array.isArray(fragmentsCollected)) s.fragmentsCollected = fragmentsCollected;
      if (compassTarget != null) s.compassTarget = compassTarget;
      if (totalFragments != null) s.totalFragments = totalFragments;
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
        // FIX 10: null followLeader on any survivor that was following player2 so
        // they fall back to following s.player instead of a stale dead reference.
        if (s.survivors?.length && s.player2) {
          for (const sv of s.survivors) {
            if (sv.followLeader === s.player2) {
              sv.followLeader = null;
              sv._followSlot = null;
            }
          }
        }
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

  function getMyVehicle(s, role) {
  const all = s.vehicles ?? [s.vehicle];
  return all.find(v => v.driver === role || v.passenger === role) ?? s.vehicle;
}

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

  // Returns movement + optional action for this frame.
  // In autoPlay mode, derives from the AI; otherwise from keyboard/joystick.
  function getMovementAndAction(s, dt) {
    if (!autoPlayRef.current) return { ...getMovementVec(), action: null };
    // Sync manager controls into game state so autoplayer can read them
    s.aiStance   = aiStanceRef.current;
    s._goHomeNow = goHomeNowRef.current;
    return updateAutoPlayer(s.player, s, dt);
  }

  function notify(text, color = "rgba(255,220,80,0.95)") {
    setNote({ text, color });
    setTimeout(() => setNote(null), 2800);
  }

  function triggerGameOver(s, extra = {}) {
    if (gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;

    const recap = s.player.deathRecap?.getRecap() || "";

    // Step 7: tally resources the player is carrying when they leave the level
    const inv = s.player?.inventory ?? {};
    const resourcesCollected = {
      food:  Math.floor(inv.food  ?? 0),
      scrap: Math.floor(inv.scrap ?? 0),
    };

    // Step 8: if this is a defend mission victory, mark it
    const isDefendVictory = s._missionType === "defend" && extra.survived;

    // Homebase: dying or leaving always returns to worldmap (no gameover screen)
    const isHomeBase = s._missionType === "homebase";

    const score = {
      survived: isHomeBase ? true : false,
      dayssurvived: s.dayNumber,
      zombiesKilled: s.zombiesKilled ?? 0,
      buildingsSearched: s.buildingsSearched ?? 0,
      survivorsFound: s.survivorsFound ?? 0,
      deathRecap: recap,
      resourcesCollected,
      missionType: s._missionType ?? "clear",
      ...(isDefendVictory ? { defended: true, baseHpRestored: 50 } : {}),
      ...extra,
    };
    // Broadcast to partner so their screen transitions too
    if (room) sendGameOver(score);
    onGameOver(score);
  }

  // ── Secure-base: called instead of triggerGameOver on boss death ──────────
  // Pauses the narrative flow, shows the "Secure This Base" overlay.
  // triggerGameOver is called later when the player clicks "Leave".
  function triggerSecurePhase(s) {
    if (gameOverFiredRef.current) return;
    // Capture the score snapshot now so it's ready for when Leave is clicked
    secureScoreRef.current = {
      survived: true,
      dayssurvived: s.dayNumber,
      zombiesKilled: s.zombiesKilled ?? 0,
      buildingsSearched: s.buildingsSearched ?? 0,
      survivorsFound: s.survivorsFound ?? 0,
      settlementsCleared: s.fragmentsCollected?.length ?? 0,
    };
    securePhaseRef.current = "active";
    setSecurePhase("active");
  }

  // Called from the "Leave" button in the secure-base overlay
  function handleSecureLeave() {
    const placed = securePlacedRef.current;
    const baseScore = secureScoreRef.current ?? {};
    triggerGameOver(stateRef.current, {
      ...baseScore,
      turretPlaced: placed.turret,
      gardenPlots: placed.garden ? 1 : 0,
    });
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
  const myVehicle = getMyVehicle(s, roleRef.current);  // ← find actual vehicle
  exitVehicle(s.player, myVehicle, roleRef.current);
  s.vehicle = myVehicle; // keep s.vehicle in sync
  notify("Got out of vehicle");
  if (room) sendVehicleUpdate(
    myVehicle.id,
    myVehicle.x, myVehicle.y, myVehicle.facing,
    myVehicle.hp, myVehicle.fuel,
    myVehicle.driver, myVehicle.passenger
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
          if (room && sendMapFragment) sendMapFragment({
            mapFragmentCollected: s.mapFragmentCollected,
            fragmentsCollected: s.fragmentsCollected ?? [],
            compassTarget: s.compassTarget ?? null,
            totalFragments: s.totalFragments ?? 0,
          });
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

      // Well drink — check if near a well
      const nearWell = s.wells?.some(w => dist(s.player.x, s.player.y, w.x, w.y) < 60);
      const nearBuildingWell = s.buildings.some(b => b.hasWell &&
        dist(s.player.x, s.player.y, b.x + b.w / 2, b.y + b.h / 2) < 80);
      if (nearWell || nearBuildingWell) {
        if (castActionRef.current?.type === "drink") return;
        startCast({
          type: "drink",
          duration: 1.5,
          label: "Drinking from well",
          icon: "💧",
          onComplete: () => {
            const ok = drinkWater(s.player, s.buildings, s.wells);
            if (ok) {
              notify("Drank from well (+30 💧)");
              syncInv(s.player.inventory);
            }
          },
        });
        return;
      }

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

    // ── Blueprint build prompt (homebase only) ────────────────────────────
    // If the player is near a queued blueprint, pressing F starts the build cast.
    if (isHomeBase && s.blueprints?.length > 0) {
      const nearBlueprint = s.blueprints.find(bp =>
        dist(s.player.x, s.player.y, bp.x, bp.y) < BLUEPRINT_INTERACT_RANGE
      );
      if (nearBlueprint) {
        if (castActionRef.current?.type === "build_blueprint") return;
        const bpId = nearBlueprint.id;
        const bpType = nearBlueprint.type;
        const label = bpType === "turret" ? "Building Turret" : "Building Garden Plot";
        const icon  = bpType === "turret" ? "🗼" : "🌱";
        startCast({
          type: "build_blueprint",
          duration: BLUEPRINT_BUILD_TIME,
          label,
          icon,
          onComplete: () => {
            // Find the blueprint again (state may have mutated)
            const idx = s.blueprints?.findIndex(bp => bp.id === bpId) ?? -1;
            if (idx === -1) return; // already built
            const bp = s.blueprints[idx];
            if (bpType === "turret") {
              if (!s.turrets) s.turrets = [];
              // Directly construct the turret object (mirrors engine_entities.createTurret)
              s.turrets.push({
                id: `turret_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                x: bp.x, y: bp.y,
                hp: TURRET_HP, maxHp: TURRET_HP,
                range: TURRET_RANGE,
                damage: 25,
                fireRate: 1.5,
                shootCooldown: 0,
                attractRadius: 450,
                radius: 14,
              });
              notify("🗼 Turret built!", "rgba(120,255,150,0.95)");
            } else if (bpType === "crop_plot") {
              const plotW = 80, plotH = 70;
              const plot = {
                id: `plot_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                x: bp.x - plotW / 2, y: bp.y - plotH / 2,
                w: plotW, h: plotH,
                crop: null, growTimer: 0,
              };
              if (!s.gardenPlots) s.gardenPlots = [];
              s.gardenPlots.push(plot);
              notify("🌱 Garden plot built!", "rgba(120,220,80,0.95)");
            }
            // Remove the blueprint
            s.blueprints.splice(idx, 1);
          },
        });
        return;
      }
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
      // ── Deposit chest — merge carry inventory into base storage ─────────
      const chest = s.depositChest;
      if (chest) {
        const playerDist = dist(s.player.x, s.player.y, chest.x, chest.y);
        if (playerDist < chest.radius + 40) {
          const inv = s.player.inventory ?? {};
          const bs  = s.baseStorage ?? {};
          const DEPOSIT_KEYS = ["food","water","scrap","nails","wood","seeds","tools","fuel","medicine","ammo","car_parts","bat"];
          let deposited = false;
          for (const k of DEPOSIT_KEYS) {
            const qty = Math.floor(inv[k] ?? 0);
            if (qty > 0) {
              bs[k] = (bs[k] ?? 0) + qty;
              inv[k] = 0;
              deposited = true;
            }
          }
          if (deposited) {
            s.baseStorage = bs;
            s.player.inventory = inv;
            syncInv(inv);
            syncBaseStorage(bs);
            notify("📦 Supplies deposited to base storage", "rgba(120,220,150,0.95)");
            addFloater(s, "Deposited!", chest.x, chest.y - 20, "rgba(120,220,150,0.95)", 13);
          } else {
            notify("Nothing to deposit", "rgba(180,180,180,0.6)");
          }
          return;
        }
      }

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

    if (key === "r" || key === "R") {
      // Refuel vehicle with fuel cans
      if (castActionRef.current?.type === "refuel") return;
      const refuelVehicles = s.vehicles ?? [s.vehicle];
      let refuelTarget = null;
      let refuelDist = Infinity;
      for (const v of refuelVehicles) {
        const d = dist(s.player.x, s.player.y, v.x, v.y);
        if (d < refuelDist) { refuelDist = d; refuelTarget = v; }
      }
      if (refuelTarget && refuelDist <= REPAIR_RANGE) {
        const fuelCount = refuelTarget.fuel ?? 0;
        if ((s.player.inventory.fuel ?? 0) < 1) { notify("No fuel cans!", "rgba(255,100,100,0.95)"); return; }
        if (refuelTarget.fuel >= refuelTarget.maxFuel) { notify("Tank is full!", "rgba(180,180,180,0.6)"); return; }
        startCast({
          type: "refuel",
          duration: 2.0,
          label: "Refueling vehicle",
          icon: "⛽",
          onComplete: () => {
            const result = refuelVehicle(s.player, refuelTarget);
            if (result?.success) {
              notify(`⛽ +30 fuel (${Math.round(refuelTarget.fuel)}/${refuelTarget.maxFuel})`, "rgba(120,220,255,0.95)");
              syncInv(s.player.inventory);
            } else if (result?.fail === "no_fuel") {
              notify("No fuel cans left!", "rgba(255,100,100,0.95)");
            } else if (result?.fail === "full_tank") {
              notify("Tank is already full!", "rgba(180,180,180,0.6)");
            }
          },
        });
        return;
      }
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
            sendSurvivorCommand(sv.id, "assign", { structureId: nearTurret.id, structureType: "turret" }, roleRef.current);
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
            sendSurvivorCommand(sv.id, "assign", { structureId: nearPlot.id, structureType: "crop" }, roleRef.current);
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

  // Timer countdown for sleep vote — interval runs while modal is open.
  // Using a ref to track the "open" state avoids re-creating the interval
  // on every 100ms tick update (which previously caused interval churn because
  // sleepVoteModal was in the dependency array and changed every tick).
  const sleepVoteOpenRef = useRef(false);
useEffect(() => {
  if (!sleepVoteModal) {
    sleepVoteOpenRef.current = false;
    return;
  }
  sleepVoteOpenRef.current = true;

  const interval = setInterval(() => {
    if (!sleepVoteOpenRef.current) { clearInterval(interval); return; }
    setSleepVoteModal(prev => {
      if (!prev) return null;
      const newTimer = prev.timer - 0.1;
      if (newTimer <= 0) return null;
      return { ...prev, timer: newTimer };
    });
  }, 100);

  return () => {
    clearInterval(interval);
    sleepVoteOpenRef.current = false;
  };
}, [sleepVoteModal?.requestingPlayer]); // only re-create when a NEW vote starts, not each tick

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

    stateRef.current = level === 0
      ? createHomeBaseState()
      : createInitialState(room?.map_seed ?? Date.now(), level);
    // FIX 5: initialise baseStorage on the live state object if absent
    if (!stateRef.current.baseStorage) stateRef.current.baseStorage = {};
    // Reset autoplay spawn-safety timer so every new level starts with a fresh grace window.
    if (stateRef.current.player) delete stateRef.current.player._autoSpawnGrace;

    // ── Step 7: merge carry inventory pre-stocked in handleDeploy ─────────
    if (deployInventory) {
      const inv = stateRef.current.player.inventory ?? {};
      for (const [k, v] of Object.entries(deployInventory)) {
        inv[k] = (inv[k] ?? 0) + v;
      }
      stateRef.current.player.inventory = inv;
    }

    // ── Phase 0.3 (c): replace generated survivors with the deployed roster party ─
    if (deploySurvivors?.length) {
      // Re-anchor spawn positions to the player's actual start location
      const px = stateRef.current.player.x;
      const py = stateRef.current.player.y;
      const spread = 60;
      stateRef.current.survivors = deploySurvivors.map((sv, i) => {
        const angle = (i / Math.max(1, deploySurvivors.length)) * Math.PI * 2;
        return { ...sv, x: px + Math.cos(angle) * spread, y: py + Math.sin(angle) * spread };
      });
    }

    // ── Step 8: defend mission — record mission type and spawn defend wave ─
    stateRef.current._missionType = missionType;

    // ── Task 2.1: seed garage vehicles into the homebase run ─────────────────
    // deployVehicles is a map of { "player" | survivorId → garageVehicle }
    // For now we inject them into the vehicles array so the in-run fleet is real.
    if (deployVehicles && Object.keys(deployVehicles).length > 0) {
      const s = stateRef.current;
      // Place each assigned vehicle near the player spawn
      const px = s.player.x;
      const py = s.player.y;
      let vi = 0;
      for (const [assigneeId, garageV] of Object.entries(deployVehicles)) {
        const angle = (vi / Math.max(1, Object.keys(deployVehicles).length)) * Math.PI * 2;
        const spawnR = 100 + vi * 30;
        const vx = px + Math.cos(angle) * spawnR;
        const vy = py + Math.sin(angle) * spawnR;
        const VT = VEHICLE_TYPES;
        const cfg = VT[garageV.vehicleType] ?? VT.car;
        const runVehicle = {
          id: garageV.id,
          vehicleType: garageV.vehicleType,
          x: vx, y: vy,
          hp: garageV.hp, maxHp: garageV.maxHp ?? cfg.hp ?? 300,
          fuel: garageV.fuel ?? cfg.fuel ?? 80, maxFuel: garageV.maxFuel ?? cfg.fuel ?? 80,
          facing: 0, speed: cfg.speed ?? 300, noise: cfg.noise ?? 0.9,
          zombieKill: cfg.zombieKill ?? false, seats: cfg.seats ?? 2,
          driver: null, passenger: null, occupied: false,
          upgrades: garageV.upgrades ?? [],
          isBeacon: vi === 0,
        };
        // Avoid duplication: don't add if already present
        const exists = (s.vehicles ?? []).some(v => v.id === runVehicle.id);
        if (!exists) {
          if (!s.vehicles) s.vehicles = [];
          s.vehicles.push(runVehicle);
          if (vi === 0) s.vehicle = runVehicle;
        }
        vi++;
      }
    }

    // ── Task 2.3: seed blueprints from persistent homeBase into the run ───────
    if (missionType === "homebase" && deployBlueprints?.length > 0) {
      stateRef.current.blueprints = [...deployBlueprints];
    } else if (!stateRef.current.blueprints) {
      stateRef.current.blueprints = [];
    }

    if (missionType === "defend") {
      // Spawn a reinforced wave immediately so the player has something to fight.
      // createZombie is called here directly; the multiplier matches DEFEND_WAVE_MULTIPLIER=2.
      const s = stateRef.current;
      const cx = s.hamletCx ?? (s.player.x);
      const cy = s.hamletCy ?? (s.player.y);
      const waveCount = 20; // base defend wave size
      for (let i = 0; i < waveCount; i++) {
        const angle = (i / waveCount) * Math.PI * 2;
        const spawnDist = 400 + Math.random() * 200;
        const zx = cx + Math.cos(angle) * spawnDist;
        const zy = cy + Math.sin(angle) * spawnDist;
        s.zombies.push(createZombie(
          Math.max(80, Math.min(WORLD_W - 80, zx)),
          Math.max(80, Math.min(WORLD_H - 80, zy)),
          true // alerted = immediately chase
        ));
      }
      // Flag so the secure-phase overlay uses defend-win path
      s._defendWaveSpawned = true;
    };

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
        // If this placement was part of the secure-base flow, tick off the checklist
        if (securePhaseRef.current === "active") {
          securePlacedRef.current = { ...securePlacedRef.current, turret: true };
          setSecurePlaced(p => ({ ...p, turret: true }));
        }
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
        // If this placement was part of the secure-base flow, tick off the checklist
        if (securePhaseRef.current === "active") {
          securePlacedRef.current = { ...securePlacedRef.current, garden: true };
          setSecurePlaced(p => ({ ...p, garden: true }));
        }
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
        s.player._autoSleeping = false;
        flashRef.current = 0.6;
        setSleepFlash(true);
        setTimeout(() => setSleepFlash(false), 700);
        // Notify partner so they wake up too
        if (room) sendFastSleepCancel?.();
      }
    }

    const dt = s.isFastSleeping ? dtActual * 15 : dtActual;
    const { dx, dy, action: autoAction } = getMovementAndAction(s, dtActual);
    const moving = dx !== 0 || dy !== 0;

    // ── Autopilot action dispatch (loot, attack, vehicle entry) ───────────
    if (autoPlayRef.current && autoAction) {
      if (autoAction === "collect") {
        const lootResult = tryCollectLoot(s.player, s.lootPiles, s.vehicle);
        if (lootResult) {
          s.buildingsSearched = (s.buildingsSearched ?? 0) + 1;
          syncInv(s.player.inventory);
          const hadFragment = lootResult.gained.some(i => i.type === "map_fragment");
          if (hadFragment) {
            const fragmentItem = lootResult.gained.find(i => i.type === "map_fragment");
            const result = collectMapFragment(s, fragmentItem);
            if (!s.mapFragmentCollected) s.mapFragmentCollected = true;
            if (result?.bossSpawned) {
              addFloater(s, "☠ A boss zombie has appeared!", s.player.x, s.player.y - 30, "rgba(255,80,80,0.95)", 16);
              notify("☠ Final fragment! A massive boss zombie has spawned — kill it to win!", "rgba(255,80,80,0.95)");
            } else if (result?.nextSettlement) {
              const ns = result.nextSettlement;
              notify(`🗺️ Map fragment! Next: ${ns.name}`, "rgba(255,220,80,0.95)");
            }
            if (room && sendMapFragment) sendMapFragment({
              mapFragmentCollected: s.mapFragmentCollected,
              fragmentsCollected: s.fragmentsCollected ?? [],
              compassTarget: s.compassTarget ?? null,
              totalFragments: s.totalFragments ?? 0,
            });
          }
          const surv = tryDiscoverSurvivor(s.player, s.buildings, s.survivors, s.lootPiles);
          if (surv) {
            surv.survivor.followLeader = s.player;
            s.survivors.push(surv.survivor);
            s.survivorsFound = (s.survivorsFound ?? 0) + 1;
            notify(`${surv.survivor.name} (${surv.survivor.role}) was hiding here!`, "rgba(120,255,180,0.95)");
            if (room) sendSurvivorFound(surv.survivor, roleRef.current);
          }
          if (room) {
            sendBuildingSearch(lootResult.pile.buildingId);
            sendLootPickup(lootResult.pile.buildingId, lootResult.gained, lootResult.fuelGained ?? 0);
          }
        }
      } else if (autoAction === "attack") {
        // Auto-aim: always face the nearest alive zombie so the AI doesn't
        // rely on the human player's mouse position when attacking on foot.
        const aliveZ = s.zombies.filter(z => !z.dead);
        if (aliveZ.length > 0) {
          const nearest = aliveZ.reduce((best, z) => {
            const d = Math.hypot(z.x - s.player.x, z.y - s.player.y);
            return d < best.dist ? { z, dist: d } : best;
          }, { z: null, dist: Infinity }).z;
          if (nearest) {
            s.player.facing = Math.atan2(nearest.y - s.player.y, nearest.x - s.player.x);
          }
        }
        autoAttackCooldownRef.current -= dtActual;
        if (autoAttackCooldownRef.current <= 0) {
          playerAttack(s.player, s.zombies, s.buildings);
          autoAttackCooldownRef.current = 0.55;
        }
      } else if (autoAction === "enter_vehicle" && !s.player.inVehicle) {
        // Search the full fleet for the nearest available vehicle so the AI
        // can enter a replacement car after the original is destroyed.
        const allV = s.vehicles ?? (s.vehicle ? [s.vehicle] : []);
        const nearestV = allV
          .filter(v => v.hp > 0 && (!v.occupied || v.driver === roleRef.current || v.passenger === roleRef.current))
          .sort((a, b) =>
            dist(s.player.x, s.player.y, a.x, a.y) -
            dist(s.player.x, s.player.y, b.x, b.y)
          )[0];
        if (nearestV) {
          tryEnterVehicle(s.player, nearestV, roleRef.current);
          // Keep s.vehicle in sync with whichever vehicle was entered
          if (s.player.inVehicle) s.vehicle = nearestV;
        }
      } else if (autoAction === "open_door") {
        // AI settlement-clearing: open the nearest closed door to flush building zombies
        const doorResult = tryToggleDoor(s.player, s.buildings);
        if (doorResult && room) {
          const d = doorResult.door;
          sendDoorUpdate(doorResult.building.id, d.id, d.open, d.hp ?? DOOR_MAX_HP, !!d.broken);
        }
      } else if (autoAction === "exit_vehicle_for_doors" || autoAction === "exit_vehicle_for_needs") {
        // AI needs to get out of vehicle (to open doors or use needs)
        if (s.player.inVehicle) {
          const myV = getMyVehicle(s, roleRef.current);
          exitVehicle(s.player, myV, roleRef.current, s.buildings);
          s.vehicle = myV;
          if (room) sendVehicleUpdate(myV.id, myV.x, myV.y, myV.facing, myV.hp, myV.fuel, myV.driver, myV.passenger);
        }
      } else if (autoAction === "auto_eat") {
        // AI eat — dedicated needs cooldown so combat doesn't block eating.
        // At homebase, pull food from baseStorage if player inventory is empty.
        autoNeedsCooldownRef.current -= dtActual;
        if (autoNeedsCooldownRef.current <= 0) {
          autoNeedsCooldownRef.current = 1.6;
          // At homebase: top up player inventory from base storage so AI can eat
          if (s._missionType === "homebase" && (s.player.inventory.food ?? 0) < 1) {
            const bs = s.baseStorage ?? {};
            if ((bs.food ?? 0) >= 1) {
              bs.food = (bs.food ?? 0) - 1;
              s.player.inventory.food = (s.player.inventory.food ?? 0) + 1;
              s.baseStorage = bs;
            }
          }
          if (eatFood(s.player)) {
            syncInv(s.player.inventory);
            addFloater(s, "🍞 ate food", s.player.x, s.player.y - 20, "rgba(120,255,150,0.85)", 11);
          } else {
            s.player._autoEating = false; // ran out of food mid-loop; let engine re-evaluate
          }
        }
      } else if (autoAction === "auto_drink") {
        // AI drink — dedicated needs cooldown so combat doesn't block drinking.
        // At homebase, pull water from baseStorage if player inventory is empty.
        autoNeedsCooldownRef.current -= dtActual;
        if (autoNeedsCooldownRef.current <= 0) {
          autoNeedsCooldownRef.current = 1.6;
          // At homebase: top up player inventory from base storage so AI can drink
          if (s._missionType === "homebase" && (s.player.inventory.water ?? 0) < 1) {
            const bs = s.baseStorage ?? {};
            if ((bs.water ?? 0) >= 1) {
              bs.water = (bs.water ?? 0) - 1;
              s.player.inventory.water = (s.player.inventory.water ?? 0) + 1;
              s.baseStorage = bs;
            }
          }
          const ok = drinkWater(s.player, s.buildings, s.wells);
          if (ok) {
            syncInv(s.player.inventory);
            addFloater(s, "💧 drank water", s.player.x, s.player.y - 20, "rgba(100,180,255,0.85)", 11);
          } else {
            s.player._autoDrinking = false; // ran out / no source; let engine re-evaluate
          }
        }
      } else if (autoAction === "auto_sleep") {
        // AI fast-sleep: set sleeping + fast-sleep so sleep recovers quickly
        if (!s.player.isSleeping) {
          s.player.isSleeping = true;
          s.player._autoSleeping = true;
          s.player.sleepLocation = getSleepLocation(s.player, s.vehicle, s.buildings);
          s.isFastSleeping = true;
          addFloater(s, "💤 sleeping...", s.player.x, s.player.y - 22, "rgba(180,180,255,0.85)", 11);
        }
        // Wake immediately if a zombie is actively targeting this player nearby.
        const SLEEP_WAKE_RADIUS = 300;
        const activeAttackStates = new Set(["chase", "attack", "bash_door"]);
        const zombieTargetingMe = s.zombies.some(z =>
          !z.dead &&
          activeAttackStates.has(z.state) &&
          dist(z.x, z.y, s.player.x, s.player.y) < SLEEP_WAKE_RADIUS
        );
        if (zombieTargetingMe) {
          s.player.isSleeping = false;
          s.player._autoSleeping = false;
          s.isFastSleeping = false;
          addFloater(s, "⚠️ danger!", s.player.x, s.player.y - 22, "rgba(255,80,80,0.9)", 13);
        }
        // Wake up once sleep has recovered enough
        if (s.player.sleep >= AUTO_SLEEP_UNTIL) {
          s.player.isSleeping = false;
          s.player._autoSleeping = false;
          s.isFastSleeping = false;
          addFloater(s, "⚡ rested!", s.player.x, s.player.y - 22, "rgba(255,220,80,0.9)", 12);
        }
      } else if (autoAction === "exit_vehicle_for_repair") {
        // AI needs to exit vehicle before repairing it
        if (s.player.inVehicle) {
          const myV = getMyVehicle(s, roleRef.current);
          exitVehicle(s.player, myV, roleRef.current, s.buildings);
          s.vehicle = myV;
          if (room) sendVehicleUpdate(myV.id, myV.x, myV.y, myV.facing, myV.hp, myV.fuel, myV.driver, myV.passenger);
        }
      } else if (autoAction === "auto_repair_vehicle") {
        // AI repair — 3-second cast, consumes 1 car_part, heals REPAIR_HP_GAIN
        autoNeedsCooldownRef.current -= dtActual;
        if (autoNeedsCooldownRef.current <= 0) {
          autoNeedsCooldownRef.current = 3.0;
          // Find best nearby damaged vehicle to repair
          const allV = s.vehicles ?? (s.vehicle ? [s.vehicle] : []);
          let repairTarget = null, bestScore = -Infinity;
          for (const v of allV) {
            if (v.hp <= 0) continue;
            const d = dist(s.player.x, s.player.y, v.x, v.y);
            if (d > REPAIR_RANGE) continue;
            const hpFrac = v.hp / (v.maxHp ?? v.hp ?? 1);
            if (hpFrac >= 1) continue;
            const s2 = (1 - hpFrac) * 300 - d;
            if (s2 > bestScore) { bestScore = s2; repairTarget = v; }
          }
          if (repairTarget) {
            const result = tryRepairVehicle(s.player, repairTarget);
            if (result && !result.fail) {
              addFloater(s, `🔧 +${REPAIR_HP_GAIN} HP`, s.player.x, s.player.y - 22, "rgba(120,255,150,0.85)", 11);
              syncInv(s.player.inventory);
              if (room && sendVehicleRepair) sendVehicleRepair(repairTarget.id, repairTarget.hp);
            }
          }
        }
      }
    }

    if (!s.player.isSleeping) {
  if (s.player.inVehicle) {
  const myVehicle = getMyVehicle(s, roleRef.current); // ← find actual vehicle
  s.vehicle = myVehicle; // keep reference current
  const isDriver = myVehicle.driver === roleRef.current;
  if (moving && isDriver) driveVehicle(myVehicle, dx, dy, dt, s.buildings);
  syncPlayerToVehicle(s.player, myVehicle);
  // ── Awakening: also trigger if player drives before walking ──────────
  if (moving && !s.zombiesAwakened) {
    s.zombiesAwakened = true;
    if (isHostRef.current) {
      activateAwakeningRing(s.zombies, myVehicle.x, myVehicle.y);
    }
    setAwakeningFlash(true);
    setTimeout(() => setAwakeningFlash(false), 600);
  }
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
    // Skip when autoplay is active — the AI sets its own facing via auto-aim.
    if (mouseAngleRef.current !== null && !s.player.inVehicle && !autoPlayRef.current) {
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
          // FIX 6: set both .id and ._id to the same value so any code that looks up
          // by either field (e.g. vehicleTargets Map keyed on .id) finds the ghost vehicle.
          const ghostV = {
            id: id, _id: id, x: upd.x, y: upd.y, facing: upd.facing,
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
    if (isHostRef.current && checkEndgame(s) && !gameOverFiredRef.current && !securePhaseRef.current) {
      addFloater(s, "☠ Boss defeated! Secure the area before you leave!", s.player.x, s.player.y - 40, "rgba(120,255,150,0.95)", 18);
      triggerSecurePhase(s);
      // Don't return — game loop keeps running so zombies/canvas stay live
    }

    // ── Step 8: defend mission win — all defend-wave zombies cleared ─────────
    if (
      isHostRef.current &&
      s._missionType === "defend" &&
      s._defendWaveSpawned &&
      !gameOverFiredRef.current &&
      !securePhaseRef.current
    ) {
      const aliveDefenders = s.zombies.filter(z => !z.dead);
      if (aliveDefenders.length === 0) {
        addFloater(s, "✅ Base defended! The horde was driven back.", s.player.x, s.player.y - 40, "rgba(120,255,150,0.95)", 18);
        triggerSecurePhase(s);
      }
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

      // ── Vehicle-HP eject — force-exit when current vehicle is destroyed ────
      // Only triggers on vehicle HP reaching 0; player HP is irrelevant here.
      if (s.player.inVehicle) {
        const drivingV = getMyVehicle(s, roleRef.current);
        if (drivingV && drivingV.hp <= 0) {
          exitVehicle(s.player, drivingV, roleRef.current, s.buildings);
          s.vehicle = drivingV; // keep reference current even though HP=0
          addFloater(s, '🚗 vehicle destroyed!', drivingV.x, drivingV.y - 24, 'rgba(255,80,60,0.95)', 13);
          if (autoPlayRef.current) notify('Vehicle destroyed — finding another!', 'rgba(255,160,40,0.95)');
          if (room) sendVehicleUpdate(drivingV.id, drivingV.x, drivingV.y, drivingV.facing, drivingV.hp, drivingV.fuel, drivingV.driver, drivingV.passenger);
        }
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
          s.turrets ?? [], s.gardenPlots, s.crops, s.buildings, dt,
          s.vehicles ?? [s.vehicle],   // FIX 1: pass full fleet so P2-following survivors find the right vehicle
          s.player2                    // FIX 1: pass player2 so survivors know which leader is P2
        );
        // Clean harvested crops flagged by survivor AI
        for (let i = s.crops.length - 1; i >= 0; i--) {
          if (s.crops[i].dead) {
            addFloater(s, "🌿 harvested!", s.crops[i].x, s.crops[i].y - 10, "rgba(120,220,80,0.9)");
            s.crops.splice(i, 1);
          }
        }
      }

      // ── Task 2.3: Survivor auto-build blueprints ────────────────────────────
      // Any survivor assigned workstation="builder" will wander to nearby blueprints
      // and build them automatically (simpler than full cast — just time-based).
      if (isHomeBase && s.blueprints?.length > 0 && s.survivors?.length > 0) {
        const BUILDER_RANGE = 80;
        const BUILDER_SPEED = 3.0; // seconds to build per blueprint
        for (const sv of s.survivors) {
          if (sv.hp <= 0) continue;
          if (sv.workstation !== "builder") continue;
          // Find nearest unassigned blueprint
          let nearestBp = null, nearestBpDist = Infinity;
          for (const bp of s.blueprints) {
            if (bp._builderSvId && bp._builderSvId !== sv.id) continue; // taken by another builder
            const d = dist(sv.x, sv.y, bp.x, bp.y);
            if (d < nearestBpDist) { nearestBpDist = d; nearestBp = bp; }
          }
          if (!nearestBp) continue;
          // Walk toward blueprint
          if (nearestBpDist > BUILDER_RANGE) {
            const angle = Math.atan2(nearestBp.y - sv.y, nearestBp.x - sv.x);
            sv.x += Math.cos(angle) * 130 * dt;
            sv.y += Math.sin(angle) * 130 * dt;
            nearestBp._builderSvId = sv.id;
          } else {
            // Build progress
            nearestBp._builderSvId = sv.id;
            nearestBp._buildProgress = (nearestBp._buildProgress ?? 0) + dt;
            if (nearestBp._buildProgress >= BUILDER_SPEED) {
              const bp = nearestBp;
              const idx = s.blueprints.indexOf(bp);
              if (idx !== -1) {
                if (bp.type === "turret") {
                  if (!s.turrets) s.turrets = [];
                  s.turrets.push({
                    id: `turret_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                    x: bp.x, y: bp.y,
                    hp: TURRET_HP, maxHp: TURRET_HP,
                    range: TURRET_RANGE, damage: 25, fireRate: 1.5,
                    shootCooldown: 0, attractRadius: 450, radius: 14,
                  });
                } else if (bp.type === "crop_plot") {
                  const plotW = 80, plotH = 70;
                  if (!s.gardenPlots) s.gardenPlots = [];
                  s.gardenPlots.push({
                    id: `plot_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                    x: bp.x - plotW / 2, y: bp.y - plotH / 2,
                    w: plotW, h: plotH, crop: null, growTimer: 0,
                  });
                }
                s.blueprints.splice(idx, 1);
                addFloater(s, `${sv.name} built ${bp.type === "turret" ? "🗼 turret" : "🌱 plot"}!`, sv.x, sv.y - 20, "rgba(120,255,150,0.95)");
              }
            }
          }
        }
      }
      if (!s.convoyVehicles) s.convoyVehicles = [];
      if (s.convoyVehicles.length > 0) {
        // FIX 9: don't run collision for already-dead convoy vehicles (hp=0)
        for (const entry of s.convoyVehicles) {
          if (!entry._ejected && entry.vehicle.occupied && entry.vehicle.hp > 0) {
            updateVehicleCollisions(entry.vehicle, s.zombies, dt, s.buildings);
          }
        }
        // FIX 2: use the vehicle P1 is actually driving, not the stale s.vehicle reference
        const convoyLeaderVehicle = getMyVehicle(s, roleRef.current);
        const ejected = updateConvoyVehicles(s.convoyVehicles, convoyLeaderVehicle, s.survivors, dt, s.buildings);
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

    // Cancel blueprint build cast if player walked away
    if (castActionRef.current?.type === "build_blueprint" && s.blueprints?.length > 0) {
      const castBpId = castActionRef.current._blueprintId;
      const bp = castBpId
        ? s.blueprints.find(b => b.id === castBpId)
        : s.blueprints.find(b => dist(s.player.x, s.player.y, b.x, b.y) < BLUEPRINT_INTERACT_RANGE * 1.5);
      if (!bp || dist(s.player.x, s.player.y, bp.x, bp.y) > BLUEPRINT_INTERACT_RANGE * 1.5) {
        cancelCast("Moved away from blueprint");
      }
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
          const myVehicle = getMyVehicle(s, roleRef.current);
sendVehicleUpdate(myVehicle.id, myVehicle.x, myVehicle.y, myVehicle.facing, myVehicle.hp, myVehicle.fuel, myVehicle.driver, myVehicle.passenger);
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
      const baseCtxActions = getProximityActions(
        s.player, s.buildings, s.vehicle, s.gardenPlots, s.crops, s.lootPiles, s.wells, s.turrets ?? []
      );
      // Append blueprint build action if near one (homebase only)
      if (isHomeBase && s.blueprints?.length > 0) {
        const nearBp = s.blueprints.find(bp =>
          dist(s.player.x, s.player.y, bp.x, bp.y) < BLUEPRINT_INTERACT_RANGE
        );
        if (nearBp) {
          const bpLabel = nearBp.type === "turret" ? "Build Turret (5s)" : "Build Garden Plot (5s)";
          baseCtxActions.unshift({ key: "F", label: `📐 ${bpLabel}` });
        }
      }
      setCtxActions(baseCtxActions);
      // Push snapshot to base screen (every 6 frames ≈ 100ms)
      if (onStateSnapshot) onStateSnapshot(s);
    }

    const ctx = canvas.getContext("2d");
    ctx.save(); ctx.scale(dpr, dpr);
    // Sync placement ghost state
    s._placingMode = placingModeRef.current;
    s._placingHint = placingHintRef.current;
    draw(ctx, s, t, W, H, powerZoomRef.current, { stateRef, joystickRef });
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

      {/* ── Manager HUD — visible when autoplay is active ── */}
{autoPlay && (
  <div style={{
    position: "absolute",
    top: 70,
    right: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    pointerEvents: "none",
    zIndex: 15,
  }}>
    {/* Behavior pill — click to cycle stance */}
    <button
      onClick={() => {
        if (!goHomeNow && !isHomeBase) {
          const order = ["loot", "fight", "flee"];
          setAiStance(s => order[(order.indexOf(s) + 1) % order.length]);
        }
      }}
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${
          goHomeNow ? "rgba(230,90,60,0.5)"
          : aiStance === "fight" ? "rgba(230,90,60,0.4)"
          : aiStance === "flee"  ? "rgba(90,180,245,0.4)"
          : "rgba(120,220,150,0.35)"
        }`,
        color: goHomeNow ? "rgba(230,130,100,0.95)"
          : aiStance === "fight" ? "rgba(230,110,90,0.9)"
          : aiStance === "flee"  ? "rgba(90,180,245,0.9)"
          : "rgba(120,220,150,0.9)",
        fontSize: 11,
        letterSpacing: "0.04em",
        pointerEvents: "all",
        cursor: goHomeNow || isHomeBase ? "default" : "pointer",
      }}
    >
      {goHomeNow ? "⬅ heading home…"
        : aiStance === "fight" ? "⚔ fighting"
        : aiStance === "flee"  ? "↗ fleeing"
        : "↺ looting"}
    </button>

    {/* Drop In button */}
    {onDropIn && (
      <button
        onClick={onDropIn}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          background: "rgba(255,200,80,0.12)",
          border: "1px solid rgba(255,200,80,0.4)",
          color: "rgba(255,200,80,0.95)",
          fontSize: 11,
          letterSpacing: "0.06em",
          cursor: "pointer",
          pointerEvents: "all",
        }}
      >
        ▶ Drop In
      </button>
    )}
  </div>
)}

{/* ── Autoplay Toggle — shown when NOT in autoplay mode ── */}
{!autoPlay && (
  <div style={{
    position: "absolute",
    top: 70,
    right: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    zIndex: 15,
  }}>
    <button
      onClick={() => {
        if (onAutoplay) {
          onAutoplay();
        } else {
          // Fallback: try to toggle via ref (won't work without parent update)
          console.warn("onAutoplay prop not provided");
        }
      }}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        background: "rgba(120,200,255,0.1)",
        border: "1px solid rgba(120,200,255,0.35)",
        color: "rgba(120,200,255,0.9)",
        fontSize: 11,
        letterSpacing: "0.06em",
        cursor: "pointer",
      }}
    >
      🤖 Autoplay
    </button>
  </div>
)}



      {/* ── Go Home Now button — mid-run escape ── */}
      {autoPlay && !isHomeBase && !goHomeNow && (
        <button
          onClick={() => {
            setGoHomeNow(true);
            if (stateRef.current) stateRef.current._goHomeNow = true;
          }}
          style={{
            position: "absolute",
            bottom: 68,
            right: 12,
            padding: "7px 14px",
            borderRadius: 8,
            background: "rgba(230,90,60,0.12)",
            border: "1px solid rgba(230,90,60,0.4)",
            color: "rgba(230,130,100,0.95)",
            fontSize: 11,
            letterSpacing: "0.05em",
            cursor: "pointer",
          }}
        >
          ⬅ Go Home Now
        </button>
      )}

      {/* ── Homebase idle prompt — no base storage ── */}
      {autoPlay && isHomeBase && (
        <div style={{
          position: "absolute",
          bottom: 68,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.72)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 18px",
          textAlign: "center",
          maxWidth: 240,
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>Manager mode</span><br />
            Go on a run to bring back supplies.
          </div>
        </div>
      )}
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
              ["F", "Interact (doors, loot, vehicle, crops, well)"],
              ["T", "Command nearby survivor"],
              ["E", "Repair vehicle (needs car parts)"],
              ["R", "Refuel vehicle (needs fuel cans, 2s cast)"],
              ["B", "Barricade building"],
              ["G", "Build menu (turret / crop plot / homebase)"],
              ["H", "Repair nearby turret (hold 2.5s)"],
              ["Z", "Sleep / wake"],
              ["I", "Inventory (eat/drink from here)"],
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
    // FIX 3 & 8: Reset follow slot so it's recalculated fresh for the new leader
    sv._followSlot = null;
    
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
    
    // FIX 3: Broadcast with issuedBy so partner knows which player issued this
    if (room && sendSurvivorCommand) {
      sendSurvivorCommand(sv.id, cmd, sv.assignedTo, roleRef.current);
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
      sendSurvivorCommand(sv.id, sv.command, sv.assignedTo, roleRef.current);
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
  homeBase={level === 0
    ? {
        upgrades:       stateRef.current?.homeBase?.upgrades       ?? [],
        baseStorage:    stateRef.current?.baseStorage              ?? stateRef.current?.homeBase?.baseStorage ?? {},
        builtStructures: stateRef.current?.homeBase?.builtStructures ?? [],
        blueprints:     stateRef.current?.homeBase?.blueprints     ?? [],
      }
    : stateRef.current?.homeBase
  }
  isHomeBase={level === 0}
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
    onQueueBlueprint={(blueprintType) => {
      const s = stateRef.current;
      if (!s) return;
      onHarvest?.({ type: "queue_blueprint", blueprintType });
      notify(`📐 ${blueprintType} blueprint queued — go build it!`, "rgba(255,200,60,0.95)");
    }}
    onUpgradeBase={(upgradeId) => {
  // Deduct from the in-game state's own baseStorage too
  const s = stateRef.current;
  if (s && onUpgradeBase) {
    const upgrade = BASE_UPGRADE_TREE[upgradeId];
    if (upgrade) {
      for (const [res, qty] of Object.entries(upgrade.cost)) {
        if (s.baseStorage) {
          s.baseStorage[res] = Math.max(0, (s.baseStorage[res] ?? 0) - qty);
        }
      }
      if (!s.homeBase) s.homeBase = {};
      if (!s.homeBase.upgrades) s.homeBase.upgrades = [];
      s.homeBase.upgrades.push(upgradeId);
    }
    onUpgradeBase(upgradeId);
  }
  setBuildMenu(false);
}}
  />
)}

// Add UpgradeMenu render:
{upgradeMenuOpen && (
  <UpgradeMenu
    homeBase={stateRef.current?.homeBase}
    totalResources={stateRef.current?.totalResources}
    onSelect={(upgradeId) => {
      const s = stateRef.current;
      if (s) {
        onHarvest?.({ type: "upgrade", upgradeId });
      }
      setUpgradeMenuOpen(false);
    }}
    onClose={() => setUpgradeMenuOpen(false)}
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

{/* Left-middle: context action hints (desktop — keyboard) */}
      {contextActions.length > 0 && !showInventory && !isTouch && (
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

      {/* Context actions — tappable buttons (mobile/touch).
          Thumb-reachable stack on the right, sitting above the attack button.
          "Space" (attack) is excluded here since the dedicated 🪓 button covers it. */}
      {contextActions.length > 0 && !showInventory && isTouch && (
        <div
          className="absolute flex flex-col items-end gap-2"
          style={{
            right: 18,
            bottom: (hud.weapon && !hud.inVehicle) ? 200 : 120,
            zIndex: 30,
            maxWidth: "70vw",
          }}
        >
          {contextActions
            .filter(a => a.key !== "Space")
            .slice(0, 5)
            .map((a, i) => (
              <button
                key={i}
                onPointerDown={(e) => {
                  e.preventDefault();
                  const s = stateRef.current;
                  if (!s) return;
                  handleKeyAction(a.key === "Space" ? " " : a.key, s);
                }}
                className="flex items-center rounded-full"
                style={{
                  padding: "11px 18px",
                  background: "rgba(8,12,10,0.9)",
                  border: "1px solid rgba(255,220,80,0.45)",
                  color: "rgba(255,255,255,0.94)",
                  fontSize: 14,
                  fontWeight: 500,
                  maxWidth: "100%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  touchAction: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
                  cursor: "pointer",
                }}
              >
                {a.label}
              </button>
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

      {/* ── Secure-base overlay ── shown after boss death before leaving ── */}
      {securePhase === "active" && !placingMode && (
        <div
          className="absolute inset-0 flex items-end justify-center z-40 pointer-events-none"
          style={{ paddingBottom: 28 }}
        >
          <div
            className="pointer-events-auto rounded-2xl overflow-hidden"
            style={{
              width: 360,
              background: "rgba(6,10,8,0.96)",
              border: "1px solid rgba(80,220,120,0.35)",
              boxShadow: "0 0 40px rgba(80,220,120,0.12)",
            }}
          >
            {/* Header */}
            <div className="px-5 py-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(80,220,120,0.07)" }}>
              <span className="text-xl">🏴</span>
              <div>
                <div className="text-sm font-medium tracking-wide" style={{ color: "rgba(120,255,150,0.95)" }}>
                  Area Cleared
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Secure it before you leave — or just go.
                </div>
              </div>
            </div>

            <div className="px-4 py-4 flex flex-col gap-3">
              {/* Checklist */}
              <div className="flex flex-col gap-2">
                {/* Turret row */}
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: securePlaced.turret ? "rgba(80,220,120,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${securePlaced.turret ? "rgba(80,220,120,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <span className="text-lg w-7 text-center">{securePlaced.turret ? "✅" : "🗼"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: securePlaced.turret ? "rgba(120,255,150,0.8)" : "rgba(255,255,255,0.6)" }}>
                      {securePlaced.turret ? "Turret placed" : "Place a turret"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Defends against zombie waves when you're away
                    </div>
                  </div>
                  {!securePlaced.turret && (
                    <button
                      onClick={() => {
                        placingModeRef.current = "turret";
                        setPlacingMode("turret");
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                      style={{
                        background: "rgba(180,255,120,0.1)",
                        border: "1px solid rgba(180,255,120,0.3)",
                        color: "rgba(180,255,120,0.9)",
                        cursor: "pointer",
                      }}
                    >
                      Place
                    </button>
                  )}
                </div>

                {/* Garden plot row */}
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: securePlaced.garden ? "rgba(80,220,120,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${securePlaced.garden ? "rgba(80,220,120,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <span className="text-lg w-7 text-center">{securePlaced.garden ? "✅" : "🌱"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: securePlaced.garden ? "rgba(120,255,150,0.8)" : "rgba(255,255,255,0.6)" }}>
                      {securePlaced.garden ? "Garden plot placed" : "Place a garden plot"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Generates food passively for your base
                    </div>
                  </div>
                  {!securePlaced.garden && (
                    <button
                      onClick={() => {
                        placingModeRef.current = "crop_plot";
                        setPlacingMode("crop_plot");
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                      style={{
                        background: "rgba(100,200,60,0.1)",
                        border: "1px solid rgba(100,200,60,0.3)",
                        color: "rgba(120,210,80,0.9)",
                        cursor: "pointer",
                      }}
                    >
                      Place
                    </button>
                  )}
                </div>
              </div>

              {/* Leave button */}
              <button
                onClick={handleSecureLeave}
                className="w-full py-3 rounded-xl text-sm font-medium mt-1"
                style={{
                  background: securePlaced.turret && securePlaced.garden
                    ? "rgba(80,220,120,0.15)"
                    : "rgba(255,200,80,0.08)",
                  border: `1px solid ${securePlaced.turret && securePlaced.garden
                    ? "rgba(80,220,120,0.4)"
                    : "rgba(255,200,80,0.25)"}`,
                  color: securePlaced.turret && securePlaced.garden
                    ? "rgba(120,255,150,0.95)"
                    : "rgba(255,200,80,0.8)",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                {securePlaced.turret && securePlaced.garden
                  ? "✓ Leave — Base Secured"
                  : "Leave Without Securing →"}
              </button>
            </div>
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



// InventoryPanel, BuildMenu, SurvivorCommandMenu → see their own .jsx files