// src/Pages/Arcade/games/registry.js
//
// Every game in the arcade. To add one:
//   1. Make a folder in games/ with a component that takes
//        { net, room, role, isHost, solo, onLeave }
//   2. Add an entry here. Add `persistentWorld: true` for farm-style games
//      (shared saved world, either player can play solo — see useArcadeWorld).
//   3. Add its id to KNOWN_GAMES in backend routers/arcade.py.

import { lazy } from "react";
import { CreatureFarmIcon } from "./GameIcon";

// Each game's code downloads the first time you open it. After a new deploy,
// a page that was opened BEFORE the deploy asks for old file names that no
// longer exist, and the game can't load. When that happens, reload the page
// once to pick up the new version (at most once a minute, so a real outage
// can't cause a reload loop — then RoomGate shows its "something broke" card).
function lazyGame(load) {
  return lazy(() => load().catch((err) => {
    const KEY = "arcade_chunk_reload_at";
    let last = 0;
    try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* storage blocked */ }
    if (Date.now() - last > 60_000) {
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
      window.location.reload();
      return new Promise(() => {});        // keep showing the loading screen until the reload happens
    }
    throw err;
  }));
}

export const GAMES = [
  {
    id: "creature-crashers",
    name: "Creature Crashers",
    icon: "🐉",
    blurb: "Smash through castles together. Transform into awesome creatures.",
    status: "soon",
    allowSolo: true,
    component: null,
  },
  {
    id: "blob-volley",
    name: "Blob Volleyball",
    icon: "🏐",
    blurb: "Keep it off your side of the net. First to 7. Solo plays the CPU.",
    status: "ready",
    allowSolo: true,
    component: lazyGame(() => import("./blob-volley/BlobVolley")),
  },
  {
    id: "creature-farm",
    name: "Creature Farm",
    icon: CreatureFarmIcon,
    blurb: "Grow crops, befriend creatures, and head out on runs from the signpost.",
    status: "ready",
    persistentWorld: true,
    component: lazyGame(() => import("./creature-farm/CreatureFarm")),
  },
  {
    id: "shared-garden",
    name: "Shared Garden",
    icon: "🌷",
    blurb: "Plant together or alone. It keeps growing while you're away.",
    status: "ready",
    persistentWorld: true,   // saved world on the room, live host, no waiting screen
    component: lazyGame(() => import("./shared-garden/SharedGarden")),
  },
  {
    id: "blob-test",
    name: "Blob Test",
    icon: "🟢",
    blurb: "Two blobs, two screens. Checks the connection and the saves.",
    status: "ready",
    allowSolo: true,
    component: lazyGame(() => import("./blob-test/BlobTest")),
  },
];

export const getGame = (id) => GAMES.find(g => g.id === id) ?? null;