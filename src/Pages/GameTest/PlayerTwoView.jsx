// src/Pages/GameTest/PlayerTwoView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useGameTestRoom } from "./useGameTestRoom";
import {
  WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R,
  seededRand, generateChunk,
  updateEnemies,
} from "./gameEngine";

const MAX_INK       = 1200;  // total pixel-length of strokes painter can have active
const CHUNKS_AHEAD  = 6;
const RECENTER_LERP = 8;
const ENEMY_R       = 14;

export default function PlayerTwoView({ room, onGameOver }) {
    

}