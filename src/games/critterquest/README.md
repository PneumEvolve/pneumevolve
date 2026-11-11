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
(`/critter-quest?dev`). They level up your lead critter, start a battle, add pods and a test rabbit, warp to Pebble Town, or start a new game.

## What's in it (v0.4)

- Three starters with evolutions, types (Grass > Water > Fire > Grass, plus Fighting, Rock, Steel)
- Maple Hill meadows (critters below Lv 10), the Rocky Mountains (above Lv 10, gate opens past Lv 10)
- Pebble Town, south of Maple Hill: shiny trader (blue house), rest stop (green house), Pebble Gym
- Wild critters evolve too (all but Rockalock), and come pre-evolved in the wild past their evolve level
- Shinies: recolored critters. Trading a bunny doubles one family's shiny luck (fox is the easiest)
- Pods to catch critters, a team of 6, level cap 25 until you beat Leader Brick, then 35

## Quick tweaks (all in `data.js`)

- Encounter rates and levels: `ENCOUNTERS`
- Mountain gate level: `GATE_LEVEL`
- How easy each critter is to catch: `catchRate` on each critter
- Evolution levels: `evolve: { lv, to }`
- Type matchups: `CHART`
- Shiny odds and colors: `SHINY` (oneIn, hue)
- Gym team, XP bonus and badge: `GYM`
- Level caps: `LEVEL_CAP`