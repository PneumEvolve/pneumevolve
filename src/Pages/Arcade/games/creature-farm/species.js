// src/Pages/Arcade/games/creature-farm/species.js
//
// *** BASH'S FILE ***  Every creature and crop in the game lives here.
// These are placeholders — replace them with your own creatures!
//
// A creature is built from parts, so you can invent one by mixing:
//   body:  "round" | "blob" | "long" | "tall"
//   ears:  "pointy" | "round" | "leaf" | "antenna" | "horns" | "none"
//   tail:  "flame" | "fin" | "fluffy" | "stinger" | "none"
//   extra: "wings" | "shell" | "spots" | "none"
//   hue:   colour wheel 0–360  (0 red, 30 orange, 60 yellow, 120 green,
//          200 blue, 270 purple, 320 pink).  sat / light: 0–100
//   food:  the food it loves (a key from CROPS)
//   lure:  the lure crop that brings it to the farm (or null)
//   starter: true = you can pick it on day 1
//
// Babies (later) will mix their parents' parts and colours.

export const SPECIES = {
  // ── Starters ────────────────────────────────────────────────────────────────
  mossling: {
    name: "Mossling", element: "plant", starter: true,
    body: "round", ears: "leaf", tail: "none", extra: "none",
    hue: 105, sat: 55, light: 52, food: "berry", lure: "sweetroot",
  },
  emberpup: {
    name: "Emberpup", element: "fire", starter: true,
    body: "long", ears: "pointy", tail: "flame", extra: "none",
    hue: 18, sat: 85, light: 58, food: "carrot", lure: "glowcap",
  },
  puddlet: {
    name: "Puddlet", element: "water", starter: true,
    body: "blob", ears: "none", tail: "fin", extra: "spots",
    hue: 205, sat: 75, light: 60, food: "berry", lure: "sweetroot",
  },

  // ── Wild visitors ───────────────────────────────────────────────────────────
  fluffwing: {
    name: "Fluffwing", element: "air",
    body: "round", ears: "round", tail: "fluffy", extra: "wings",
    hue: 320, sat: 60, light: 75, food: "berry", lure: "sweetroot",
  },
  glowmoth: {
    name: "Glowmoth", element: "light",
    body: "tall", ears: "antenna", tail: "none", extra: "wings",
    hue: 55, sat: 90, light: 65, food: "carrot", lure: "glowcap",
  },
  pebblet: {
    name: "Pebblet", element: "earth",
    body: "blob", ears: "horns", tail: "none", extra: "shell",
    hue: 30, sat: 20, light: 55, food: "carrot", lure: "glowcap",
  },
  zapling: {
    name: "Zapling", element: "storm",
    body: "tall", ears: "pointy", tail: "stinger", extra: "none",
    hue: 270, sat: 70, light: 62, food: "berry", lure: null, // only wanders in on its own (rare)
  },
};

// Crops: "food" feeds creatures, "lure" attracts visitors when it's ready.
// grow = milliseconds of real time. Berries take 5 min (2 per harvest), carrots
// 10 min (3 per harvest, worth twice as much). Lure crops stay quick so
// catching visitors is fun during play.
// Crop pictures are drawn in drawFarm.js (drawCropSprite) — add a new crop there too.
export const CROPS = {
  berry:     { name: "Berries",   type: "food", grow: 5 * 60_000,  yield: 2, color: "#5b6ff0" },
  carrot:    { name: "Carrots",   type: "food", grow: 10 * 60_000, yield: 3, color: "#f08a24" },
  sweetroot: { name: "Sweetroot", type: "lure", grow: 60_000, color: "#e46a9e" },
  glowcap:   { name: "Glowcap",   type: "lure", grow: 2 * 60_000, color: "#ff8ad0" },
};

// Personalities change how a creature behaves.
export const PERSONALITIES = {
  shy:     "slower to befriend",
  bold:    "quick to trust",
  greedy:  "gets hungry faster",
  playful: "loves being petted",
  sleepy:  "barely notices if you rush",
  grumpy:  "hard to please",
};

export const NAMES = [
  "Pip", "Mochi", "Nugget", "Bean", "Ziggy", "Pickle", "Taco", "Biscuit", "Noodle", "Sprout",
  "Waffles", "Bolt", "Pebble", "Juniper", "Gizmo", "Sushi", "Tater", "Comet", "Fig", "Rascal",
];