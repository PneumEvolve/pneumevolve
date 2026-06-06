Dead Miles: Vision & Roadmap Document
Table of Contents
The Vision

Current State Assessment

Core Gameplay Loops

Technical Architecture

Phase 0: Foundation Fixes

Phase 1: Core UX & Autoplayer

Phase 2: The Director's Hub

Phase 3: Concurrent Simulation (The Dream)

Phase 4: Expansion

Timeline Estimates

Risk Assessment

The Vision
Dead Miles is a top-down 2D survival zombie sim where you play as a Director, not just a survivor. You manage a growing home base, send teams on autonomous runs, and intervene directly when needed.

The game loops:

text
Home Base (Director Mode) ←→ World Map (Strategy) ←→ Runs (Action/Autoplay)
Core Pillars:

Autoplay First: Every character can be AI-controlled. The player drops in/out as they choose.

Base Persistence: Your home base lives between runs. Crops grow, survivors work, turrets defend.

Risk/Reward Extraction: What you bring back (vehicles, survivors, loot) is what you extract with.

Emergent Survivors: Traits determine run behavior (no manual assignment needed).

Co-op Ready: Two players can share the director role or run together.

Current State Assessment
What Works Well ✅
Area	Status	Notes
World Generation	Stable	Procedural settlements, buildings, loot
BaseView	Functional	Full management UI for crops, survivors, turrets
GameView Rendering	Solid	Canvas rendering, camera, animations
Co-op Networking	Stable	WebSocket sync, interpolation, host authority
Autoplayer Core	Functional	Needs, combat, loot, navigation, settlement clearing
Persistence (World)	Working	Saves levels, resources, roster, homeBase
Traits System	Present	Assigned on spawn, affects commands
Workstations	Working	Kitchen, workshop, farm, guard_post produce resources
What Needs Work ⚠️
Area	Issue	Priority
Autoplayer	Oscillation bugs (door, loot, exit loops)	Critical
Save/Load	No "Resume" button, mid-run saves missing	Critical
Run → Home Transition	Runs freeze on Tab, no background simulation	High
Vehicle Persistence	Vehicles lost at run end	High
Prepare Stage	No inventory/equipment management before runs	High
Crafting	Director places instantly, no survivor interaction	Medium
Survivor Run AI	Traits don't affect run behavior	Medium
UI Polish	Q/R keys, refuel UX, send on run feedback	Medium
Core Gameplay Loops
Loop 1: Director Mode (Home Base)
text
Enter Home Base
    ↓
View BaseView (crops, survivors, turrets, storage)
    ↓
Assign survivors to workstations (passive production)
    ↓
Craft items (uses base storage, casting time)
    ↓
Place blueprints (turrets, garden plots)
    ↓
Send team on run (World Map → Planning Screen)
Loop 2: Run Mode (Action/Autoplay)
text
Deploy team (player + selected survivors + vehicles)
    ↓
Run plays in real-time (or heartbeat when away)
    ↓
Player can drop in (disable Autoplay) or stay director
    ↓
Extraction: Get everyone + vehicles to exit
    ↓
Run ends → Merge to roster, garage, base storage
Loop 3: World Map (Strategy)
text
View secured/unexplored nodes
    ↓
Check threat tiers, supply routes, base status
    ↓
Deploy to new node (clear) or defend existing (under attack)
    ↓
Establish supply routes between secured nodes
    ↓
Return to home base or launch new run
Technical Architecture
Current State Structure
javascript
worldState = {
  levels: [],           // World map nodes
  totalResources: {},   // Global stockpile
  roster: [],           // Persistent survivors
  homeBase: {           // Durable home state
    baseStorage: {},
    crops: [],
    turrets: [],
    garage: [],
    upgrades: []
  },
  supplyRoutes: []
}
Target Architecture (Phase 3)
javascript
// HomeBase runs in main thread (UI always responsive)
// ActiveRun runs in heartbeat or separate thread

activeRun = {
  id: string,
  levelId: number,
  state: GameState,     // Full engine state
  lastTick: number,
  heartbeatMode: boolean,
  heartbeatInterval: number, // 5-10 seconds
  autoplayEnabled: boolean
}

