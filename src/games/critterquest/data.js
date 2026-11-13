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
  ELECTRIC: '#e6b800',
  FLYING: '#7aa7e0',
  PSYCHIC: '#d45fa0',
  ICE: '#5cc8e0',
};

// attacker type -> defender type -> multiplier (anything missing is 1x)
// The core triangle: GRASS beats WATER, WATER beats FIRE, FIRE beats GRASS.
// Also: ELECTRIC beats FLYING, FLYING beats GRASS, ICE beats GRASS and FLYING, FIRE melts ICE.
const CHART = {
  FIRE:     { GRASS: 2, STEEL: 2, ICE: 2, FIRE: 0.5, WATER: 0.5, ROCK: 0.5 },
  WATER:    { FIRE: 2, ROCK: 2, WATER: 0.5, GRASS: 0.5 },
  GRASS:    { WATER: 2, ROCK: 2, FIRE: 0.5, GRASS: 0.5, STEEL: 0.5, FLYING: 0.5 },
  FIGHTING: { NORMAL: 2, ROCK: 2, STEEL: 2 },
  ROCK:     { FIRE: 2, FLYING: 2, FIGHTING: 0.5, STEEL: 0.5 },
  STEEL:    { ROCK: 2, FIRE: 0.5, WATER: 0.5, STEEL: 0.5 },
  NORMAL:   { ROCK: 0.5, STEEL: 0.5 },
  ELECTRIC: { FLYING: 2, WATER: 1, GRASS: 0.5, ELECTRIC: 0.5 },
  FLYING:   { GRASS: 2, ELECTRIC: 0.5, ROCK: 0.5, STEEL: 0.5 },
  PSYCHIC:  { FIGHTING: 2, STEEL: 0.5, PSYCHIC: 0.5 },
  ICE:      { GRASS: 2, FLYING: 2, FIRE: 0.5, ICE: 0.5, STEEL: 0.5 },
};
export function effectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((m, t) => m * ((CHART[moveType] || {})[t] ?? 1), 1);
}

