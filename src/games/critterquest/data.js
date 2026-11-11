// Critter Quest — game data: types, moves, critters, encounters, shinies and the gym.
// Change names, numbers and move lists here; the engine reads everything from this file.

/* ---------------- types ---------------- */
export const TYPE_COLORS = {
  NORMAL: '#9a8f7e',
  FIRE: '#e8642c',
  WATER: '#3b8fd9',
  GRASS: '#4caf50',
  FIGHTING: '#c0443a',
  ROCK: '#a07a4a',
  STEEL: '#7c8ea3',
};

// attacker type -> defender type -> multiplier (anything missing is 1x)
// The core triangle: GRASS beats WATER, WATER beats FIRE, FIRE beats GRASS.
const CHART = {
  FIRE:     { GRASS: 2, STEEL: 2, FIRE: 0.5, WATER: 0.5, ROCK: 0.5 },
  WATER:    { FIRE: 2, ROCK: 2, WATER: 0.5, GRASS: 0.5 },
  GRASS:    { WATER: 2, ROCK: 2, FIRE: 0.5, GRASS: 0.5, STEEL: 0.5 },
  FIGHTING: { NORMAL: 2, ROCK: 2, STEEL: 2 },
  ROCK:     { FIRE: 2, FIGHTING: 0.5, STEEL: 0.5 },
  STEEL:    { ROCK: 2, FIRE: 0.5, WATER: 0.5, STEEL: 0.5 },
  NORMAL:   { ROCK: 0.5, STEEL: 0.5 },
};
export function effectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((m, t) => m * ((CHART[moveType] || {})[t] ?? 1), 1);
}

