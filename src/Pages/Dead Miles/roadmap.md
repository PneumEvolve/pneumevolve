# Dead Miles — Base Layer Rebuild Roadmap
## Goal: Merge RootWork's idle/sim depth into Dead Miles's management layer (Direction A — Base Enables Runs)

---

## Master Loop

```
Run loot (raw materials)
  → Base processing (crafted goods)
    → Deploy loadout (run bonuses + better gear)
      → Better loot → repeat
```

Runs produce raw materials. The base converts them into run-enabling goods.
The base does not have its own economy — it amplifies the action layer.

---

## Design Decisions (Locked)

- **Survivor specializations**: permanent once set (unlocks at XP level 3)
- **Processing chains**: 3 tiers per zone — Tier 1 exists now (passive tick), Tiers 2–3 require workstation upgrades
- **Worker cycles**: visible progress bars per survivor, not magic ticking
- **Run integration**: crafted goods appear in deploy loadout; specialization bonuses apply in GameView

---

## Production Chains Reference

| Zone | Raw (Tier 1) | Processed (Tier 2) | Premium (Tier 3) |
|---|---|---|---|
| **Workshop** | Scrap | Nails · Car Parts | Ammo · Vehicle Mods |
| **Kitchen** | Food | Field Rations | Stim Shots · Antidotes |
| **Medical** | Herbs | Medicine | Med Kits · Adrenaline |
| **Garden** | Seeds | Crops | Preserved Food |

---

## Survivor Specializations Reference

| Specialization | Base Bonus | Run Bonus |
|---|---|---|
| **Mechanic** | Workshop +25% cycle speed | Vehicle repairs cost less scrap on runs |
| **Medic** | Medical +25% yield | Start runs with 1 free med kit |
| **Cook** | Kitchen +25% yield | Survivor needs drain 20% slower on runs |
| **Builder** | Blueprints build 50% faster | Barricades on runs have +30% HP |
| **Guard** | Guard post covers more area | +1 turret slot on runs |
| **Scavenger** | +15% loot from base salvage | Find rare loot more often on runs |

---

## Zone Navigation Structure

BaseView splits into 6 tab zones with a bottom nav bar.

```
[ Workshop ] [ Kitchen ] [ Medical ] [ Garden ] [ Garage ] [ Command ]
```