/* ---------------- moves ---------------- */
// Every move has a type. Attacks have power and accuracy: acc is 100, 90, 80 or 75 (% chance to hit).
// sure: true is a SLASH move (shown as —): it can't miss, not even when the foe has raised its DODGE.
// Rule: only some moves get a slash, and a slash move is never a critter's strongest move.
// Status moves (effect = [stat, change, 'self' | 'foe']) always work.
// anim: lunge | dash | thump | nibble | pounce | smash | quake | proj (with proj: fire, shadow, water, rock, wind, rocket, leaf)
export const MOVES = {
  // Blazepony / Shadowblaze
  'Tackle':       { type: 'NORMAL',   power: 6, acc: 100, anim: 'lunge' },
  'Ember Kick':   { type: 'FIRE',     power: 9, acc: 100, anim: 'proj', proj: 'fire' },
  'Snort':        { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Flame Dash':   { type: 'FIRE',     power: 12, acc: 80, anim: 'dash' },
  'Shadow Blaze': { type: 'FIRE',     power: 16, acc: 100, anim: 'proj', proj: 'shadow' },
  // Foxlet / Hammerfox
  'Scratch':      { type: 'NORMAL',   power: 6, sure: true, anim: 'lunge' },
  'Little Smash': { type: 'FIGHTING', power: 12, acc: 100, anim: 'smash' },   // Foxlet bonks with the tiny hammer in its mouth
  'Leaf Toss':    { type: 'GRASS',    power: 8, acc: 100, anim: 'proj', proj: 'leaf' },
  'Tail Swish':   { type: 'NORMAL',   effect: ['def', -1, 'foe'] },
  'Vine Whip':    { type: 'GRASS',    power: 12, acc: 100, anim: 'pounce' },
  'Hammer Smash': { type: 'FIGHTING', power: 17, acc: 80, anim: 'smash' },
  // Splashcano / Boomcano
  'Splash':       { type: 'WATER',    power: 7, sure: true, anim: 'proj', proj: 'water' },
  'Rock Toss':    { type: 'ROCK',     power: 9, acc: 100, anim: 'proj', proj: 'rock' },
  'Steam Puff':   { type: 'WATER',    effect: ['eva', 1, 'self'] },
  'Geyser':       { type: 'WATER',    power: 12, acc: 80, anim: 'proj', proj: 'water' },
  'Rocket Blast': { type: 'STEEL',    power: 18, acc: 75, anim: 'proj', proj: 'rocket' },
  // Rabbit / Megabun
  'Kick':         { type: 'NORMAL',   power: 7, acc: 100, anim: 'lunge' },
  'Nibble':       { type: 'NORMAL',   power: 5, sure: true, anim: 'nibble' },
  'Thump':        { type: 'NORMAL',   power: 9, acc: 80, anim: 'thump' },
  'Hop':          { type: 'NORMAL',   effect: ['eva', 1, 'self'] },
  'Mega Thump':   { type: 'NORMAL',   power: 15, acc: 100, anim: 'thump' },
  // Bluebird / Skyhawk
  'Peck':         { type: 'NORMAL',   power: 7, sure: true, anim: 'lunge' },
  'Gust':         { type: 'FLYING',   power: 8, acc: 100, anim: 'proj', proj: 'wind' },
  'Dive':         { type: 'FLYING',   power: 11, acc: 75, anim: 'dash' },
  'Fluff Up':     { type: 'NORMAL',   effect: ['eva', 1, 'self'] },
  'Talon Strike': { type: 'FLYING',   power: 15, acc: 100, anim: 'pounce' },
  // Fox / Elderfox
  'Pounce':       { type: 'NORMAL',   power: 9, acc: 100, anim: 'pounce' },
  'Bite':         { type: 'NORMAL',   power: 9, acc: 100, anim: 'lunge' },
  'Fox Fury':     { type: 'NORMAL',   power: 15, acc: 100, anim: 'dash' },
  // Rockalock
  'Rock Slam':    { type: 'ROCK',     power: 12, acc: 100, anim: 'thump' },
  'Boulder Roll': { type: 'ROCK',     power: 14, acc: 75, anim: 'dash' },
  'Harden':       { type: 'ROCK',     effect: ['def', 1, 'self'] },
  'Stomp':        { type: 'NORMAL',   power: 9, acc: 100, anim: 'thump' },
  // Steel Dog / Steel Wolf
  'Metal Bite':   { type: 'STEEL',    power: 10, acc: 100, anim: 'lunge' },
  'Iron Tackle':  { type: 'STEEL',    power: 13, acc: 80, anim: 'dash' },
  'Growl':        { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Steel Fang':   { type: 'STEEL',    power: 16, acc: 100, anim: 'lunge' },
  // Komodo / Dark Komodo
  'Claw':         { type: 'NORMAL',   power: 9, acc: 100, anim: 'lunge' },
  'Fire Breath':  { type: 'FIRE',     power: 11, acc: 100, anim: 'proj', proj: 'fire' },
  'Hiss':         { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Chomp':        { type: 'NORMAL',   power: 13, acc: 100, anim: 'pounce' },
  'Dark Flame':   { type: 'FIRE',     power: 17, acc: 90, anim: 'proj', proj: 'shadow' },
  // Snapling / Tree Titan
  'Snap':         { type: 'NORMAL',   power: 10, sure: true, anim: 'nibble' },
  'Root Grab':    { type: 'GRASS',    power: 12, acc: 100, anim: 'pounce' },
  'Bark Skin':    { type: 'GRASS',    effect: ['def', 1, 'self'] },
  'Tree Shake':   { type: 'GRASS',    power: 18, acc: 90, anim: 'quake' },   // the whole screen shakes!
  // Zapcat / Dark Zapcat / Demon Cat
  'Spark':        { type: 'ELECTRIC', power: 8, sure: true, anim: 'proj', proj: 'spark' },
  'Thunder Claw': { type: 'ELECTRIC', power: 14, acc: 100, anim: 'lunge' },
  'Demon Bolt':   { type: 'ELECTRIC', power: 20, acc: 90, anim: 'proj', proj: 'bolt' },
  // third evolutions
  'Axe Storm':    { type: 'FIGHTING', power: 21, acc: 80, anim: 'smash' },            // Warfox
  'Wing Blast':   { type: 'FLYING',   power: 14, acc: 100, anim: 'proj', proj: 'wind' }, // Twinblaze
  'Sky Inferno':  { type: 'FIRE',     power: 21, acc: 80, anim: 'dash' },             // Twinblaze
  'Steam Cannon': { type: 'WATER',    power: 21, acc: 90, anim: 'proj', proj: 'steamball' }, // Tricano
  'Flamethrower': { type: 'FIRE',     power: 16, acc: 100, anim: 'proj', proj: 'fire' },  // Iron Hound
  'Metal Burst':  { type: 'STEEL',    power: 23, acc: 90, anim: 'proj', proj: 'burst' }, // Iron Hound's strongest
  // Volcano Bun / Magma Bunny
  'Lava Hop':     { type: 'FIRE',     power: 14, acc: 100, anim: 'thump' },
  'Ember Spit':   { type: 'FIRE',     power: 16, acc: 100, anim: 'proj', proj: 'fire' },
  'Magma Burst':  { type: 'FIRE',     power: 22, acc: 90, anim: 'proj', proj: 'magma' },
  // Ninja Monkey / Sky Ninja / Zen Ninja
  'Flame Kick':   { type: 'FIRE',     power: 15, sure: true, anim: 'pounce' },
  'Ninja Chop':   { type: 'FIGHTING', power: 16, acc: 100, anim: 'lunge' },
  'Smoke Bomb':   { type: 'FIRE',     effect: ['eva', 1, 'self'] },
  'Golden Sword': { type: 'FLYING',   power: 24, acc: 90, anim: 'smash' },
  'Mind Blaze':   { type: 'PSYCHIC',  power: 24, acc: 90, anim: 'proj', proj: 'mind' },
  'Calm Mind':    { type: 'PSYCHIC',  effect: ['atk', 1, 'self'] },
  // Pyrolion (legendary)
  'Lion Roar':    { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Flame Mane':   { type: 'FIRE',     power: 20, acc: 90, anim: 'proj', proj: 'magma' },
  'Tidal Roar':   { type: 'WATER',    power: 22, acc: 90, anim: 'proj', proj: 'steamball' },
  'Inferno Pounce': { type: 'FIRE',   power: 26, acc: 90, anim: 'pounce' },
  // Psyraven (meadow legendary)
  'Stone Pierce': { type: 'FLYING',   power: 22, acc: 90, anim: 'proj', proj: 'feather' },  // feathers hard enough to pierce stone
  'Psy Wing':     { type: 'PSYCHIC',  power: 18, sure: true, anim: 'proj', proj: 'mind' },
  'Dark Caw':     { type: 'NORMAL',   effect: ['atk', -1, 'foe'] },
  'Razor Dive':   { type: 'FLYING',   power: 24, acc: 90, anim: 'dash' },
  // Stone Bull (mountain legendary)
  'Horn Rockets': { type: 'ROCK',     power: 24, acc: 90, anim: 'proj', proj: 'hornrocket' }, // its stone horns fire like rockets and grow right back
  'Ancient Stomp':{ type: 'ROCK',     power: 20, acc: 90, anim: 'quake' },
  'Bull Charge':  { type: 'NORMAL',   power: 18, acc: 90, anim: 'dash' },
  // Saber Stag (forest legendary)
  'Antler Ram':   { type: 'GRASS',    power: 24, acc: 90, anim: 'dash' },     // rams the opponent head-first with its antlers
  'Saber Bite':   { type: 'NORMAL',   power: 20, sure: true, anim: 'lunge' },
  'Leaf Storm':   { type: 'GRASS',    power: 20, acc: 90, anim: 'proj', proj: 'leaf' },
  'Ancient Wisdom': { type: 'PSYCHIC', effect: ['atk', 1, 'self'] },
  // Aquakylo / Brawlkylo (prehistoric)
  'Bubble Bumps': { type: 'WATER',    power: 12, sure: true, anim: 'proj', proj: 'water' },
  'Tail Club':    { type: 'WATER',    power: 15, acc: 100,  anim: 'smash' },
  'Shell Up':     { type: 'WATER',    effect: ['def', 1, 'self'] },
  'Super Smash':  { type: 'WATER',    power: 25, acc: 80,  anim: 'quake' },   // the whole screen shakes!
  // Frostosaur / Xenofrost (prehistoric)
  'Ice Fang':     { type: 'ICE',      power: 12, sure: true, anim: 'lunge' },
  'Icicle Spikes':{ type: 'ICE',      power: 15, acc: 100,  anim: 'proj', proj: 'icicle' },
  'Frost Roar':   { type: 'ICE',      effect: ['atk', -1, 'foe'] },
  'Four Claw Slash': { type: 'ICE',   power: 19, acc: 100, anim: 'pounce' },
  'Roll Up':      { type: 'ICE',      power: 25, acc: 80,  anim: 'rollup' },  // rolls into a giant ball and the screen goes blue
  // Firespino / Twinspino (prehistoric)
  'Fire Fang':    { type: 'FIRE',     power: 12, sure: true, anim: 'lunge' },
  'Spine Slice':  { type: 'FIRE',     power: 18, acc: 90,  anim: 'slice' },   // its fire spine cuts the screen in half
  'Chest Claws':  { type: 'FIGHTING', power: 17, acc: 100, anim: 'pounce' },
  'Flaming Beam': { type: 'FIRE',     power: 26, acc: 80,  anim: 'beam' },
  // Ironrex (prehistoric legendary)
  'Smoke Glare':  { type: 'FIRE',     power: 18, sure: true, anim: 'proj', proj: 'smoke' },
  'Horn Gore':    { type: 'STEEL',    power: 22, acc: 90,  anim: 'dash' },
  'Iron Jaws':    { type: 'STEEL',    power: 26, acc: 90,  anim: 'lunge' },
  'Bone Quake':   { type: 'STEEL',    power: 28, acc: 80,  anim: 'quake' },
};
const EFFECT_SUB = { 'atk-1': 'ATK ↓', 'def-1': 'DEF ↓', 'def1': 'DEF ↑', 'eva1': 'DODGE ↑' };
export const moveAcc = m => (MOVES[m].sure ? '—' : MOVES[m].acc + '%');
export const moveSub = m => {
  const M = MOVES[m];
  return M.effect ? EFFECT_SUB[M.effect[0] + M.effect[1]] : `POW ${M.power} · ${moveAcc(m)}`;
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
    moves: ['Ember Kick', 'Snort', 'Flame Dash', 'Shadow Blaze'],
    evolve: { lv: 32, to: 'twinblaze' },
  },
  twinblaze: {
    name: 'TWINBLAZE', types: ['FIRE', 'FLYING'], flicker: 'fF', catchRate: 0.1,
    b: { hp: 22, atk: 12, def: 7, spd: 12 },
    moves: ['Shadow Blaze', 'Snort', 'Wing Blast', 'Sky Inferno'],
  },
  foxlet: {
    name: 'FOXLET', types: ['GRASS'], catchRate: 0.25,
    b: { hp: 11, atk: 5, def: 2, spd: 5 },
    moves: ['Scratch', 'Leaf Toss', 'Tail Swish', 'Little Smash'], learn: { 'Little Smash': 8 },
    evolve: { lv: 16, to: 'hammerfox' },
    blurb: ['FOXLET, a GRASS-type fox.', 'At Lv 16 it becomes HAMMERFOX, GRASS and FIGHTING!'],
  },
  hammerfox: {
    name: 'HAMMERFOX', types: ['GRASS', 'FIGHTING'], catchRate: 0.15,
    b: { hp: 17, atk: 11, def: 6, spd: 7 },
    moves: ['Leaf Toss', 'Tail Swish', 'Vine Whip', 'Hammer Smash'],
    evolve: { lv: 31, to: 'warfox' },
  },
  warfox: {
    name: 'WARFOX', types: ['GRASS', 'FIGHTING'], catchRate: 0.1,
    b: { hp: 20, atk: 14, def: 8, spd: 8 },
    moves: ['Vine Whip', 'Hammer Smash', 'Tail Swish', 'Axe Storm'],
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
    moves: ['Rock Toss', 'Steam Puff', 'Geyser', 'Rocket Blast'],
    evolve: { lv: 31, to: 'tricano' },
    appear: 'steamed up', exit: 'It hissed off in a cloud of steam.', exitAnim: 'hop',
  },
  tricano: {
    name: 'TRICANO', types: ['WATER'], flicker: 'wU', catchRate: 0.1,
    b: { hp: 26, atk: 12, def: 11, spd: 4 },
    moves: ['Geyser', 'Rocket Blast', 'Steam Puff', 'Steam Cannon'],
    appear: 'stomped up, steaming', exit: 'It stomped away in a cloud of steam.', exitAnim: 'hop',
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
    name: 'BLUEBIRD', types: ['FLYING'], catchRate: 0.55, hovers: true,
    b: { hp: 2, atk: 2, def: 0, spd: 6 },
    moves: ['Peck', 'Gust', 'Dive', 'Fluff Up'],
    evolve: { lv: 14, to: 'skyhawk' },
    appear: 'swooped in', exit: 'It flew off to rest in a tree.', exitAnim: 'fly',
  },
  skyhawk: {
    name: 'SKYHAWK', types: ['FLYING'], catchRate: 0.4, hovers: true,
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
    moves: ['Metal Bite', 'Iron Tackle', 'Growl', 'Steel Fang'],
    evolve: { lv: 34, to: 'ironhound' },
    appear: 'howled', exit: 'It howled and clanked away.', exitAnim: 'dash',
  },
  ironhound: {
    name: 'IRON HOUND', types: ['STEEL'], flicker: 'fF', catchRate: 0.1,
    b: { hp: 15, atk: 9, def: 9, spd: 8 },
    moves: ['Steel Fang', 'Iron Tackle', 'Flamethrower', 'Metal Burst'],
    appear: 'came hunting', exit: 'It sniffed the air and ran off on the hunt.', exitAnim: 'dash',
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
  zapcat: {
    name: 'ZAPCAT', types: ['ELECTRIC'], catchRate: 0.45,
    b: { hp: 6, atk: 3, def: 2, spd: 7 },
    moves: ['Scratch', 'Spark', 'Hiss', 'Pounce'],
    evolve: { lv: 17, to: 'darkzapcat' },
    appear: 'zipped out', exit: 'It zapped away in a flash.', exitAnim: 'dash',
  },
  darkzapcat: {
    name: 'DARK ZAPCAT', types: ['ELECTRIC'], catchRate: 0.3,
    b: { hp: 11, atk: 6, def: 4, spd: 10 },
    moves: ['Spark', 'Hiss', 'Pounce', 'Thunder Claw'],
    evolve: { lv: 30, to: 'demoncat' },
    appear: 'crackled out of the dark', exit: 'It flickered and vanished.', exitAnim: 'dash',
  },
  demoncat: {
    name: 'DEMON CAT', types: ['ELECTRIC'], catchRate: 0.12,
    b: { hp: 18, atk: 10, def: 6, spd: 12 },
    moves: ['Thunder Claw', 'Hiss', 'Pounce', 'Demon Bolt'],
    appear: 'descended in a storm', exit: 'It flew off in a crack of thunder.', exitAnim: 'fly',
  },
  volcanobun: {
    name: 'VOLCANO BUN', types: ['FIRE'], flicker: 'fF', catchRate: 0.35,
    b: { hp: 10, atk: 7, def: 6, spd: 6 },
    moves: ['Kick', 'Lava Hop', 'Hop', 'Ember Spit'],
    evolve: { lv: 45, to: 'magmabunny' },
    appear: 'hopped out of the ash', exit: 'It bounced away, puffing smoke.', exitAnim: 'hop',
  },
  magmabunny: {
    name: 'MAGMA BUNNY', types: ['FIRE'], flicker: 'fF', catchRate: 0.2,
    b: { hp: 16, atk: 11, def: 9, spd: 8 },
    moves: ['Lava Hop', 'Ember Spit', 'Hop', 'Magma Burst'],
    appear: 'oozed up from the lava', exit: 'It melted back into the lava.', exitAnim: 'hop',
  },
  ninjamonkey: {
    name: 'NINJA MONKEY', types: ['FIRE', 'FIGHTING'], flicker: 'fF', catchRate: 0.25,
    b: { hp: 12, atk: 9, def: 6, spd: 11 },
    moves: ['Flame Kick', 'Ninja Chop', 'Smoke Bomb', 'Scratch'],
    // The player picks which way it grows (wild ones pick at random).
    evolve: { lv: 47, choices: ['skyninja', 'zenninja'] },
    appear: 'flipped down from nowhere', exit: 'It vanished in a puff of smoke.', exitAnim: 'fly',
  },
  skyninja: {
    name: 'SKY NINJA', types: ['FIRE', 'FLYING'], flicker: 'fF', catchRate: 0.12,
    b: { hp: 18, atk: 14, def: 8, spd: 14 },
    moves: ['Flame Kick', 'Ninja Chop', 'Smoke Bomb', 'Golden Sword'],
    blurb: 'Flies on flaming wings with a giant golden sword.',
    appear: 'swooped down, sword first', exit: 'It flew off on flaming wings.', exitAnim: 'fly',
  },
  zenninja: {
    name: 'ZEN NINJA', types: ['FIRE', 'PSYCHIC'], flicker: 'fF', catchRate: 0.12, hovers: true,
    b: { hp: 20, atk: 13, def: 11, spd: 10 },
    moves: ['Flame Kick', 'Calm Mind', 'Smoke Bomb', 'Mind Blaze'],
    blurb: 'A slim golden psychic with goat horns that floats.',
    appear: 'floated in', exit: 'It closed its eyes and faded away.', exitAnim: 'fly',
  },
  psyraven: {
    name: 'PSYRAVEN', types: ['FLYING', 'PSYCHIC'], catchRate: 0.12, legendary: true, hovers: true,
    b: { hp: 20, atk: 10, def: 9, spd: 12 },
    moves: ['Stone Pierce', 'Psy Wing', 'Dark Caw', 'Razor Dive'],
    appear: 'swooped down from the tallest tree', exit: 'PSYRAVEN flew back up to its perch. It will be back!', exitAnim: 'fly',
  },
  stonebull: {
    name: 'STONE BULL', types: ['ROCK'], catchRate: 0.12, legendary: true,
    b: { hp: 28, atk: 12, def: 16, spd: 4 },
    moves: ['Horn Rockets', 'Ancient Stomp', 'Harden', 'Bull Charge'],
    appear: 'cracked out of its stone statue', exit: 'STONE BULL turned back into a statue. It will be back!', exitAnim: 'dash',
  },
  saberstag: {
    name: 'SABER STAG', types: ['GRASS'], catchRate: 0.12, legendary: true,
    b: { hp: 24, atk: 13, def: 11, spd: 10 },
    moves: ['Antler Ram', 'Saber Bite', 'Leaf Storm', 'Ancient Wisdom'],
    appear: 'stepped out of the ancient shrine', exit: 'SABER STAG vanished into the shrine. It will be back!', exitAnim: 'dash',
  },
  pyrolion: {
    name: 'PYROLION', types: ['FIRE', 'WATER'], flicker: 'fF', catchRate: 0.12, legendary: true,
    b: { hp: 30, atk: 16, def: 12, spd: 12 },
    moves: ['Flame Mane', 'Tidal Roar', 'Lion Roar', 'Inferno Pounce'],
    appear: 'roared out of the volcano', exit: 'PYROLION leapt back into the volcano. It will be back!', exitAnim: 'fly',
  },
  ironrex: {
    name: 'IRONREX', types: ['STEEL', 'FIRE'], flicker: 'fF', catchRate: 0.12, legendary: true,
    b: { hp: 32, atk: 17, def: 15, spd: 9 },
    moves: ['Smoke Glare', 'Horn Gore', 'Iron Jaws', 'Bone Quake'],
    appear: 'stomped out from behind the old bones', exit: 'IRONREX stomped back behind the bones. It will be back!', exitAnim: 'dash',
  },
  // ----- the prehistoric valley -----
  aquakylo: {
    name: 'AQUAKYLO', types: ['WATER'], catchRate: 0.3,
    b: { hp: 13, atk: 7, def: 10, spd: 3 },
    moves: ['Bubble Bumps', 'Tail Club', 'Shell Up', 'Stomp'],
    evolve: { lv: 56, to: 'brawlkylo' },
    blurb: 'An ankylosaurus whose back bumps and tail club are made of water.',
    appear: 'lumbered out of the ferns', exit: 'It thudded away, its tail club sloshing.', exitAnim: 'dash',
  },
  brawlkylo: {
    name: 'BRAWLKYLO', types: ['WATER'], catchRate: 0.15,
    b: { hp: 22, atk: 13, def: 14, spd: 4 },
    moves: ['Bubble Bumps', 'Tail Club', 'Shell Up', 'Super Smash'], signature: 'Super Smash',
    blurb: 'Stands on two legs. Its arms are tail clubs, and it still has a water tail.',
    appear: 'stood up on two legs', exit: 'It stomped off, swinging its club arms.', exitAnim: 'dash',
  },
  frostosaur: {
    name: 'FROSTOSAUR', types: ['ICE'], catchRate: 0.3,
    b: { hp: 12, atk: 9, def: 6, spd: 8 },
    moves: ['Ice Fang', 'Icicle Spikes', 'Frost Roar', 'Chomp'],
    evolve: { lv: 57, to: 'xenofrost' },
    blurb: 'An allosaurus with frozen icicles all along its back.',
    appear: 'crunched out of the frost', exit: 'It ran off, icicles clinking.', exitAnim: 'dash',
  },
  xenofrost: {
    name: 'XENOFROST', types: ['ICE'], catchRate: 0.15,
    b: { hp: 19, atk: 14, def: 9, spd: 11 },
    moves: ['Ice Fang', 'Four Claw Slash', 'Frost Roar', 'Roll Up'], signature: 'Roll Up',
    blurb: 'An alien-like ice dinosaur with four claws. It can roll up into a giant ball!',
    appear: 'uncurled from a ball of ice', exit: 'It rolled away into a ball of ice.', exitAnim: 'dash',
  },
  firespino: {
    name: 'FIRESPINO', types: ['FIRE'], flicker: 'fF', catchRate: 0.3,
    b: { hp: 13, atk: 10, def: 6, spd: 7 },
    moves: ['Fire Fang', 'Spine Slice', 'Hiss', 'Chomp'],
    evolve: { lv: 58, to: 'twinspino' },
    blurb: 'A spinosaurus whose spine is made of pure fire.',
    appear: 'burst out, spine blazing', exit: 'It stalked away, its spine still burning.', exitAnim: 'dash',
  },
  twinspino: {
    name: 'TWINSPINO', types: ['FIRE'], flicker: 'fF', catchRate: 0.12,
    b: { hp: 20, atk: 15, def: 9, spd: 9 },
    moves: ['Fire Fang', 'Chest Claws', 'Spine Slice', 'Flaming Beam'], signature: 'Flaming Beam',
    blurb: 'Has two horns of blue fire, two black legs and three long slashing claws.',
    appear: 'roared, its fire spine blazing', exit: 'It snorted fire as it left.', exitAnim: 'dash',
  },
};
export const STARTERS = ['blazepony', 'foxlet', 'splashcano'];

/* ---------------- encounters ---------------- */
// weights are relative. Meadow critters stay below Lv 10; mountain critters are all above Lv 10.
// Wild critters that are past their evolve level show up already evolved.
export const ENCOUNTERS = {
  north:    { min: 2,  max: 9,  table: [['rabbit', 45], ['bluebird', 32], ['fox', 12], ['zapcat', 8], ['splashcano', 3]] },
  south:    { min: 3,  max: 9,  table: [['fox', 45], ['bluebird', 22], ['rabbit', 22], ['zapcat', 8], ['splashcano', 3]] },
  mountain: { min: 11, max: 18, table: [['steeldog', 36], ['rockalock', 18], ['fox', 17], ['bluebird', 17], ['zapcat', 12]] },
  forest:   { min: 20, max: 30, table: [['komodo', 37], ['snapling', 37], ['fox', 13], ['zapcat', 10], ['hammerfox', 3]] },
  volcano:  { min: 40, max: 49, table: [['komodo', 32], ['volcanobun', 34], ['ninjamonkey', 26], ['zapcat', 8]] },   // Hammerfox is very rare
  prehistoric: { min: 52, max: 62, table: [['aquakylo', 30], ['frostosaur', 30], ['firespino', 30], ['zapcat', 10]] },
};
export const GATE_LEVEL = 10;   // a critter must be PAST this level to open the mountain gate
export const TEAM_MAX = 6;          // extra critters you catch go to your BOX (at home and in rest huts)

// XP after a fight: every critter on your team gets a share. Critters in the BOX get nothing.
export const XP_SHARE = {
  fought: 1.0,     // did damage this fight and is still standing
  watched: 0.75,   // on the team but didn't do damage
  knockedOut: 0.25 // ran out of energy during the fight
};
// Snacks heal this much of a critter's max HP, plus extra for every gym badge you hold.
export const SNACK_HEAL = { base: 0.4, perBadge: 0.1 };
// Max critter level: 25 to start, raised by each gym badge you hold.
export const LEVEL_CAP = { start: 25, maple: 25, pebble: 35, mossy: 50, ember: 65, fossil: 75 };
// One legendary per biome. `need`: a critter on your team must be this level to wake it. It fights at `lv`.
// It keeps coming back until you catch it.
export const LEGENDS = {
  psyraven:  { area: 'meadow',    lv: 15, need: 15, spot: 'the tallest tree',
    sleeping: ['A giant raven is perched at the very top of the tree.', 'It glares down at you... it looks way too strong.'],
    waking: 'The giant raven spreads its stone-hard wings!',
    gone: 'The tall tree is quiet now. PSYRAVEN is part of your adventure!' },
  stonebull: { area: 'mountains', lv: 25, need: 25, spot: 'the bull statue',
    sleeping: ['A stone bull, carved a thousand years ago by an ancient people.', 'Its eyes flicker... you feel it watching you.'],
    waking: 'The statue cracks... the STONE BULL is alive!',
    gone: 'Just a pedestal now. STONE BULL is part of your adventure!' },
  saberstag: { area: 'forest',    lv: 35, need: 35, spot: 'the ancient shrine',
    sleeping: ['An ancient mossy shrine. They say a deer here once', 'gave the old people of the forest their wisdom.'],
    waking: 'Antlers glow inside the shrine... SABER STAG appears!',
    gone: 'The shrine is still. SABER STAG is part of your adventure!' },
  pyrolion:  { area: 'volcano',   lv: 50, need: 50, spot: 'the big volcano',
    sleeping: ['The volcano rumbles... something HUGE is sleeping inside.'],
    waking: 'The ground shakes! Something is climbing out of the volcano!',
    gone: 'The volcano is quiet now. PYROLION is part of your adventure!' },
  ironrex:   { area: 'prehistoric', lv: 60, need: 60, spot: 'the T-rex bones',
    sleeping: ['Giant T-rex bones... and two eyes are burning inside the skull.', 'Smoke curls out of them. Something made of STEEL is watching you.'],
    waking: 'The bones rattle... a T-REX OF STEEL stomps out!',
    gone: 'Just old bones now. IRONREX is part of your adventure!' },
};
export const LEGEND_LEVEL = LEGENDS.pyrolion.need;

// MEGA POD: a much better pod. You get some the first time you beat each gym and each legendary.
// boost multiplies the catch chance of a normal POD. perWin: how many you get each time.
export const MEGA_POD = { boost: 2.5, perWin: 3 };

// RARE CANDY: you get one the first time you beat each gym and each legendary.
// levels: how many levels it gives. target: 'one' (pick a critter) or 'team' (everyone on your team).
// Ideas to try: { levels: 1, target: 'one' }, { levels: 1, target: 'team' }.
export const CANDY = { levels: 5, target: 'one' };

/* ---------------- the world ---------------- */
// Areas line up left to right, 32 tiles wide each. A town (if any) sits right below its area.
// To add the next area: add an entry here (kind: meadow | mountains | forest | volcano | prehistoric) and, if it has a town, a TOWNS entry.
export const AREAS = [
  { id: 'meadow', kind: 'meadow', name: 'MAPLE HILL', town: 'sprout' },
  { id: 'mountains', kind: 'mountains', name: 'ROCKY MOUNTAINS', encounters: 'mountain', town: 'pebble',
    gate: { level: GATE_LEVEL }, gateSign: ['ROCKY MOUNTAINS, this way!', `Only teams with a critter past Lv ${GATE_LEVEL} may pass the gate.`],
    welcome: ['Welcome to the ROCKY MOUNTAINS!', 'Every critter up here is above Lv 10. PEBBLE TOWN is down the south trail.'] },
  { id: 'forest', kind: 'forest', name: 'WHISPER FOREST', encounters: 'forest', town: 'mossy',
    gate: { badge: 'pebble' }, gateSign: ['WHISPER FOREST, this way!', 'Only trainers with the BOULDER BADGE may enter.'],
    welcome: ['Welcome to WHISPER FOREST!', 'Critters here are Lv 20 to 30. MOSSY HOLLOW is down the south trail.'] },
  { id: 'volcano', kind: 'volcano', name: 'THE VOLCANO', encounters: 'volcano', town: 'ember',
    gate: { badge: 'mossy' }, gateSign: ['THE VOLCANO, this way! It is HOT.', 'Only trainers with the GROVE BADGE may enter.'],
    welcome: ['Welcome to THE VOLCANO!', `Critters here are Lv 40 to 49. Something BIG sleeps in the center...`] },
  { id: 'prehistoric', kind: 'prehistoric', name: 'PREHISTORIC VALLEY', encounters: 'prehistoric', town: 'fossil',
    gate: { badge: 'ember' }, gateSign: ['PREHISTORIC VALLEY, this way!', 'Only trainers with the EMBER BADGE may enter.'],
    welcome: ['Welcome to the PREHISTORIC VALLEY!', 'Dinosaur critters, Lv 52 to 62. Giant bones lie in the middle...'] },
];
// Every town has a healing hut, a blue SHINY TRADER and (if `gym` is set) a gym. A town with no gym yet shows a "coming soon" sign.
// restRoof: red | blue | green | straw    gymStyle: maple | stone | wood | ember
export const TOWNS = {
  sprout: { name: 'SPROUT VILLAGE', tagline: 'A little village for brand-new trainers.', rest: 'HEALING HUT', restRoof: 'green', gym: 'maple', gymStyle: 'maple',
    welcome: ['Welcome to SPROUT VILLAGE!', 'Healing hut, shiny trader, and a gym for new trainers.'] },
  pebble: { name: 'PEBBLE TOWN', tagline: 'Where the bunnies are LOVED.', rest: 'REST STOP', restRoof: 'green', gym: 'pebble', gymStyle: 'stone', statue: 'stonebull',
    welcome: ['Welcome to PEBBLE TOWN!', 'The blue house is the SHINY TRADER. The big stone hall is the GYM.'] },
  mossy: { name: 'MOSSY HOLLOW', tagline: 'A sleepy town under the big trees.', rest: 'HEALING HUT', restRoof: 'straw', gym: 'mossy', gymStyle: 'wood',
    welcome: ['Welcome to MOSSY HOLLOW!', 'The straw hut is the HEALING HUT. The wooden hall is the GYM.'] },
  ember: { name: 'EMBER TOWN', tagline: 'Hot springs, hot tempers, hot critters.', rest: 'HEALING HUT', restRoof: 'straw', gym: 'ember', gymStyle: 'ember',
    welcome: ['Welcome to EMBER TOWN!', 'The black stone hall is the FIRE GYM. Bring water!'] },
  fossil: { name: 'FOSSIL CAMP', tagline: 'Diggers, bones and BIG footprints.', rest: 'HEALING HUT', restRoof: 'straw', gym: 'fossil', gymStyle: 'fossil',
    welcome: ['Welcome to FOSSIL CAMP!', 'The sandy hall with the bone on top is the DINO GYM.'] },
};

/* ---------------- shinies ---------------- */
// Shinies are regular critters in an exotic color, and they hit harder (see SHINY_ATTACK_BONUS).
// Two ways to get one:
//   1. Find one in the wild: about 1 in `oneIn` wild critters of that family is shiny.
//   2. Pebble Town's SHINY TRADER: trade 3 plain critters of the same family, get 1 shiny of that family.
// Every critter in a family counts: 3 bunnies can be any mix of RABBIT and MEGABUN.
export const SHINY_TRADE_COST = 3;
export const SHINY_ATTACK_BONUS = 1.25;   // shinies have 25% more attack
export const FAMILY = {
  rabbit: 'rabbit', megabun: 'rabbit',
  bluebird: 'bluebird', skyhawk: 'bluebird',
  fox: 'fox', elderfox: 'fox',
  steeldog: 'steeldog', steelwolf: 'steeldog', ironhound: 'steeldog',
  rockalock: 'rockalock',
  splashcano: 'splashcano', boomcano: 'splashcano', tricano: 'splashcano',
  komodo: 'komodo', darkkomodo: 'komodo',
  snapling: 'snapling', treetitan: 'snapling',
  zapcat: 'zapcat', darkzapcat: 'zapcat', demoncat: 'zapcat',
  volcanobun: 'volcanobun', magmabunny: 'volcanobun',
  ninjamonkey: 'ninjamonkey', skyninja: 'ninjamonkey', zenninja: 'ninjamonkey',
  aquakylo: 'aquakylo', brawlkylo: 'aquakylo',
  frostosaur: 'frostosaur', xenofrost: 'frostosaur',
  firespino: 'firespino', twinspino: 'firespino',
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
  zapcat:     { oneIn: 100, hue: 170 },                 // ice-blue cat
  volcanobun: { oneIn: 100, hue: 200 },                 // blue-flame bunny
  ninjamonkey:{ oneIn: 120, hue: 160 },                 // teal ninja with blue flames
  aquakylo:   { oneIn: 120, hue: 140 },                 // purple armor, green water
  frostosaur: { oneIn: 120, hue: 150, sat: 1.3 },       // pink ice
  firespino:  { oneIn: 120, hue: 190 },                 // blue fire spine
};
export const SHINY_ORDER = ['fox', 'rabbit', 'bluebird', 'splashcano', 'steeldog', 'rockalock', 'komodo', 'snapling', 'zapcat', 'volcanobun', 'ninjamonkey', 'aquakylo', 'frostosaur', 'firespino'];

/* ---------------- gyms ---------------- */
export const GYMS = {
  maple: {
    leader: 'LEADER HAZEL', short: 'HAZEL', look: 'hazel', hall: 'MAPLE GYM', banner: '#e8742c',
    team: [['rabbit', 8], ['bluebird', 9], ['fox', 10]],
    badge: 'SPROUT BADGE', xpMultiplier: 2, teamPrize: 30,
    intro: ['"Hi! I\'m HAZEL, the MAPLE GYM leader."', '"I train meadow critters: a RABBIT, a BLUEBIRD and a FOX."', '"Show me what you and your partner can do!"'],
  },
  pebble: {
    leader: 'LEADER BRICK', short: 'BRICK', look: 'brick', hall: 'PEBBLE GYM', banner: '#c0443a',
    team: [['steeldog', 15], ['rockalock', 20]],
    badge: 'BOULDER BADGE', xpMultiplier: 2, teamPrize: 50,
    intro: ['"Welcome to the PEBBLE GYM!"', '"My critters are as tough as rocks!"', '"First a Lv 15 STEEL DOG, then my Lv 20 ROCKALOCK!"'],
  },
  mossy: {
    leader: 'LEADER IVY', short: 'IVY', look: 'ivy', hall: 'MOSSY GYM', banner: '#3f7a3c',
    team: [['treetitan', 25], ['darkkomodo', 28], ['hammerfox', 30]],
    badge: 'GROVE BADGE', xpMultiplier: 2, teamPrize: 80,
    intro: ['"Welcome to the MOSSY GYM! I\'m IVY."', '"I have a Lv 25 TREE TITAN and a Lv 28 DARK KOMODO..."', '"...and my best friend, a Lv 30 HAMMERFOX!"'],
  },
  ember: {
    leader: 'LEADER PYRA', short: 'PYRA', look: 'pyra', hall: 'FIRE GYM', banner: '#e2392b',
    team: [['magmabunny', 46], ['ironhound', 48], ['ninjamonkey', 49], ['twinblaze', 50]],
    badge: 'EMBER BADGE', xpMultiplier: 2, teamPrize: 120,
    intro: ['"I\'m PYRA, and this is the FIRE GYM!"', '"MAGMA BUNNY Lv 46, IRON HOUND Lv 48, NINJA MONKEY Lv 49..."', '"...and my TWINBLAZE at Lv 50. Hope you brought water!"'],
  },
  fossil: {
    leader: 'LEADER DIGGS', short: 'DIGGS', look: 'diggs', hall: 'DINO GYM', banner: '#a8995f',
    team: [['aquakylo', 53], ['frostosaur', 54], ['firespino', 55], ['xenofrost', 57]],
    badge: 'FOSSIL BADGE', xpMultiplier: 2, teamPrize: 150,
    intro: ['"I\'m DIGGS! I dig up dinosaurs... and then I TRAIN them!"', '"AQUAKYLO Lv 53, FROSTOSAUR Lv 54, FIRESPINO Lv 55..."', '"...and my XENOFROST at Lv 57. Ready to go prehistoric?"'],
  },
};

/* ---------------- trainers ---------------- */
// Two trainers stand in every area. Walk up to one and press A to battle.
// x, y: their spot inside the area (0-31 across, 0-23 down). look: their sprite in art.js (LEADER_ART).
// prize: what they give you the first time you beat them. After that they just chat.
export const TRAINERS = {
  timmy: { area: 'meadow', x: 24, y: 8, leader: 'BUG KID TIMMY', short: 'TIMMY', look: 'bugkid',
    team: [['rabbit', 5], ['bluebird', 6]], prize: ['pod', 2],
    hello: ['"Hey! I caught these in the tall grass!"'], win: '"Aww, my bugs... I mean critters!"', after: '"I\'m gonna catch a SHINY one day!"' },
  rose: { area: 'meadow', x: 14, y: 12, leader: 'PICNIC GIRL ROSE', short: 'ROSE', look: 'picnic',
    team: [['fox', 6], ['rabbit', 7], ['bluebird', 7]], prize: ['snack', 2],
    hello: ['"Want to battle before lunch?"'], win: '"You win! Have some of my snacks."', after: '"Picnics are better with critters."' },
  dan: { area: 'mountains', x: 8, y: 10, leader: 'HIKER DAN', short: 'DAN', look: 'hiker',
    team: [['rockalock', 14], ['steeldog', 15]], prize: ['pod', 3],
    hello: ['"I climbed all the way up here to find tough critters!"'], win: '"Whoa! You\'re tougher than a mountain!"', after: '"Mind the rockslides!"' },
  skye: { area: 'mountains', x: 16, y: 13, leader: 'CLIMBER SKYE', short: 'SKYE', look: 'climber',
    team: [['skyhawk', 15], ['zapcat', 15]], prize: ['snack', 2],
    hello: ['"Up here, the birds and I rule the sky!"'], win: '"You knocked me right off the cliff!"', after: '"Skyhawks love the mountain wind."' },
  joe: { area: 'forest', x: 9, y: 10, leader: 'CAMPER JOE', short: 'JOE', look: 'camper',
    team: [['snapling', 22], ['komodo', 24]], prize: ['pod', 3],
    hello: ['"Shh! You\'ll wake the forest... let\'s battle anyway!"'], win: '"Time to roast marshmallows and think about that."', after: '"Snaplings bite. Don\'t ask how I know."' },
  may: { area: 'forest', x: 16, y: 16, leader: 'RANGER MAY', short: 'MAY', look: 'ranger',
    team: [['elderfox', 25], ['treetitan', 27]], prize: ['snack', 3],
    hello: ['"I protect this forest. Show me you\'re strong enough to explore it!"'], win: '"You can explore any part of my forest."', after: '"Be kind to the critters out here."' },
  blaze: { area: 'volcano', x: 6, y: 8, leader: 'FIRE DANCER BLAZE', short: 'BLAZE', look: 'firedancer',
    team: [['volcanobun', 42], ['darkkomodo', 44]], prize: ['pod', 4],
    hello: ['"Watch me dance with FIRE!"'], win: '"My flames went out!"', after: '"Lava is warm and cozy... from far away."' },
  kai: { area: 'volcano', x: 14, y: 18, leader: 'NINJA KAI', short: 'KAI', look: 'ninja',
    team: [['ninjamonkey', 44], ['demoncat', 45]], prize: ['snack', 3],
    hello: ['"...You saw me? Nobody sees a ninja!"'], win: '"Poof! I mean... ouch."', after: '"A ninja never tells his secrets."' },
  ada: { area: 'prehistoric', x: 24, y: 8, leader: 'SCIENTIST ADA', short: 'ADA', look: 'scientist',
    team: [['aquakylo', 54], ['frostosaur', 55]], prize: ['pod', 5],
    hello: ['"I\'m studying dinosaur critters. Let\'s test them in battle!"'], win: '"Amazing data! You win!"', after: '"These bones are millions of years old!"' },
  oog: { area: 'prehistoric', x: 13, y: 17, leader: 'CAVE KID OOG', short: 'OOG', look: 'cavekid',
    team: [['firespino', 55], ['brawlkylo', 57]], prize: ['snack', 4],
    hello: ['"OOG! OOG BATTLE YOU!"'], win: '"Oog... lose. You strong."', after: '"Oog like dinosaur. Dinosaur like Oog."' },
};

/* ---------------- your rival ---------------- */
// Right after you win a gym badge, your rival MAX shows up and battles you.
// MAX always picks the starter that beats yours (counters). 'STARTER' in a team = MAX's starter, grown to that level.
// If you lose, MAX waits outside that gym (with a "!") for a rematch.
export const RIVAL = {
  leader: 'RIVAL MAX', short: 'MAX', look: 'rival',
  counters: { blazepony: 'splashcano', foxlet: 'blazepony', splashcano: 'foxlet' },
  teams: {
    maple:  [['bluebird', 9], ['STARTER', 12]],
    pebble: [['skyhawk', 19], ['zapcat', 19], ['STARTER', 22]],
    mossy:  [['skyhawk', 29], ['darkzapcat', 29], ['steelwolf', 30], ['STARTER', 32]],
    ember:  [['demoncat', 49], ['ironhound', 50], ['darkkomodo', 49], ['STARTER', 52]],
    fossil: [['demoncat', 58], ['ironhound', 58], ['xenofrost', 59], ['twinspino', 59], ['STARTER', 61]],
  },
  hello: ['"Hey! Wait up!"', '"So you beat the gym, huh? Big deal."', '"Let\'s see how strong you REALLY are!"'],
  rematch: ['"Back for more? Let\'s GO!"'],
  taunt: '"Ha! Told you I\'m the best! I\'ll wait right here for a rematch."',
  win: '"WHAT?! ...Fine. You got lucky. I\'m gonna train SO hard!"',
  prize: ['pod', 3],
  xpMultiplier: 2,
};

/* ---------------- critter helpers ---------------- */
export const xpNeed = lv => 10 + lv * 4;
export function applyStats(c) {
  const b = SPECIES[c.sp].b, old = c.maxHp;
  c.maxHp = b.hp + c.lv * 3;
  c.atk = Math.round((b.atk + c.lv) * (c.shiny ? SHINY_ATTACK_BONUS : 1));
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
// Where an evolution goes: a fixed form, or (for choices) the player's pick / a random one in the wild.
export const evolveTarget = (sp, pick) => {
  const e = SPECIES[sp].evolve;
  return e.choices ? (pick || e.choices[Math.floor(Math.random() * e.choices.length)]) : e.to;
};
export function grownForm(sp, lv) {
  let s = sp;
  while (SPECIES[s].evolve && lv >= SPECIES[s].evolve.lv) s = evolveTarget(s);
  return s;
}
