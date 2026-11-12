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

## What's in it (v1.0)

The world is a row of areas going right (east). Each town sits directly below its area.

| Area (left to right) | Critter levels | How to get in | Town below it (healing hut + shiny trader + gym) |
| --- | --- | --- | --- |
| Maple Hill meadows | 2–9 | start here | Sprout Village: Leader Hazel (starter gym) |
| Rocky Mountains | 11–18 | a critter past Lv 10 | Pebble Town: Leader Brick |
| Whisper Forest | 20–30 | Boulder Badge | Mossy Hollow: Leader Ivy |
| The Volcano | 40–49 | Grove Badge | Ember Town: Leader Pyra (Fire Gym) |
| Prehistoric Valley | 52–62 | Ember Badge | Fossil Camp: Leader Diggs (Dino Gym) |

Every biome has a legendary that keeps coming back until you catch it (levels and spots in `LEGENDS`):
PSYRAVEN on the tallest tree in Maple Hill's bottom-left corner (Lv 15 critter needed), STONE BULL statue in Pebble Town (Lv 25),
SABER STAG's ancient shrine in Whisper Forest's southeast ferns (Lv 35), PYROLION in the big volcano (Lv 50),
IRONREX (a steel-bone T-rex) by the giant T-rex bones in the middle of the Prehistoric Valley (Lv 60).

YOUR RIVAL MAX: right after you win each gym badge, MAX shows up and battles you. He always picks the starter that beats yours,
and his team gets stronger after every gym. Beat him for 3 pods. Lose, and he waits outside that gym (with a "!") for a rematch (setting: `RIVAL`).

TRAINERS: two in every area, each with their own look. A "!" floats over the ones you haven't beaten. Walk up and press A to battle.
The first win gets you pods or snacks; after that they just chat (setting: `TRAINERS`).

Each town has a BUS STOP by the trail in. Once you've visited two towns, the bus takes you to any town you've been to.
RARE CANDY and 3 MEGA PODS: for the first win at each gym and against each legendary (settings: `CANDY`, `MEGA_POD`). Use candy from B → BAG.
MEGA PODS catch 2.5x better than pods. Throw them from BAG in battle.

Every move shows its type, power and accuracy in the FIGHT menu. Accuracy is 100%, 90%, 80% or 75%.
A move with a slash (—) can't miss, not even when the foe has raised its dodge. Slash moves are never a critter's strongest move.

- Starters and wild critters evolve; wild critters past their evolve level come already evolved
- Electric, Flying and Ice types (ICE beats GRASS and FLYING, FIRE melts ICE); Zapcat line in every biome; third evolutions for Blazepony, Foxlet, Splashcano and Steel Dog lines
- XP is shared: 100% if a critter did damage and is still standing, 75% for the rest of the team, 25% if knocked out
- A BOX at home and in rest huts holds extra critters (they don't earn XP); snacks heal more with every badge
- Shinies (25% more attack): find them in the wild, or trade 3 plain critters of one kind for 1 shiny in Pebble Town
- Pods to catch critters, a team of 6
- Level caps: 25 to start, 35 with the Boulder Badge, 50 with the Grove Badge, 65 with the Ember Badge, 75 with the Fossil Badge
- Dinosaurs: AQUAKYLO → BRAWLKYLO (Lv 56, Super Smash shakes the screen), FROSTOSAUR → XENOFROST (Lv 57, Roll Up turns the screen blue),
  FIRESPINO → TWINSPINO (Lv 58, Spine Slice cuts the screen in half, Flaming Beam)

## Adding the next area

1. Add an entry to `AREAS` in `data.js` (kind: `meadow`, `mountains`, `forest`, `volcano` or `prehistoric`, plus a gate and welcome text).
2. Add its encounter table to `ENCOUNTERS`, and if it has a town, a `TOWNS` entry. For a gym, add a `GYMS` entry, set the town's `gym`, and add a `LEVEL_CAP` for the new badge.
   (A town with `gym: null` shows a "coming soon" sign instead.)
3. The map builder in `engine.js` lays it out to the right automatically, with the town below and a gate from the area before it.
   A brand-new kind of area (snow, desert...) needs a small layout block in `buildMap()` plus tiles in `art.js`.

## Quick tweaks (all in `data.js`)

- Encounter rates and levels: `ENCOUNTERS`
- Move power, type and accuracy: `MOVES` (`acc: 100/90/80/75`, or `sure: true` for a slash move that can't miss)
- Mountain gate level: `GATE_LEVEL`
- How easy each critter is to catch: `catchRate` on each critter
- Evolution levels: `evolve: { lv, to }`
- Type matchups: `CHART`
- Shiny odds and colors: `SHINY` (oneIn, hue); trade price `SHINY_TRADE_COST`; attack boost `SHINY_ATTACK_BONUS`
- Gym teams, XP bonus and badges: `GYMS`
- Trainers (where they stand, their team, what they say and give): `TRAINERS`
- Your rival's teams after each gym and what he says: `RIVAL`
- Areas, towns and gates: `AREAS`, `TOWNS`
- Level caps: `LEVEL_CAP`
- XP split: `XP_SHARE`; snack healing: `SNACK_HEAL`