Each is a self-contained zone component (modeled after RootWork's FarmZone / MarketZone pattern).

---

## Bottom Nav Badge System

| Badge | Meaning |
|---|---|
| `!` red | Idle survivor at workstation with no recipe assigned |
| `▲` yellow | Crafting queue finished — goods waiting to collect |
| `⚠` orange | Resource at cap and being wasted |
| `💀` red | Survivor needs medical attention |
| `●` green | Zone fully staffed and producing |

---

## ResourceBar (Always Visible, Top of Screen)

Shows per-resource:
- Current amount + cap
- Cap warning highlight when within 10% of ceiling
- Run readiness indicator: green pill when a full deploy loadout is staged

Resources tracked: Food · Scrap · Nails · Car Parts · Medicine · Ammo · Herbs · Seeds

---

## Phase 1 — Zone Architecture + HUD ✅ COMPLETE
**Goal: Clean foundation. No engine logic changes. Pure UI restructure.**

### 1.1 — Audit BaseView.jsx ✅
- Catalogued all sections: build, survivors, turrets, crops, storage, garage, crafting, activity, map
- Mapped each to destination zone (see mapping below)
- Noted all callbacks: onHarvest (action bus), onDeploy, onAddRoute/RemoveRoute, etc.

**Tab → Zone mapping:**
- `build` + `crafting` → `BaseWorkshop.jsx`
- `crops` → `BaseGarden.jsx`
- `turrets` → `BaseMedical.jsx` (defence section)
- `garage` → `BaseGarage.jsx`
- `survivors` + `storage` + `activity` + `map` → `BaseCommand.jsx`
- Kitchen/Medical workstation content → `BaseKitchen.jsx` / `BaseMedical.jsx` (Phase 2 fills these out)

### 1.2 — CSS Custom Properties ✅
- CSS vars defined on root BaseView div: `--bg`, `--bg-elev`, `--border`, `--accent`, `--text`, `--muted`, `--green`, `--red`, `--blue`

### 1.3 — Zone Components ✅
All created as pure UI components receiving game state + callbacks as props:
- [x] `BaseWorkshop.jsx` — structures, blueprint queue, crafting
- [x] `BaseKitchen.jsx` — placeholder + kitchen worker status
- [x] `BaseMedical.jsx` — turrets + survivor healing + medical bay placeholder
- [x] `BaseGarden.jsx` — crop plots (ready / growing sections)
- [x] `BaseGarage.jsx` — vehicle fleet cards
- [x] `BaseCommand.jsx` — survivors + storage transfer + activity feed + deploy map (sub-tabs)

### 1.4 — BaseNav ✅
- `BaseNav.jsx` created — fixed bottom bar, 6 tabs, badge system
- Badge logic: `💀` survivor HP < 30% → Medical; `▲` ready crops → Garden; `⚠` low fuel → Garage; `!` idle survivors → Command

### 1.5 — ResourceBar ✅
- `ResourceBar.jsx` created — always visible fixed top bar
- Shows: Food · Scrap · Nails · Car Parts · Medicine · Ammo · Fuel · Seeds
- Cap warning highlight at ≥90% cap; run readiness pill prop (wired in Phase 4)

### 1.6 — BaseView.jsx Refactor ✅
- Replaced monolithic tab content with `<ResourceBar>` + `<ActiveZone>` + `<BaseNav>`
- `activeZone` state controls which zone component renders
- All existing callbacks preserved (onHarvest, onDeploy, onAddRoute, etc.)
- Modals (ReassignModal, WorkstationPicker, CrisisPanel, AwayModal) remain in BaseView
- Legacy `defaultTab` values map to new zone IDs via `resolveDefaultZone()`
- Heartbeat stateRef forwarding unchanged (BaseView is still a pure consumer of stateSnapshot)

### 1.7 — Section Component ✅
- `Section.jsx` created — shared collapsible section wrapper
- Used throughout all zone components

### Files Created (Phase 1)
```
Section.jsx          ✅
ResourceBar.jsx      ✅
BaseNav.jsx          ✅
BaseWorkshop.jsx     ✅
BaseKitchen.jsx      ✅
BaseMedical.jsx      ✅
BaseGarden.jsx       ✅
BaseGarage.jsx       ✅
BaseCommand.jsx      ✅
```

### Files Modified (Phase 1)
```
BaseView.jsx         ✅ refactored to zone components + nav
```

---

## Phase 2 — Worker Cycles + Workstation Gear + Specializations ✅ COMPLETE
**Goal: Survivors feel like workers, not assignments.**

### 2.1 — Visible Worker Cycles (Engine) ✅
- [x] Added `_cycleProgress` (0–1), `_cycleTimer`, and `progress` to crafting queue entries in engine_homebase.js
- [x] `tickCraftingQueues()` advances `progress` each tick using `getEffectiveCycleSecs()`
- [x] On cycle complete: produce output (yield-mult scaled), reset `progress` to 0 (auto-repeating)
- [x] Cycle duration constants per workstation exported from engine_constants.js as `WORKSTATION_CYCLE_SECS`

### 2.2 — Worker Cycle UI
- [ ] Each survivor card in zone components shows a progress bar (`_cycleProgress`)
- [ ] Progress bar color reflects specialization (if set) or neutral gray
- [ ] Tooltip on hover: "Produces X in ~Ns"

### 2.3 — Workstation Gear Upgrades (Engine) ✅
- [x] Added `workstationGear` to homeBase state: `{ workshop: 1, kitchen: 1, medical: 1, garden: 1 }`
- [x] Defined `WORKSTATION_GEAR_TIERS` in engine_constants.js (3 tiers each):
  - Workshop: Hand Tools → Power Tools → Fabrication Bench
  - Kitchen: Camp Stove → Gas Range → Industrial Kitchen
  - Medical: First Aid Kit → Medical Cabinet → Field Hospital
  - Garden: Hand Trowel → Rototiller → Hydroponic Bay
- [x] Each tier: cost (scrap + materials), `cycleSpeedMult`, `yieldMult`
- [x] `upgradeWorkstationGear(homeBase, zone)` pure function in engine_homebase.js
- [x] `"upgrade_gear"` action wired into `applyHomeBaseAction`

### 2.4 — Workstation Gear UI
- [ ] Each zone shows current gear tier + upgrade button in `<UpgradePanel>`
- [ ] Locked tiers show cost and material requirements
- [ ] Gear icon + name displayed next to zone header

### 2.5 — Specializations (Engine) ✅
- [x] Added `specialization: null` to roster records in survivorRoster.js schema
- [x] `setSpecialization(roster, survivorId, specId)` pure function in engine_homebase.js
  - Only callable if survivor level >= 3 AND specialization is currently null
  - Returns updated roster (permanent, no reversal)
- [x] Specialization effect multipliers resolved in `getEffectiveCycleSecs()` and `getEffectiveYieldMult()`
- [x] `SPECIALIZATIONS` constants in engine_constants.js (matching design table)
- [x] `"set_specialization"` action wired into `applyHomeBaseAction`
- [x] Specialization preserved across missions via `extractRosterFields`

### 2.6 — Specialization UI
- [ ] Survivor cards show current specialization badge (emoji + name) if set
- [ ] If level >= 3 and no specialization: show "Choose Specialization" button
- [ ] Specialization picker modal: 6 options, shows base bonus + run bonus, confirm = permanent
- [ ] Warning copy: "This cannot be changed. Choose carefully."

### Files Modified (Phase 2)
```
engine_constants.js  ✅ added WORKSTATION_CYCLE_SECS, WORKSTATION_GEAR_TIERS, SPECIALIZATIONS, SPECIALIZATION_MIN_LEVEL, BASE_RECIPES
engine_homebase.js   ✅ added cycle tick, gear upgrade, recipe queue, setSpecialization; Phase 2 state in makeDefaultHomeBase + homeBaseToSnapshot
survivorRoster.js    ✅ added specialization field to all record shapes
saveSystem.js        ✅ version → 3, migrateHomeBase(), roster migration, specialization field
```

---

## Phase 3 — Processing Chains
**Goal: Raw loot becomes a production input, not just a counter.**

### 3.1 — Recipe System (Engine) ✅ (partial — recipes defined, queue wired)
- [x] `BASE_RECIPES` defined in engine_constants.js (all Tier 2 and Tier 3 recipes)
  - Workshop: Scrap→Nails, Scrap→Car Parts, Nails+Scrap→Ammo, Car Parts+Scrap→Vehicle Mod
  - Kitchen: Food→Field Rations, Field Rations+Herbs→Stim Shot, Food+Herbs→Antidote
  - Medical: Herbs→Medicine, Medicine+Scrap→Med Kit, Medicine→Adrenaline
  - Garden: Seeds→Crops, Food→Preserved Food (Field Rations)
- [x] Each recipe: `{ id, zone, inputs, output, seconds, requiresGearTier }`
- [x] `craftingQueue` per zone on homeBase state (single active slot, auto-repeating)
- [x] `assignRecipe(homeBase, roster, zone, recipeId, workerId)` pure function in engine_homebase.js
- [x] `cancelRecipe(homeBase, zone)` pure function (partial refund if >20% progress)
- [x] Tick advances queue `progress`; on completion deducts inputs (on-assign), adds output
- [ ] Queue shows next recipe if auto-queued (Phase 4 stretch)

### 3.2 — Recipe UI (per zone)
- [ ] `<RecipePanel>` in each zone shows available recipes for that zone
- [ ] Locked recipes show gear tier requirement
- [ ] Active recipe shows progress bar + cancel button
- [ ] Queue shows next recipe if auto-queued (Phase 4 stretch)

### 3.3 — Resource Cap Tuning
- [ ] Review all resource caps now that processing chains create new sinks
- [ ] Ammo, Med Kits, Field Rations, Stim Shots need caps sized for run loadouts
- [ ] Add new resources to ResourceBar

---

## Phase 4 — Run Integration
**Goal: Close the loop. Base output directly changes what you can do on runs.**

### 4.1 — Deploy Loadout Builder
- [ ] Update deploy planning screen (index.jsx) to show crafted goods as loadout slots:
  - Field Rations → carried food equivalent
  - Med Kits → starting medicine (better than base medicine item)
  - Stim Shots → speed/damage boost consumable on run
  - Ammo → starting ammo count
  - Vehicle Mods → pre-equipped to selected vehicle
- [ ] Each loadout item shows current stock and lets player choose how many to bring
- [ ] `applyDeployCarry` updated to deduct chosen crafted goods from homeBase stock

### 4.2 — Specialization Run Bonuses (Engine)
- [ ] Read survivor specializations from deployed party in createInitialState
- [ ] Apply bonuses to GameView initial state:
  - Medic in party → `startingMedicine += 1`
  - Cook in party → `needsDrainMultiplier = 0.8`
  - Mechanic in party → `vehicleRepairCostMultiplier = 0.75`
  - Builder in party → `barricadeHPMultiplier = 1.3`
  - Guard in party → `turretSlots += 1`
  - Scavenger in party → `rareDropChanceBonus = 0.15`
- [ ] Surface active bonuses in GameView HUD (small badge row at top of screen)

### 4.3 — Loot → Base Input Routing
- [ ] On run completion (mergeRunIntoHomeBase), raw loot is added to homeBase resource pool
- [ ] Herbs, Car Parts, Scrap tagged as "workstation inputs" — zone components highlight when they arrive
- [ ] Post-run summary screen shows: "Brought back X scrap → workshop can now craft Y ammo"

### 4.4 — Run Readiness Indicator
- [ ] `getRunReadiness(homeBase)` pure function — returns readiness score 0–100
- [ ] Factors: food stocked, ammo stocked, med kits stocked, vehicles fueled, survivors healthy
- [ ] Wire `runReady` prop into `<ResourceBar>` (pill already rendered, just needs a value)
- [ ] WorldMap deploy button disabled (with tooltip) if readiness < 25

---

## Key Architecture Rules (Carry Forward)

- `engine_homebase.js` remains pure functions — no React dependencies
- All new engine functions follow `tryPlace*` / `update*` / `apply*` naming conventions
- New state fields added to `makeDefaultHomeBase()` with safe defaults
- Save system (saveSystem.js v2) must be updated for any new state fields
- CSS vars defined on BaseView root div — zone components inherit them
- Zone components receive all state as props — no internal engine calls
- Validate all engine changes with Babel parse before delivery
- Read relevant files fully before writing any code

---

## Files Created So Far

```
Section.jsx          ← shared collapsible section wrapper
ResourceBar.jsx      ← base layer top bar (always visible)
BaseNav.jsx          ← bottom nav, 6 tabs, badge system
BaseWorkshop.jsx     ← structures + blueprint queue + crafting
BaseKitchen.jsx      ← kitchen zone (placeholder for Phase 2)
BaseMedical.jsx      ← turrets + survivor healing + medical bay placeholder
BaseGarden.jsx       ← crop plots
BaseGarage.jsx       ← vehicle fleet
BaseCommand.jsx      ← survivors + storage + activity + deploy map
```

## Files Modified So Far

```
BaseView.jsx         ← refactored to use zone components + ResourceBar + BaseNav
engine_constants.js  ← Phase 2: WORKSTATION_CYCLE_SECS, WORKSTATION_GEAR_TIERS,
                         SPECIALIZATIONS, SPECIALIZATION_MIN_LEVEL, BASE_RECIPES
engine_homebase.js   ← Phase 2: cycle tick, gear upgrade, recipe queue, setSpecialization;
                         makeDefaultHomeBase() + homeBaseToSnapshot() extended
survivorRoster.js    ← Phase 2: specialization field on all record shapes
saveSystem.js        ← Phase 2: version → 3, migrateHomeBase(), roster migration
```

## Files Pending (Phase 2 UI + Phase 3+)

```
BaseWorkshop.jsx     ← Phase 2.4: gear upgrade panel + recipe panel + cycle progress bars
BaseKitchen.jsx      ← Phase 2.4 + 2.6: gear panel + recipe panel + specialization picker
BaseMedical.jsx      ← Phase 2.4 + 2.6: gear panel + recipe panel + specialization picker
BaseGarden.jsx       ← Phase 2.4 + 2.6: gear panel + recipe panel + specialization picker
BaseCommand.jsx      ← Phase 2.6: specialization badge on survivor cards
index.jsx            ← Phase 4: update deploy screen loadout builder
GameView.jsx         ← Phase 4: apply specialization run bonuses to initial state
```