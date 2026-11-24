// src/Pages/Arcade/games/walk-3d/games3d.js
//
// 3D mini-games you start from a glowing pad in the 3D Tester world.
// To add one: make a folder here with a component that takes
//   { net, host, look, partnerLook, myName, partnerName, myColor, partnerColor, onExit }
// and add an entry below (pick a spot for its pad near the middle of the world).

import { lazy } from "react";

export const GAMES3D = [
  {
    id: "bumper", name: "Bumper Blobs", color: "#ff7aa8", pad: { x: -6, z: -4 }, ready: true,
    desc: "Bump each other off a crumbling sky platform. First to 3 rounds.",
    component: lazy(() => import("./bumper/BumperBlobs")),
  },
  {
    id: "hotpotato", name: "Hot Potato", color: "#ffb347", pad: { x: -10.5, z: -7 }, ready: true,
    desc: "Bump to pass the fizzing bomb. Don't be holding it at BOOM!",
    component: lazy(() => import("./hotpotato/HotPotato")),
  },
  { id: "bowling", name: "Blob Bowling", color: "#6fd3ff", pad: { x: -1.5, z: -8 }, ready: false, desc: "You are the bowling ball. Coming soon." },
];