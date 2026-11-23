// src/Pages/Arcade/games/registry.js
//
// Every game in the arcade. To add one:
//   1. Make a folder in games/ with a component that takes
//        { net, room, role, isHost, solo, onLeave }
//   2. Add an entry here. Add `persistentWorld: true` for farm-style games
//      (shared saved world, either player can play solo — see useArcadeWorld).
//   3. Add its id to KNOWN_GAMES in backend routers/arcade.py.

import { lazy } from "react";

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
    component: lazy(() => import("./blob-volley/BlobVolley")),
  },
  {
    id: "shared-garden",
    name: "Shared Garden",
    icon: "🌷",
    blurb: "Plant together or alone. It keeps growing while you're away.",
    status: "ready",
    persistentWorld: true,   // saved world on the room, live host, no waiting screen
    component: lazy(() => import("./shared-garden/SharedGarden")),
  },
  {
    id: "blob-test",
    name: "Blob Test",
    icon: "🟢",
    blurb: "Two blobs, two screens. Checks the connection and the saves.",
    status: "ready",
    allowSolo: true,
    component: lazy(() => import("./blob-test/BlobTest")),
  },
];

export const getGame = (id) => GAMES.find(g => g.id === id) ?? null;