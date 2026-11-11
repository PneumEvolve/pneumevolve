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
(`/critter-quest?dev`). They level up your lead critter, start a battle, add pods, or start a new game.

## Quick tweaks (all in `data.js`)

- Encounter rates and levels: `ENCOUNTERS`
- Mountain gate level: `GATE_LEVEL`
- How easy each critter is to catch: `catchRate` on each critter
- Evolution levels: `evolve: { lv, to }`
- Type matchups: `CHART`
