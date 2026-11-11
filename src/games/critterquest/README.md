# Critter Quest

A Pokemon-style adventure for PneumEvolve. Frontend only: no backend, no database, no migration.
Progress saves in the player's browser (localStorage key `critterquest.save.v1`).

## Files

| File | What it is |
| --- | --- |
| `CritterQuest.jsx` | The page component. Renders the handheld console and starts the engine. |
| `engine.js` | Everything that runs: map, walking, battles, pods, team, evolution, saving. |
| `data.js` | Types, moves, critters and encounter tables. **Tweak the game here.** |
| `art.js` | Pixel art (sprites are text grids) and tiles. |
| `critterquest.css` | Styles, all scoped under `.cq` so nothing leaks into the rest of the site. |

## Hooking it up

1. Copy this folder to `src/games/critterquest/` (or wherever the other games live).
2. Add a route next to the other games:

```jsx
import CritterQuest from './games/critterquest/CritterQuest.jsx';
// ...
<Route path="/critter-quest" element={<CritterQuest />} />
```

3. Add it to the games list in `Home.jsx` the same way the other games are listed.

## Test tools

Shown automatically when running `npm run dev`, or on the live site by adding `?dev` to the URL
(`/critter-quest?dev`). They level up your lead critter, start a battle, add pods and 3 test foxes, warp to Pebble Town, or start a new game.

## What's in it (v0.5)

The world is a row of areas going right (east). Each town sits directly below its area.

| Area (left to right) | Critter levels | How to get in | Town below it |
| --- | --- | --- | --- |
| Maple Hill meadows | 2–9 | start here | none (your home is here) |
| Rocky Mountains | 11–18 | a critter past Lv 10 | Pebble Town: shiny trader, rest stop, Leader Brick |
| Whisper Forest | 20–30 | Boulder Badge | Mossy Hollow: healing hut, Leader Ivy |

- Starters and wild critters evolve; wild critters past their evolve level come already evolved
- Electric and Flying types; Zapcat line in every biome; third evolutions for Blazepony, Foxlet, Splashcano and Steel Dog lines
- XP is shared: 100% if a critter did damage and is still standing, 75% for the rest of the team, 25% if knocked out
- A BOX at home and in rest huts holds extra critters (they don't earn XP); snacks heal more with every badge
- Shinies (25% more attack): find them in the wild, or trade 3 plain critters of one kind for 1 shiny in Pebble Town
- Pods to catch critters, a team of 6
- Level caps: 25 to start, 35 with the Boulder Badge, 45 with the Grove Badge

## Adding the next area

1. Add an entry to `AREAS` in `data.js` (kind: `meadow`, `mountains` or `forest`, plus a gate and welcome text).
2. Add its encounter table to `ENCOUNTERS`, and if it has a town, a `TOWNS` and `GYMS` entry and a `LEVEL_CAP` for the new badge.
3. The map builder in `engine.js` lays it out to the right automatically, with the town below and a gate from the area before it.
   A brand-new kind of area (snow, desert...) needs a small layout block in `buildMap()` plus tiles in `art.js`.

## Quick tweaks (all in `data.js`)

- Encounter rates and levels: `ENCOUNTERS`
- Mountain gate level: `GATE_LEVEL`
- How easy each critter is to catch: `catchRate` on each critter
- Evolution levels: `evolve: { lv, to }`
- Type matchups: `CHART`
- Shiny odds and colors: `SHINY` (oneIn, hue); trade price `SHINY_TRADE_COST`; attack boost `SHINY_ATTACK_BONUS`
- Gym teams, XP bonus and badges: `GYMS`
- Areas, towns and gates: `AREAS`, `TOWNS`
- Level caps: `LEVEL_CAP`
- XP split: `XP_SHARE`; snack healing: `SNACK_HEAL`