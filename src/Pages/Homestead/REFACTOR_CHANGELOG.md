# Homestead — Refactor Changelog (May 2026)

Snapshot of what changed when the player UI was de-duplicated.

## TL;DR

```
6 main files:   9,794  →  7,309 lines   (-2,485, -25.4%)
new shared:           +2,057 lines        (12 files, single source of truth)
net deletion:         -428 lines
```

The bigger win isn't the line count — it's that the **player UI now lives in
one place**. Editing the hotbar, tab menu, drawPlayer, sounds, or save logic
is a single-file change instead of four.

## Per-file before / after

| File | Was | Now | Δ |
|------|-----|-----|---|
| `index.jsx`         | 1066 | 271 | −795 |
| `HomesteadView.jsx` | 3472 | 3398 | −74 |
| `ForestRun.jsx`     | 2015 | 1385 | −630 |
| `MiningRun.jsx`     | 1335 | 842 | −493 |
| `FruitRun.jsx`      | 1129 | 661 | −468 |
| `FishingRun.jsx`    | 777 | 752 | −25 |

## New file layout (flat — files prefixed by section)

```
src/Pages/Homestead/
├── player_Hotbar.jsx                 ← replaces 4 inline copies
├── player_RunTabMenu.jsx             ← replaces 3 inline copies (~700 lines each)
├── player_StatPill.jsx               ← replaces 4 inline copies
├── player_tabs.js                    tab definitions
├── audio_sounds.js                   one makeSounds(palette) — replaces 4 copies
├── audio_useGameAudio.js             moved out of index.jsx
├── drawing_drawPlayer.js             unified — options-bag signature + legacy shims
├── state_playerCache.js              localStorage helpers
├── state_usePlayerState.js           owns inventory/hotbar/equipment/character + cloud-save
├── lobby_HomesteadLobby.jsx          lobby + SaveSlotCard + styles
├── runs_useRunLoop.js                shared raf/canvas/keys/pause hook (scaffold — see "Next steps")
├── runs_PauseOverlay.jsx             shared pause overlay (4 themes)
├── HomesteadView.jsx                 still big, but minus the duplicates
├── ForestRun.jsx                     scene logic + hooks/imports
├── MiningRun.jsx
├── FruitRun.jsx
├── FishingRun.jsx                    sounds extracted; rest unchanged
├── RunLobby.jsx                      unchanged
├── LootSummary.jsx                   unchanged
├── ItemIcon.jsx                      unchanged
├── Items.js                          unchanged
├── gameEngine.js                     unchanged
├── drawWorld.js                      unchanged (legacy drawPlayer still there but unused)
├── useHearthroom.js                  unchanged
├── useHomesteadState.js              unchanged
├── useTownState.js                   unchanged
└── drawArt.js                        unchanged
```

## What each step did

1. **StatPill** — extracted to `player/StatPill.jsx`. Replaced in 4 files.
2. **RUN_TABS / TABS** — extracted to `player/tabs.js`. Replaced in 4 files.
3. **makeSounds** — extracted to `audio/sounds.js`, takes a palette name.
   The 4 inline copies are gone; each run passes its own palette key.
4. **drawPlayer** — unified to `drawing/drawPlayer.js` with one options-bag
   signature. Two legacy positional shims (`drawPlayerLegacyRun` /
   `drawPlayerLegacyHome`) exported so existing call sites keep working
   untouched. Old `drawPlayer` in `drawWorld.js` is no longer imported
   anywhere — safe to delete once you're confident.
5. **Hotbar** — single `player/Hotbar.jsx`, with a `theme` prop. The
   homestead, forest, mining, and fruit themes match the prior tints; the
   durability bar (previously missing in MiningRun / FruitRun) now renders
   everywhere.
6. **Lobby** — `HomesteadLobby` + `SaveSlotCard` + lobby styles + `timeSince`
   moved to `lobby/HomesteadLobby.jsx`. Cache helpers split into
   `state/playerCache.js`. `useGameAudio` moved to `audio/useGameAudio.js`.
   `index.jsx` went from 1066 → 271 lines.
7. **usePlayerState** — hook in `state/usePlayerState.js` owns all
   per-player state, the cloud-save debounce, and the equip helpers. Six
   nearly-identical `saveX` callbacks now share one `persist()` helper.
   Public surface preserved so `index.jsx` call sites are unchanged.
8. **RunTabMenu** — single `player/RunTabMenu.jsx` based on the most
   complete (Forest) version. Replaces ~700-line inline copies in three
   run files. MiningRun and FruitRun's small variants are now unified —
   the only behavioural delta is that FruitRun now shows the (empty)
   Upgrades section in the bag tab, which is a no-op for current data.