// Director can:
// - Pause run (freeze simulation)
// - Resume run (continue heartbeat)
// - Drop in (disable autoplay, take control)
// - Issue commands from home (macro)
Heartbeat Simulation (Cheat for Phase 2)
When player Tabs to home during a run:

javascript
function heartbeatTick(run) {
  // Simplified simulation - not frame-by-frame
  const decisions = updateAutoPlayer(run.player, run.state, 5); // 5-second chunk
  applySimplifiedMovement(decisions);
  applySimplifiedCombat();
  if (distanceToTarget < threshold) run.heartbeatInterval = 2; // Faster when close
}
This keeps the run "alive" without heavy CPU cost.

Phase 0: Foundation Fixes
Goal: Stabilize existing systems, fix critical bugs, enable resume.

**STATUS: ✅ COMPLETE**

Task 0.1: Resume Button & Save/Load ✅
Add "Resume" button to lobby

Load worldState, set phase to "home"

Add "New Game" button (fresh world)

Save worldState on every mutation (auto-save)

Stretch: Save active run state (for Phase 3)

Task 0.2: Fix Autoplayer Oscillations ✅
Bug 1: exit_building ↔ approach_door

Add _exitCooldown timer (1.5 seconds) to survivor AI — blocks approach_door transitions during cooldown

Bug 2: Vehicle_approach ↔ loot_approach

Add _committedGoal to autoplayer state — commit to vehicle until reached or HP < 30% OR 5+ zombies

Bug 3: Exit_building_after_loot ↔ loot_settlement_approach

Add _lootedBuildingIds Set per player — marks building as looted on exit, filters from reachable loot

Task 0.3: Remove Q/R Eat/Drink ✅
Removed Q (eat) and R (drink) key handlers in GameView.jsx

Kept inventory panel eat/drink buttons

Removed Q/R from controls HUD legend

Autoplayer auto_eat/auto_drink unaffected

Task 0.4: Vehicle Refuel with 'R' ✅
Added refuelVehicle function in engine_geometry.js

R key handler in GameView: 2s cast, consumes 1 fuel can, adds +30 fuel to vehicle

Proximity action: "[R] Refuel vehicle (+30 ⛽) [N cans]" when near vehicle with fuel in inventory

Well drinking moved from R to F key (contextual)

Phase 1: Core UX & Autoplayer
Goal: Make runs feel good, fix vehicle persistence, add well drinking.

**STATUS: ✅ COMPLETE** (Tasks 1.1–1.6)

Task 1.1: Vehicle Prioritization (Autoplayer) ✅
Replace findNearestAvailableVehicle with scoring system:

javascript
function scoreVehicle(v, playerX, playerY) {
  let score = 0;
  // Type priority
  if (v.vehicleType === "monster_truck") score += 1000;
  else if (v.vehicleType === "minivan") score += 800;
  else if (v.vehicleType === "car") score += 600;
  else if (v.vehicleType === "bike") score += 400;
  // HP % (0-300)
  score += (v.hp / v.maxHp) * 200;
  // Fuel % (0-100)
  score += (v.fuel / v.maxFuel) * 100;
  // Distance (closer = better, max -300 penalty)
  const d = dist(playerX, playerY, v.x, v.y);
  score -= Math.min(300, d / 2);
  return score;
}
Task 1.2: Autoplayer Repair Vehicles ✅
Add decision step before FIGHT/LOOT (on foot, no threats)

Find best damaged vehicle (HP < 50%, using scoring above)

If has car_parts, path to vehicle

Start cast action (3 seconds) when in range

On complete: consume 1 part, heal +40 HP

Task 1.3: Autoplayer Drink from Well ✅
Extend auto_drink action

First check: nearby well (distance < 100, no zombies near well)

If well found: path to well, drink (instant, no cast)

Fallback: drink from inventory

Task 1.4: Smarter Base Patrol ✅
Modify base_patrol behavior in Autoplayer

Interleave needs checks (eat/drink/sleep still fire)

Add flee reaction: if zombie within 150px, flee then resume patrol

Patrol waypoints: use actual base buildings, not random points

Task 1.5: Vehicle Persistence (Core Loop) ✅
Add garage array to homeBase

On run end: collect ALL vehicles survivors are inside