/* ---------------- moves ---------------- */
// power/acc for attacks; effect = [stat, change, 'self' | 'foe'] for status moves.
// anim: lunge | dash | thump | nibble | pounce | smash | quake | proj (with proj: fire, shadow, water, rock, wind, rocket, leaf)
export const MOVES = {
  // Blazepony / Shadowblaze
  'Tackle':       { type: 'NORMAL',   power: 6,  acc: 95,  anim: 'lunge' },
  'Ember Kick':   { type: 'FIRE',     power: 9,  acc: 90,  anim: 'proj', proj: 'fire' },
  'Snort':        { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Flame Dash':   { type: 'FIRE',     power: 12, acc: 80,  anim: 'dash' },
  'Shadow Blaze': { type: 'FIRE',     power: 16, acc: 85,  anim: 'proj', proj: 'shadow' },
  // Foxlet / Hammerfox
  'Scratch':      { type: 'NORMAL',   power: 6,  acc: 100, anim: 'lunge' },
  'Leaf Toss':    { type: 'GRASS',    power: 8,  acc: 95,  anim: 'proj', proj: 'leaf' },
  'Tail Swish':   { type: 'NORMAL',   effect: ['def', -1, 'foe'] },
  'Vine Whip':    { type: 'GRASS',    power: 12, acc: 85,  anim: 'pounce' },
  'Hammer Smash': { type: 'FIGHTING', power: 17, acc: 80,  anim: 'smash' },
  // Splashcano / Boomcano
  'Splash':       { type: 'WATER',    power: 7,  acc: 100, anim: 'proj', proj: 'water' },
  'Rock Toss':    { type: 'ROCK',     power: 9,  acc: 85,  anim: 'proj', proj: 'rock' },
  'Steam Puff':   { type: 'WATER',    effect: ['eva', 1, 'self'] },
  'Geyser':       { type: 'WATER',    power: 12, acc: 80,  anim: 'proj', proj: 'water' },
  'Rocket Blast': { type: 'STEEL',    power: 18, acc: 75,  anim: 'proj', proj: 'rocket' },
  // Rabbit / Megabun
  'Kick':         { type: 'NORMAL',   power: 7,  acc: 90,  anim: 'lunge' },
  'Nibble':       { type: 'NORMAL',   power: 5,  acc: 100, anim: 'nibble' },
  'Thump':        { type: 'NORMAL',   power: 9,  acc: 80,  anim: 'thump' },
  'Hop':          { type: 'NORMAL',   effect: ['eva', 1, 'self'] },
  'Mega Thump':   { type: 'NORMAL',   power: 15, acc: 85,  anim: 'thump' },
  // Bluebird / Skyhawk
  'Peck':         { type: 'NORMAL',   power: 7,  acc: 95,  anim: 'lunge' },
  'Gust':         { type: 'NORMAL',   power: 8,  acc: 90,  anim: 'proj', proj: 'wind' },
  'Dive':         { type: 'NORMAL',   power: 11, acc: 75,  anim: 'dash' },
  'Fluff Up':     { type: 'NORMAL',   effect: ['eva', 1, 'self'] },
  'Talon Strike': { type: 'NORMAL',   power: 15, acc: 85,  anim: 'pounce' },
  // Fox / Elderfox
  'Pounce':       { type: 'NORMAL',   power: 9,  acc: 90,  anim: 'pounce' },
  'Bite':         { type: 'NORMAL',   power: 9,  acc: 85,  anim: 'lunge' },
  'Fox Fury':     { type: 'NORMAL',   power: 15, acc: 85,  anim: 'dash' },
  // Rockalock
  'Rock Slam':    { type: 'ROCK',     power: 12, acc: 85,  anim: 'thump' },
  'Boulder Roll': { type: 'ROCK',     power: 14, acc: 75,  anim: 'dash' },
  'Harden':       { type: 'ROCK',     effect: ['def', 1, 'self'] },
  'Stomp':        { type: 'NORMAL',   power: 9,  acc: 90,  anim: 'thump' },
  // Steel Dog / Steel Wolf
  'Metal Bite':   { type: 'STEEL',    power: 10, acc: 90,  anim: 'lunge' },
  'Iron Tackle':  { type: 'STEEL',    power: 13, acc: 80,  anim: 'dash' },
  'Growl':        { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Steel Fang':   { type: 'STEEL',    power: 16, acc: 85,  anim: 'lunge' },
  // Komodo / Dark Komodo
  'Claw':         { type: 'NORMAL',   power: 9,  acc: 95,  anim: 'lunge' },
  'Fire Breath':  { type: 'FIRE',     power: 11, acc: 90,  anim: 'proj', proj: 'fire' },
  'Hiss':         { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Chomp':        { type: 'NORMAL',   power: 13, acc: 85,  anim: 'pounce' },
  'Dark Flame':   { type: 'FIRE',     power: 17, acc: 85,  anim: 'proj', proj: 'shadow' },
  // Snapling / Tree Titan
  'Snap':         { type: 'NORMAL',   power: 10, acc: 95,  anim: 'nibble' },
  'Root Grab':    { type: 'GRASS',    power: 12, acc: 90,  anim: 'pounce' },
  'Bark Skin':    { type: 'GRASS',    effect: ['def', 1, 'self'] },
  'Tree Shake':   { type: 'GRASS',    power: 18, acc: 85,  anim: 'quake' },   // the whole screen shakes!
};
const EFFECT_SUB = { 'atk-1': 'ATK ↓', 'def-1': 'DEF ↓', 'def1': 'DEF ↑', 'eva1': 'DODGE ↑' };
export const moveSub = m => {
  const M = MOVES[m];
  return M.effect ? EFFECT_SUB[M.effect[0] + M.effect[1]] : 'POW ' + M.power;
};

/* ---------------- critters ---------------- */
// b = base stats. Real stats: hp = b.hp + lv*3, atk = b.atk + lv, def/spd = base + lv*0.8
// catchRate: 0..1, higher is easier to catch with a POD.
// flicker: two art characters that swap back and forth (flames, steam).
export const SPECIES = {
  blazepony: {
    name: 'BLAZEPONY', types: ['FIRE'], flicker: 'fF', catchRate: 0.25,
    b: { hp: 12, atk: 4, def: 2, spd: 6 },
    moves: ['Tackle', 'Ember Kick', 'Snort', 'Flame Dash'], learn: { 'Flame Dash': 8 },
    evolve: { lv: 15, to: 'shadowblaze' },
    blurb: ['BLAZEPONY, a FIRE-type horse.', 'At Lv 15 it grows into SHADOWBLAZE!'],
  },
  shadowblaze: {
    name: 'SHADOWBLAZE', types: ['FIRE'], flicker: 'fF', catchRate: 0.15,
    b: { hp: 18, atk: 9, def: 5, spd: 9 },
    moves: ['Ember Kick', 'Snort', 'Flame Dash', 'Shadow Blaze'], signature: 'Shadow Blaze',
  },
  foxlet: {
    name: 'FOXLET', types: ['GRASS'], catchRate: 0.25,
    b: { hp: 11, atk: 5, def: 2, spd: 5 },
    moves: ['Scratch', 'Leaf Toss', 'Tail Swish', 'Vine Whip'], learn: { 'Vine Whip': 8 },
    evolve: { lv: 16, to: 'hammerfox' },
    blurb: ['FOXLET, a GRASS-type fox.', 'At Lv 16 it becomes HAMMERFOX, GRASS and FIGHTING!'],
  },
  hammerfox: {
    name: 'HAMMERFOX', types: ['GRASS', 'FIGHTING'], catchRate: 0.15,
    b: { hp: 17, atk: 11, def: 6, spd: 7 },
    moves: ['Leaf Toss', 'Tail Swish', 'Vine Whip', 'Hammer Smash'], signature: 'Hammer Smash',
  },
  splashcano: {
    name: 'SPLASHCANO', types: ['WATER'], catchRate: 0.25,
    b: { hp: 15, atk: 3, def: 4, spd: 2 },
    moves: ['Splash', 'Rock Toss', 'Steam Puff', 'Geyser'], learn: { 'Geyser': 8 },
    evolve: { lv: 16, to: 'boomcano' },
    blurb: ['SPLASHCANO, a WATER-type volcano.', 'At Lv 16 it becomes BOOMCANO: steam and a rocket launcher!'],
    appear: 'bubbled up', exit: 'It splashed away to find a pond.', exitAnim: 'hop', rare: true,
  },
  boomcano: {
    name: 'BOOMCANO', types: ['WATER'], flicker: 'wU', catchRate: 0.15,
    b: { hp: 22, atk: 9, def: 8, spd: 4 },
    moves: ['Rock Toss', 'Steam Puff', 'Geyser', 'Rocket Blast'], signature: 'Rocket Blast',
    appear: 'steamed up', exit: 'It hissed off in a cloud of steam.', exitAnim: 'hop',
  },
  rabbit: {
    name: 'RABBIT', types: ['NORMAL'], catchRate: 0.6,
    b: { hp: 4, atk: 1, def: 1, spd: 3 },
    moves: ['Kick', 'Nibble', 'Thump', 'Hop'],
    evolve: { lv: 12, to: 'megabun' },
    appear: 'hopped out', exit: 'It hopped back into the tall grass.', exitAnim: 'hop',
  },
  megabun: {
    name: 'MEGABUN', types: ['NORMAL'], catchRate: 0.45,
    b: { hp: 9, atk: 4, def: 3, spd: 5 },
    moves: ['Kick', 'Thump', 'Hop', 'Mega Thump'], signature: 'Mega Thump',
    appear: 'bounced in', exit: 'It boinged away over the hill.', exitAnim: 'hop',
  },
  bluebird: {
    name: 'BLUEBIRD', types: ['NORMAL'], catchRate: 0.55, hovers: true,
    b: { hp: 2, atk: 2, def: 0, spd: 6 },
    moves: ['Peck', 'Gust', 'Dive', 'Fluff Up'],
    evolve: { lv: 14, to: 'skyhawk' },
    appear: 'swooped in', exit: 'It flew off to rest in a tree.', exitAnim: 'fly',
  },
  skyhawk: {
    name: 'SKYHAWK', types: ['NORMAL'], catchRate: 0.4, hovers: true,
    b: { hp: 7, atk: 5, def: 2, spd: 9 },
    moves: ['Peck', 'Gust', 'Dive', 'Talon Strike'], signature: 'Talon Strike',
    appear: 'dove down', exit: 'It soared up into the clouds.', exitAnim: 'fly',
  },
  fox: {
    name: 'FOX', types: ['NORMAL'], catchRate: 0.45,
    b: { hp: 5, atk: 2, def: 1, spd: 4 },
    moves: ['Scratch', 'Pounce', 'Tail Swish', 'Bite'],
    evolve: { lv: 16, to: 'elderfox' },
    appear: 'sneaked out', exit: 'It ran off into the bushes.', exitAnim: 'dash',
  },
  elderfox: {
    name: 'ELDERFOX', types: ['NORMAL'], catchRate: 0.35,
    b: { hp: 10, atk: 5, def: 3, spd: 6 },
    moves: ['Pounce', 'Bite', 'Tail Swish', 'Fox Fury'], signature: 'Fox Fury',
    appear: 'swished out', exit: 'Its three tails swished as it ran off.', exitAnim: 'dash',
  },
  steeldog: {
    name: 'STEEL DOG', types: ['STEEL'], catchRate: 0.35,
    b: { hp: 6, atk: 3, def: 4, spd: 4 },
    moves: ['Metal Bite', 'Iron Tackle', 'Growl', 'Bite'],
    evolve: { lv: 22, to: 'steelwolf' },
    appear: 'clanked out', exit: 'It clanked away down the trail.', exitAnim: 'dash',
  },
  steelwolf: {
    name: 'STEEL WOLF', types: ['STEEL'], catchRate: 0.25,
    b: { hp: 11, atk: 6, def: 7, spd: 6 },
    moves: ['Metal Bite', 'Iron Tackle', 'Growl', 'Steel Fang'], signature: 'Steel Fang',
    appear: 'howled', exit: 'It howled and clanked away.', exitAnim: 'dash',
  },
  rockalock: {
    name: 'ROCKALOCK', types: ['ROCK'], catchRate: 0.18,
    b: { hp: 14, atk: 4, def: 5, spd: 0 },
    moves: ['Rock Slam', 'Boulder Roll', 'Harden', 'Stomp'],
    appear: 'stomped out', exit: 'It rolled away down the mountain.', exitAnim: 'dash',
  },
  komodo: {
    name: 'KOMODO', types: ['FIRE'], catchRate: 0.35,
    b: { hp: 10, atk: 6, def: 4, spd: 5 },
    moves: ['Claw', 'Fire Breath', 'Hiss', 'Chomp'],
    evolve: { lv: 28, to: 'darkkomodo' },
    appear: 'crawled out', exit: 'It flicked its tongue and slid away.', exitAnim: 'dash',
  },
  darkkomodo: {
    name: 'DARK KOMODO', types: ['FIRE'], flicker: 'fF', catchRate: 0.25,
    b: { hp: 16, atk: 9, def: 6, spd: 7 },
    moves: ['Fire Breath', 'Hiss', 'Chomp', 'Dark Flame'], signature: 'Dark Flame',
    appear: 'stomped out of the shadows', exit: 'It vanished into the dark trees.', exitAnim: 'dash',
  },
  snapling: {
    name: 'SNAPLING', types: ['GRASS'], catchRate: 0.4,
    b: { hp: 12, atk: 5, def: 6, spd: 2 },
    moves: ['Snap', 'Leaf Toss', 'Bark Skin', 'Root Grab'],
    evolve: { lv: 26, to: 'treetitan' },
    appear: 'snapped its jaws', exit: 'It waddled back into the bushes.', exitAnim: 'hop',
  },
  treetitan: {
    name: 'TREE TITAN', types: ['GRASS'], catchRate: 0.15,
    b: { hp: 22, atk: 9, def: 10, spd: 2 },
    moves: ['Snap', 'Root Grab', 'Bark Skin', 'Tree Shake'], signature: 'Tree Shake',
    appear: 'towered over you', exit: 'It stomped off, shaking the whole forest.', exitAnim: 'dash',
  },
};
export const STARTERS = ['blazepony', 'foxlet', 'splashcano'];

/* ---------------- encounters ---------------- */
// weights are relative. Meadow critters stay below Lv 10; mountain critters are all above Lv 10.
// Wild critters that are past their evolve level show up already evolved.
export const ENCOUNTERS = {
  north:    { min: 2,  max: 9,  table: [['rabbit', 50], ['bluebird', 35], ['fox', 12], ['splashcano', 3]] },
  south:    { min: 3,  max: 9,  table: [['fox', 50], ['bluebird', 25], ['rabbit', 22], ['splashcano', 3]] },
  mountain: { min: 11, max: 18, table: [['steeldog', 40], ['rockalock', 20], ['fox', 20], ['bluebird', 20]] },
  forest:   { min: 20, max: 30, table: [['komodo', 42], ['snapling', 42], ['fox', 13], ['hammerfox', 3]] },   // Hammerfox is very rare
};
export const GATE_LEVEL = 10;   // a critter must be PAST this level to open the mountain gate
export const TEAM_MAX = 6;
// Max critter level: 25 to start, raised by each gym badge you hold.
export const LEVEL_CAP = { start: 25, pebble: 35, mossy: 45 };

/* ---------------- the world ---------------- */
// Areas line up left to right, 32 tiles wide each. A town (if any) sits right below its area.
// To add the next area: add an entry here (kind: meadow | mountains | forest) and, if it has a town, a TOWNS + GYMS entry.
export const AREAS = [
  { id: 'meadow', kind: 'meadow', name: 'MAPLE HILL' },
  { id: 'mountains', kind: 'mountains', name: 'ROCKY MOUNTAINS', encounters: 'mountain', town: 'pebble',
    gate: { level: GATE_LEVEL }, gateSign: ['ROCKY MOUNTAINS, this way!', `Only teams with a critter past Lv ${GATE_LEVEL} may pass the gate.`],
    welcome: ['Welcome to the ROCKY MOUNTAINS!', 'Every critter up here is above Lv 10. PEBBLE TOWN is down the south trail.'] },
  { id: 'forest', kind: 'forest', name: 'WHISPER FOREST', encounters: 'forest', town: 'mossy',
    gate: { badge: 'pebble' }, gateSign: ['WHISPER FOREST, this way!', 'Only trainers with the BOULDER BADGE may enter.'],
    welcome: ['Welcome to WHISPER FOREST!', 'Critters here are Lv 20 to 30. MOSSY HOLLOW is down the south trail.'] },
];
export const TOWNS = {
  pebble: { name: 'PEBBLE TOWN', tagline: 'Where the bunnies are LOVED.', trader: true, rest: 'REST STOP', gym: 'pebble',
    welcome: ['Welcome to PEBBLE TOWN!', 'The blue house is the SHINY TRADER. The big stone hall is the GYM.'] },
  mossy: { name: 'MOSSY HOLLOW', tagline: 'A sleepy town under the big trees.', rest: 'HEALING HUT', gym: 'mossy',
    welcome: ['Welcome to MOSSY HOLLOW!', 'The straw hut is the HEALING HUT. The wooden hall is the GYM.'] },
};

/* ---------------- shinies ---------------- */
// Shinies are regular critters in an exotic color. Every critter in a family shares one shiny luck.
// oneIn: about 1 in this many wild critters of that family is shiny (before any bunny trades).
// Each bunny traded in Pebble Town doubles that family's luck, up to x64.
export const FAMILY = {
  rabbit: 'rabbit', megabun: 'rabbit',
  bluebird: 'bluebird', skyhawk: 'bluebird',
  fox: 'fox', elderfox: 'fox',
  steeldog: 'steeldog', steelwolf: 'steeldog',
  rockalock: 'rockalock',
  splashcano: 'splashcano', boomcano: 'splashcano',
  komodo: 'komodo', darkkomodo: 'komodo',
  snapling: 'snapling', treetitan: 'snapling',
};
export const SHINY = {
  fox:        { oneIn: 40,  hue: 180 },                 // the easiest shiny: a blue fox
  rabbit:     { oneIn: 80,  hue: 290, sat: 1.5 },       // pink and purple bunny
  bluebird:   { oneIn: 80,  hue: 150 },                 // red bird with a teal chest
  splashcano: { oneIn: 60,  hue: 120 },                 // green rock, pink water
  steeldog:   { oneIn: 120, set: [45, 0.7] },           // solid gold dog
  rockalock:  { oneIn: 200, set: [275, 0.4] },          // purple crystal boulder
  komodo:     { oneIn: 100, hue: 200 },                 // purple-blue lizard
  snapling:   { oneIn: 100, hue: -80, sat: 1.2 },       // autumn-orange leaves
};
export const SHINY_ORDER = ['fox', 'rabbit', 'bluebird', 'splashcano', 'steeldog', 'rockalock', 'komodo', 'snapling'];
export const LUCK_MAX = 64;

/* ---------------- gyms ---------------- */
export const GYMS = {
  pebble: {
    leader: 'LEADER BRICK', short: 'BRICK', look: 'brick', hall: 'PEBBLE GYM',
    team: [['steeldog', 15], ['rockalock', 20]],
    badge: 'BOULDER BADGE', xpMultiplier: 2, teamPrize: 50,
    intro: ['"Welcome to the PEBBLE GYM!"', '"My critters are as tough as rocks!"', '"First a Lv 15 STEEL DOG, then my Lv 20 ROCKALOCK!"'],
  },
  mossy: {
    leader: 'LEADER IVY', short: 'IVY', look: 'ivy', hall: 'MOSSY GYM',
    team: [['treetitan', 25], ['darkkomodo', 28], ['hammerfox', 30]],
    badge: 'GROVE BADGE', xpMultiplier: 2, teamPrize: 80,
    intro: ['"Welcome to the MOSSY GYM! I\'m IVY."', '"I have a Lv 25 TREE TITAN and a Lv 28 DARK KOMODO..."', '"...and my best friend, a Lv 30 HAMMERFOX!"'],
  },
};

/* ---------------- critter helpers ---------------- */
export const xpNeed = lv => 10 + lv * 4;
export function applyStats(c) {
  const b = SPECIES[c.sp].b, old = c.maxHp;
  c.maxHp = b.hp + c.lv * 3;
  c.atk = b.atk + c.lv;
  c.def = b.def + Math.floor(c.lv * 0.8);
  c.spd = b.spd + Math.floor(c.lv * 0.8);
  if (old !== undefined && c.hp > 0) c.hp = Math.max(1, Math.min(c.maxHp, c.hp + (c.maxHp - old)));
}
export function makeCritter(sp, lv, shiny = false) {
  const c = { sp, lv, shiny, xp: 0, xpNext: xpNeed(lv), stages: { atk: 0, def: 0, eva: 0 } };
  applyStats(c);
  c.hp = c.maxHp; c.shownHp = c.hp; c.shownXp = 0;
  return c;
}
// The form a critter of this level would have (wild critters past their evolve level come evolved).
export function grownForm(sp, lv) {
  let s = sp;
  while (SPECIES[s].evolve && lv >= SPECIES[s].evolve.lv) s = SPECIES[s].evolve.to;
  return s;
}