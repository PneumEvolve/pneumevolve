// src/Pages/Arcade/games/walk-3d/hotpotato/HotPotato.jsx
//
// Hot Potato — the Bumper Blobs arena and blobs, with a fizzing bomb.
// All the game code lives in ../bumper/BumperBlobs.jsx (mode="potato"),
// so both games share the arena, sliding, bumping, power-ups and sounds.

import React from "react";
import BumperBlobs from "../bumper/BumperBlobs";

export default function HotPotato(props) {
  return <BumperBlobs {...props} mode="potato" />;
}