Merge to garage (deduplicate by ID, preserve HP/fuel)

Destroyed vehicles (HP = 0) are removed

Add garage UI to BaseView (Storage tab or new tab)

Data structure:

javascript
garage: [
  { id: "v_car_1", vehicleType: "car", hp: 280, fuel: 45, upgrades: [] },
  { id: "v_monster_1", vehicleType: "monster_truck", hp: 600, fuel: 120, upgrades: ["plow"] }
]
Task 1.6: Send on Run UX Flow
Click "Send on Run" on World Map

Show loading/transition state (not instant)

Brief animation/message: "Preparing run..."

Then launch GameView

Phase 2: The Director's Hub
Goal: Full director experience from home base, including preparing runs and blueprint crafting.

**STATUS: ✅ COMPLETE** (Tasks 2.1–2.3)

Task 2.1: Prepare Stage with Inventory & Equipment ✅
Screen Layout:

text
┌─────────────────────────────────────────────────────────┐
│  DEPLOY PLANNING: Highway Mile 1                        │
├─────────────────────────────┬───────────────────────────┤
│  PARTY (3/5)                │  HOME STOCKPILE           │
│  ┌─────────────────────┐    │  ┌─────────────────────┐  │
│  │ 👤 Maya (scavenger) │    │  │ 🍞 Food: 45         │  │
│  │ HP: 80/80  🪓: ✓    │    │  │ 💧 Water: 32        │  │
│  │ 🚗 Car (280 HP)     │    │  │ ⚙️ Scrap: 18         │  │
│  │ [Remove] [Equip]    │    │  │ 💊 Medicine: 6       │  │
│  └─────────────────────┘    │  │ ⛽ Fuel: 12          │  │
│  ┌─────────────────────┐    │  │ 🔩 Car Parts: 3      │  │
│  │ 👤 Rico (medic)     │    │  └─────────────────────┘  │
│  │ HP: 65/80  🪓: ✗    │    │                           │
│  │ 🚗 None             │    │  PARTY STASH              │
│  │ [Remove] [Equip]    │    │  ┌─────────────────────┐  │
│  └─────────────────────┘    │  │ 🍞 Food: 12         │  │
│  [+ Add Survivor]            │  │ ⚙️ Scrap: 5         │  │
│                              │  └─────────────────────┘  │
│  GARAGE (available)          │  [Transfer →] [← Transfer]│
│  ┌─────────────────────┐    │                           │
│  │ 🚗 Monster Truck     │    │  ┌─────────────────────┐  │
│  │ HP: 520/600, Fuel:80│    │  │ 🚗 Selected Vehicle  │  │
│  │ [Assign to Maya]    │    │  │    Car (Maya)        │  │
│  └─────────────────────┘    │  │    HP: 280, Fuel:45  │  │
│                             │  └─────────────────────┘  │
├─────────────────────────────┴───────────────────────────┤
│  [Cancel]                              [DEPLOY →]       │
└─────────────────────────────────────────────────────────┘
Implementation:

New component: DeployPlanningScreen.jsx

Pass to WorldMap as modal when planningNode is set

Party roster: show survivors, HP, bat equipped status

Party stash: shared inventory for the run

Transfer items between home stockpile ↔ party stash

Garage selection: assign vehicles to each party member

Validation: can't deploy with empty party (player always included)

On confirm: build deployInventory (party stash) + deployParty (survivors) + deployVehicles (assigned)

Task 2.2: Heartbeat Simulation (First Pass) ✅
Goal: Run continues when player Tabs to home, using simplified ticks.

Implementation:

javascript
// In index.jsx, GameView mounting
const [activeRun, setActiveRun] = useState(null);

function startRun(levelId, deployData) {
  const runId = Date.now();
  const runState = createInitialState(seed, levelId);
  // Apply deployData (inventory, survivors, vehicles)
  
  setActiveRun({
    id: runId,
    levelId,
    state: runState,
    lastTick: Date.now(),
    heartbeatInterval: 5000, // 5 seconds
    autoplayEnabled: true,
    isPaused: false
  });
  
  setPhase("playing");
}

// When Tab to home
function pauseRunForDirector() {
  setActiveRun(prev => ({ ...prev, isPaused: true }));
  setScreen("base");
}