9. **useRunLoop + PauseOverlay** — `runs/useRunLoop.js` and
   `runs/PauseOverlay.jsx` are **scaffolded but not yet adopted by the
   run files**. The migration recipe is documented in the top of
   `useRunLoop.js`. See "Next steps" below.

## Behavioural changes I intentionally made

Most extractions are byte-for-byte, but a few small intentional fixes:

- **Hotbar durability bar** now renders in MiningRun + FruitRun (it was
  missing — almost certainly an oversight; ForestRun + HomesteadView
  already had it).
- **Hotbar slot-click** is now consistently `select-then-use` everywhere
  (matches the runs' previous behaviour; HomesteadView used to skip the
  select). Re-tapping a selected slot now uses it, which is what the
  hint label already promised.
- **Hotbar hint label** is now `⚔ equip` for equippables across all
  scenes (HomesteadView already did this; runs said `⚡ use`).
- **FruitRun's hotbar icon size** is now 22 instead of 26, matching the
  other scenes. This was almost certainly accidental drift.

If any of these were intentional, revert the matching code in
`player/Hotbar.jsx` — they're all guarded by a single component.

## Next steps (deliberately not done in this pass)

### Migrating runs onto `useRunLoop`

Each run file still has its own giant `useEffect(() => { …raf… })` block.
The hook is ready; migration is a per-run job:

1. Replace the run's setup `useEffect` with a `useRunLoop({...})` call,
   passing the scene's `initState`, `tick`, optional `onKey`, `onClick`.
2. Replace the inline pause overlay JSX with `<PauseOverlay open={…} … />`.
3. Delete the local `canvasRef`, `rafRef`, `keysRef`, `stateRef`,
   `soundRef`, `lastMoveRef`, `pauseOpenRef` — `useRunLoop` owns them.
4. Inside `tick`, use the `helpers` argument:
   - `helpers.keys`           → live key state
   - `helpers.broadcastMove(x, y, facing)` → throttled position broadcast
   - `helpers.finishRun()`    → ends the run + calls onRunComplete
   - `helpers.sound.<name>()` → run-specific sound effects

ForestRun is the most representative — start there, then mining + fruit
(they're nearly identical). Fishing is structurally different (it has a
state machine on top); migrate last.

### Unifying `TabMenu` and `RunTabMenu`

`HomesteadView.TabMenu` and `player/RunTabMenu.jsx` are still parallel
files — the homestead version has Farming + Character tabs and a writable
chest, while the run version is read-only-chest + hand-craft-only. They're
~80% the same code. A capability-flagged unification is the natural next
move and would delete another ~700 lines:

```jsx
<TabMenu
  tabs={["inventory","chest","crafting","equipment","farming","character"]}
  capabilities={{
    chest:    "full",                          // or "readonly"
    crafting: { hand: true, stations: [...] }, // or { hand: true, stations: [] }
    inventory:{ deposit: true,  drop: false }, // or { deposit: false, drop: true }
  }}
  {...allTheStateProps}
/>
```

### Drift in `drawWorld.js`

The original `drawPlayer` is still exported from `drawWorld.js` but
nothing imports it any more. Delete it once you've smoke-tested the new
shared `drawing/drawPlayer.js`.

### Compatibility shims

`drawing/drawPlayer.js` exports two legacy positional shims
(`drawPlayerLegacyRun`, `drawPlayerLegacyHome`) that the call sites
currently use. Once you migrate the call sites to the options-bag form
(`drawPlayer(ctx, x, y, { facing, step, character, … })`), drop both
shims.


## Update — `useRunLoop` migration deferred

After expanding the hook's API (`extraPauseRef`, override-able `handlers`, caller-owned `finishRun`), I read ForestRun's setup `useEffect` end-to-end and decided **not** to apply the migration in this refactor pass.

Reasons:

- ForestRun's `doAttack` closes over ~12 component-level refs and callbacks. Moving it out of the setup `useEffect` and into a `useCallback` is doable but invites stale-closure bugs that won't show up in static review.
- The 350-line `tick` function needs to be refactored to take `(state, ctx, dt, t, W, H, helpers)` and use `helpers.paused` / `helpers.sound` / `helpers.broadcastMove` in place of the current closure refs. Mechanical but error-prone.
- The expected payoff (~150 lines deleted across four runs) is real but small next to what was already saved (2,500+).
- I can inspect diffs but I can't actually play the game to confirm the run-loop still behaves identically. Migration bugs in the most-played code path aren't worth that risk via a tool-only refactor.

**The hook in `runs_useRunLoop.js` is now correctly shaped for adoption.** The migration recipe in its header is accurate. When you're ready, do it interactively — one run at a time, ForestRun first — so you can click around between each step.

In the meantime, the duplication that *was* in the player UI (Hotbar, TabMenu, drawPlayer, sounds, lobby, etc.) is already collapsed into shared modules. The run-loop hook is a nice-to-have, not a requirement to solve the original problem.