// Heartbeat loop (runs in background)
useEffect(() => {
  if (!activeRun || activeRun.isPaused) return;
  
  const interval = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(10, (now - activeRun.lastTick) / 1000);
    
    // Simplified tick
    const newState = heartbeatTick(activeRun.state, dt);
    
    setActiveRun(prev => ({
      ...prev,
      state: newState,
      lastTick: now
    }));
    
    // Check for run completion (exit reached)
    if (checkLevelExit(newState)) {
      endRun(newState, true);
    }
  }, activeRun.heartbeatInterval);
  
  return () => clearInterval(interval);
}, [activeRun]);
Heartbeat Tick Function:

javascript
function heartbeatTick(state, dtSec) {
  // Simplified: move toward compass target
  const { player, compassTarget } = state;
  const dx = compassTarget.x - player.x;
  const dy = compassTarget.y - player.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < 100) {
    // Close to target, faster ticks
    return state;
  }
  
  // Move in straight line (no collision)
  const speed = player.inVehicle ? 300 : 160;
  const move = Math.min(speed * dtSec, dist - 50);
  const angle = Math.atan2(dy, dx);
  
  player.x += Math.cos(angle) * move;
  player.y += Math.sin(angle) * move;
  
  // Simplified combat: one zombie hit per tick
  const nearestZombie = getNearestZombie(player, state.zombies);
  if (nearestZombie && distTo(nearestZombie) < 50) {
    player.hp -= 10;
    if (player.hp <= 0) endRun(state, false);
  }
  
  return state;
}
Task 2.3: Blueprint Crafting ✅
Goal: Director places blueprint, player/survivor builds it on level.

Blueprint Data:

javascript
blueprints: [
  {
    id: "bp_turret_1",
    type: "turret",
    x: 500, y: 600,
    placedBy: "director",
    buildProgress: 0,
    buildTime: 5.0  // seconds
  }
]
Implementation:

Add blueprints array to homeBase

Director places blueprint (cost deducted immediately)

Blueprint appears as ghost in BaseView

When player OR survivor is on homebase level and near blueprint, prompt "[F] Build"

Start cast timer (duration = buildTime)

On complete: remove blueprint, spawn turret/plot

Survivors can be assigned to "builder" workstation to auto-build nearby blueprints

Phase 3: Concurrent Simulation (The Dream)
Goal: Full real-time simulation of run while player is in homebase.

Option: Web Worker Architecture
javascript
// runWorker.js
import { updateAutoPlayer, updateZombies, ... } from "./deadMilesEngine";

let runState = null;
let lastTimestamp = 0;

self.onmessage = (e) => {
  if (e.data.type === "START") {
    runState = e.data.state;
    lastTimestamp = performance.now();
    requestAnimationFrame(tick);
  }
  
  if (e.data.type === "COMMAND") {
    // Handle director commands from home
    applyCommand(runState, e.data.command);
  }
  
  if (e.data.type === "DROP_IN") {
    self.postMessage({ type: "STATE_SNAPSHOT", state: runState });
  }
};

function tick(now) {
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;
  
  // Full engine update
  updateAutoPlayer(runState.player, runState, dt);
  updateZombies(runState.zombies, ...);
  updateSurvivors(...);
  
  self.postMessage({ type: "STATE_UPDATE", state: runState });
  requestAnimationFrame(tick);
}
Pros:

True real-time simulation

UI never lags

Director can watch run progress

Cons:

Complex serialization (functions don't transfer)

Double memory usage

Debugging across threads is hard

Phase 3 Tasks (Post-Launch)
Refactor engine to be serializable (remove closures, use plain objects)

Implement Web Worker wrapper

Add director commands (macro orders from home)

Live "CCTV" view of run in BaseView

Optimize state transfer (only send diffs)

Phase 4: Expansion
Task 4.1: Survivor Run Behavior (Emergent Traits)
Map existing traits to run behaviors:

Trait	Run Behavior
efficient	+20% loot speed, +20% workstation output on runs
resilient	+25% HP, takes reduced damage
green_thumb	Automatically harvests/plants crops near run path
scavenger	Prioritizes loot over combat, finds extra items
medic	Heals nearby survivors slowly (+2 HP/sec when out of combat)
cowardly	Flees from ANY zombie, never fights, hides in buildings
night_owl	+20% speed/damage at night, -10% during day
paranoid	Frequently stops to "check surroundings" (adds time)
loud	Attracts extra zombies (higher sound radius)
stoic	Never flees, fights to the death
Implementation:

Modify updateAutoPlayer to read survivor traits

Add behavior modifiers based on trait map

Medic aura: tick healing to nearby survivors

Scavenger: bonus loot chance on building search

Task 4.2: Armor & Accessories
Add equipment slots to survivors (head, chest, weapon)

Lootable armor (reduces damage)

Accessories (night vision, medkit pouch, etc.)

Equipment persists across runs (stored on roster record)

Task 4.3: Advanced Vehicle Upgrades
Garage UI for upgrading vehicles (spend scrap/parts)

Upgrade tree (armor, engine, weapons, storage)

Visual upgrades on vehicle sprites

Timeline Estimates
Phase	Tasks	Estimated Time	Priority
Phase 0	Resume button, oscillation fixes, remove Q/R, refuel	3-5 days	Critical
Phase 1	Vehicle priority, repair, well drinking, patrol, persistence, send UX	5-7 days	High
Phase 2.1	Prepare stage (inventory + equipment)	5-7 days	High
Phase 2.2	Heartbeat simulation	3-4 days	Medium
Phase 2.3	Blueprint crafting	2-3 days	Medium
Phase 3	Full concurrent simulation (Web Worker)	10-15 days	Low (stretch)
Phase 4	Trait behaviors, armor, vehicle upgrades	7-10 days	Low (post-launch)
Total to MVP (Phase 0 + 1 + 2.1): ~15-20 days

Risk Assessment
Risk	Likelihood	Mitigation
Heartbeat simulation feels "fake"	Medium	Keep heartbeat interval short (2-5s), add visual feedback ("Run continuing...")
Vehicle persistence causes balance issues	Medium	Add fuel/repair costs to maintain vehicles, limit garage size
Prepare stage becomes too complex	Low	Start with Medium scope, iterate based on feedback
Web Worker concurrency bugs	High	Defer to Phase 3, thoroughly test with simple runs first
Oscillation fixes don't solve all cases	Medium	Add debug logging to identify new patterns, iterate
Appendix: Key Data Structures
Deploy Data (Passed to GameView)
javascript
deployData = {
  inventory: { food: 10, water: 5, scrap: 8, car_parts: 2 }, // party stash
  survivors: [
    { id: "sv_1", name: "Maya", traits: ["scavenger"], hasBat: true },
    { id: "sv_2", name: "Rico", traits: ["medic"], hasBat: false }
  ],
  vehicles: [
    { survivorId: "sv_1", vehicleId: "garage_car_1" },
    { survivorId: "player", vehicleId: "garage_monster_1" }
  ]
}
Run End Merge
javascript
function endRun(runState, survived) {
  // Merge survivors (existing mergeSurvivorsToRoster)
  const survivorSummary = mergeSurvivorsToRoster(worldState, runState.survivors, { missionWon: survived });
  
  // Merge vehicles (only those with survivors inside)
  const extractedVehicles = [];
  for (const survivor of runState.survivors) {
    if (survivor.inVehicle && survivor._ridingVehicle) {
      extractedVehicles.push(survivor._ridingVehicle);
    }
  }
  // Also check player's vehicle
  if (runState.player.inVehicle && runState.vehicle) {
    extractedVehicles.push(runState.vehicle);
  }
  
  // Add to garage
  for (const v of extractedVehicles) {
    if (v.hp > 0) {
      worldState.homeBase.garage.push({
        id: v.id,
        vehicleType: v.vehicleType,
        hp: v.hp,
        fuel: v.fuel,
        upgrades: v.upgrades || []
      });
    }
  }
  
  // Merge loot (everything in player inventory + party stash)
  // (Already handled by resourcesCollected in score)
}
This document represents the agreed path forward. Start with Phase 0 tasks (Resume button, oscillation fixes) and work your way up. The heartbeat simulation approach lets you deliver the "director" dream without the complexity of full concurrency.

Good luck, and happy coding.