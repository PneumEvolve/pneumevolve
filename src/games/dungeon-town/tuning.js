// Tuning: every number and stat in the game. Tweak freely.

export const TILE = 48;

export const COLS = 20, ROWS = 13, RW = COLS * TILE, RH = ROWS * TILE;      // dungeon room

export const TCOLS = 24, TROWS = 16, TW = TCOLS * TILE, TH = TROWS * TILE;  // town

// ===================================================================
//  TUNING
// ===================================================================
export const T = {
  heroSpeed: 235, heroHp: 5, iframes: 0.8,
  dashSpeed: 780, dashTime: 0.15, dashCd: 0.9,
  ammoMax: 3, reloadTime: 0.7, gunCd: 0.16, bulletSpeed: 950, bulletRange: 560, gunDmg: 2, gunKb: 200,
  twinFireRate: 0.24, twinDmg: 1,
  meleeRange: 78, meleeHalfArc: 0.95, swordDmg: 3, swordCd: 0.5, swordKb: 480,
  autoRange: 560,
  houndBiteCd: 1.1, houndBiteRange: 50, houndBiteDmg: 1,
  pounceCd: 6, pounceDist: 240, pounceAuto: 420, pounceRadius: 75, pounceDmg: 3, pounceStun: 1.3,
  howlCd: 8, howlRadius: 190, howlKb: 650, howlStun: 0.7,
  crowZapCd: 1.6, crowZapRange: 250, crowZapDmg: 1,
  chainCd: 7, chainCount: 4, chainJump: 170, chainDmg: 2, chainStun: 1.0,
  cagesPerRun: 2, cageTime: 3, cageHp: 4, captureRange: 320, weakTime: 8,
  rooms: 10, extractRooms: [2, 4, 6, 8, 10], bossRooms: [5, 10],
  petIframes: 0.7, staticCd: 5, staticRange: 260,
  // town
  runsPerDay: 1,
  nightBase: 90, nightPerDay: 10, nightMax: 180,
  genLossPct: 0.25, storehouseProtects: 50, farmScrap: 20, medkitCost: 20, stashBase: 3, stashPerStorehouse: 5,
  medkitHeal: 2, treatHeal: 2, lureTime: 6, lureRange: 320,
  respawnTime: 4,
};

export const E = {
  walker:  { hp: 6, speed: 75, windupRange: 70, windup: 0.45, lunge: 430, lungeT: 0.18, recover: 0.55, dmg: 1, scrap: [1, 2] },
  runner:  { hp: 3, speed: 150, windupRange: 60, windup: 0.3, lunge: 520, lungeT: 0.14, recover: 0.4, dmg: 1, scrap: [1, 1] },
  spitter: { hp: 5, speed: 70, keep: 240, fireCd: 2.4, windup: 0.55, spitSpeed: 270, dmg: 1, scrap: [1, 3] },
  brute:   { hp: 18, speed: 48, windupRange: 95, windup: 0.8, slamRange: 108, slamArc: 1.0, recover: 1.1, turn: 1.8, dmg: 2, scrap: [4, 6] },
  crawler: { hp: 5, speed: 120, biteR: 52, dmg: 1, scrap: [1, 2] },
  shrieker: { hp: 5, speed: 65, keep: 300, screamCd: 5, windup: 0.8, screamR: 230, scrap: [2, 3] },
  mother:  { hp: 60, speed: 28, dmg: 1, spawnCd: 5, volleyCd: 3.2, scrap: [12, 16] },
  bloater: { hp: 4, speed: 58, fuseRange: 45, fuse: 0.7, deathFuse: 0.35, boomR: 90, dmg: 2, scrap: [1, 2] },
  // bandits: they stand guard until you get close, then shout and come for you
  rifleman: { hp: 6, speed: 85, keep: 260, fireCd: 1.9, windup: 0.45, spitSpeed: 470, dmg: 1, scrap: [2, 3], tex: 'bbullet', bandit: true },
  bruiser: { hp: 11, speed: 115, windupRange: 75, windup: 0.4, lunge: 520, lungeT: 0.18, recover: 0.5, dmg: 1, scrap: [2, 4], bandit: true },
  // camp structures (don't move)
  bturret: { hp: 10, struct: true, range: 290, rate: 1.4, shotSpeed: 480, scrap: [3, 5] },
  radio: { hp: 30, struct: true, scrap: [4, 6] },
};

export const ROOM_WAVES = {
  1: [['walker', 'walker', 'walker'], ['walker', 'walker', 'runner', 'runner']],
  2: [['walker', 'walker', 'spitter', 'walker'], ['runner', 'runner', 'runner', 'bloater']],
  3: [['walker', 'spitter', 'spitter', 'bloater'], ['brute', 'runner', 'runner']],
  4: [['spitter', 'spitter', 'runner', 'runner', 'runner'], ['brute', 'bloater', 'bloater', 'walker', 'walker']],
  5: [['brute', 'walker', 'walker', 'walker'], ['brute', 'spitter', 'spitter', 'runner', 'runner', 'runner']],
};

// Town Hall levels: building points + scrap cost to reach
export const TL = [
  null,
  { mil: 10, civ: 10, cost: 0, gen: 30 },
  { mil: 16, civ: 14, cost: 100, gen: 40 },
  { mil: 24, civ: 18, cost: 250, gen: 50 },
  { mil: 32, civ: 22, cost: 500, gen: 60 },
  { mil: 42, civ: 26, cost: 900, gen: 70 },
];

// Buildings. pathCost = how much zombies avoid it (they break through solid ones).
export const BLD = {
  wall:       { name: 'Wall', cat: 'mil', cost: 1, hp: 14, pathCost: 12, solid: true, desc: 'Zombies have to break it to get through.' },
  gate:       { name: 'Gate', cat: 'mil', cost: 2, hp: 14, pathCost: 12, solid: true, gate: true, desc: 'A wall you can walk through. Zombies can\'t.' },
  wire:       { name: 'Wire', cat: 'mil', cost: 1, pathCost: 3, desc: 'Barbed wire. Slows zombies walking through.' },
  spikes:     { name: 'Spikes', cat: 'mil', cost: 2, pathCost: 3, desc: 'Hurts zombies that walk over it.' },
  guard:      { name: 'Guard Post', cat: 'mil', cost: 3, hp: 14, pathCost: 30, solid: true, desc: 'Give it a creature (as a job). At night it defends this spot.' },
  turret:     { name: 'Turret', cat: 'mil', cost: 4, upg: [4, 6, 9], hp: 12, pathCost: 30, solid: true, desc: 'Shoots the nearest zombie. Upgrade: 4 → 6 → 9 pts.' },
  workbench:  { name: 'Workbench', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, desc: 'Builds a Cage or Noise Lure every morning. Walk up to it to switch.' },
  kitchen:    { name: 'Kitchen', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, desc: 'Cooks a Med Kit or Pet Treat every morning for 20 scrap. Walk up to it to switch.' },
  farm:       { name: 'Farm', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: '+20 scrap every morning.' },
  storehouse: { name: 'Storehouse', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: 'Protects 50 scrap if the generator falls.' },
};

export const TURRET = [null, { range: 230, dmg: 1, rate: 0.75 }, { range: 255, dmg: 2, rate: 0.6 }, { range: 285, dmg: 2, rate: 0.38 }];

// Creatures: one active (button) + one passive (always on while in your squad)
export const SP = {
  hound:  { name: 'Scrap Hound', hearts: 3, speed: 270, fly: false, attack: 'melee', dmg: 1, cd: 1.1, range: 50, body: [10, 15, 17], wildHp: 8,
            active: 'pounce', activeName: 'POUNCE', cdMax: 6, aim: true, activeDesc: 'Leaps in and stuns a group',
            passive: 'pack', passiveName: 'Pack Leader', passiveDesc: '+1 damage on every pet attack',
            activeRanks: ["Leap in for 3 dmg and stun a group", "Bigger landing zone, +1 damage", "Longer stun, cooldown -1.5s"], passiveRanks: ["Every pet attack does +1 damage", "Pets also attack 15% faster", "Every pet attack does +2 damage"] },
  crow:   { name: 'Spark Crow', hearts: 2, fly: true, attack: 'zap', dmg: 1, cd: 1.6, range: 250, body: [9, 15, 15], wildHp: 8,
            active: 'zap', activeName: 'ZAP', cdMax: 7, activeDesc: 'Chain lightning that stuns',
            passive: 'static', passiveName: 'Static', passiveDesc: 'You zap a nearby zombie every 5s',
            activeRanks: ["Chain lightning hits up to 4 zombies", "Chain hits up to 6", "+1 damage, cooldown -1.5s"], passiveRanks: ["You zap a zombie every 5s", "Every 3.5s", "Every 2.5s, and zaps do 2 damage"] },
  rat:    { name: 'Rust Rat', hearts: 2, speed: 300, fly: false, attack: 'melee', dmg: 1, cd: 0.8, range: 44, body: [10, 17, 20], wildHp: 6,
            active: 'swarm', activeName: 'SWARM', cdMax: 8, aim: true, activeDesc: '3 ratlings nibble and pull zombies off you',
            passive: 'scavenge', passiveName: 'Scavenger', passiveDesc: '25% chance for double scrap',
            activeRanks: ["3 ratlings for 5s pull zombies off you", "5 ratlings", "Ratlings last 8s, cooldown -2s"], passiveRanks: ["25% chance for double scrap", "40% chance", "60% chance"] },
  moth:   { name: 'Mender Moth', hearts: 2, fly: true, attack: 'none', body: [10, 14, 14], wildHp: 6,
            active: 'mend', activeName: 'MEND', cdMax: 10, activeDesc: '+1 heart to you and every pet',
            passive: 'nurse', passiveName: 'Nurse', passiveDesc: 'Bench pets heal 2 hearts per room',
            activeRanks: ["+1 heart to you and every pet", "+2 hearts to everyone", "Cooldown -3s"], passiveRanks: ["Bench pets heal 2 hearts per room", "Bench pets heal 3 per room", "Bench pets fully heal; active pets +1 per room"] },
  beetle: { name: 'Rust Beetle', hearts: 4, speed: 150, fly: false, attack: 'melee', dmg: 1, cd: 1.4, range: 52, body: [14, 10, 12], wildHp: 12,
            active: 'shell', activeName: 'SHELL', cdMax: 9, activeDesc: 'Pulls zombies onto it; can\'t be hurt for 3s',
            passive: 'tough', passiveName: 'Hard Shell', passiveDesc: '+1 max heart for you',
            activeRanks: ["Pulls zombies onto it, unhurtable for 3s", "Lasts 4.5s", "Also heals itself 1, cooldown -2s"], passiveRanks: ["You get +1 max heart", "+2 max hearts", "+3 max hearts"] },
};

SP.mole = { name: 'Tunnel Mole', hearts: 3, speed: 230, fly: false, attack: 'melee', dmg: 1, cd: 1.0, range: 48, body: [11, 13, 18], wildHp: 9,
  active: 'dig', activeName: 'DIG', cdMax: 8, aim: true, activeDesc: 'Burrows to a spot and erupts',
  passive: 'engineer', passiveName: 'Engineer', passiveDesc: 'Your buildings get +50% HP at night',
  activeRanks: ['Burrows over and erupts: 3 dmg + stun', '+1 damage, bigger blast', 'Longer stun, cooldown -2s'],
  passiveRanks: ['Buildings +50% HP at night', '+100% HP at night', '+150% HP at night'] };

SP.bat = { name: 'Pipe Bat', hearts: 2, fly: true, attack: 'zap', boltColor: 0xb48cff, dmg: 1, cd: 1.3, range: 200, body: [9, 15, 14], wildHp: 7,
  active: 'screech', activeName: 'SCREECH', cdMax: 9, activeDesc: 'Stuns zombies around you, digs out crawlers',
  passive: 'swift', passiveName: 'Swift Wings', passiveDesc: 'Pet ability cooldowns 15% shorter',
  activeRanks: ['Stuns zombies within 160 for 1.5s, digs out crawlers', 'Radius 220', 'Stun 2.5s, cooldown -2s'],
  passiveRanks: ['Pet cooldowns -15%', '-25%', '-35%'] };

// where wild creatures live in the ruins (room range)
export const WILD = { rat: [1, 6], crow: [2, 5], beetle: [3, 8], hound: [4, 9], moth: [6, 10] };

export const FIRST_CATCH = { 1: 'rat', 2: 'crow', 3: 'beetle', 6: 'moth' }; // guaranteed until you own one

export const WILD_SUB = { mole: [1, 7], crow: [2, 6], bat: [3, 10] };

export const FIRST_SUB = { 2: 'mole', 4: 'bat' };

export const MIL_ITEMS = ['wall', 'gate', 'wire', 'spikes', 'turret', 'guard'];

export const CIV_ITEMS = ['workbench', 'kitchen', 'farm', 'storehouse'];

// what each production building makes (set per building)
export const RECIPES = { kitchen: ['medkit', 'treat'], workbench: ['cage', 'lure'] };

export const recipeOf = (b) => (RECIPES[b.t] ? (RECIPES[b.t].includes(b.rcp) ? b.rcp : RECIPES[b.t][0]) : null);

export const XP = { walker: 2, runner: 2, spitter: 3, bloater: 3, brute: 8, crawler: 3, shrieker: 4, boss: 30, rifleman: 4, bruiser: 4, bturret: 5, radio: 12 };

export const PERKS = { tough: ['Tough', '+1 max heart'], quick: ['Quickdraw', '+1 ammo, reload 25% faster'], blade: ['Blademaster', '+1 sword damage'], gunner: ['Gunner', '+1 gun damage'], fleet: ['Fleet', 'Dash recharges 30% faster'] };

// ---- jobs: one worker per Workbench / Kitchen / Farm / Storehouse / Turret
export const JOB_SITES = ['workbench', 'kitchen', 'farm', 'storehouse', 'turret', 'guard'];

export const FAV = { workbench: 'hound', kitchen: 'moth', farm: 'beetle', storehouse: 'rat', turret: 'crow', guard: 'mole' };

export const JOB_DESC = {
  workbench: ['Builds 2 items each morning', 'Builds 3 items each morning'],
  kitchen: ['Cooks 2 items each morning', 'Cooks 3 items each morning'],
  farm: ['+10 more scrap each morning', '+20 more scrap each morning'],
  storehouse: ['protects 50 more scrap', 'protects 100 more scrap'],
  turret: ['+1 turret damage', '+1 damage and fires 25% faster'],
  guard: ['Defends the post at night', 'Defends the post at night with +2 hearts'],
};

// ---- items: the town makes them each morning into your stash
export const ITEMS = { cage: 'Cage', medkit: 'Med Kit', treat: 'Pet Treat', lure: 'Noise Lure' };

export const SP_COLOR = { hound: 0xe08a3c, crow: 0x5fd3ff, rat: 0xb0b8c0, moth: 0xf2d14b, beetle: 0xd0392b, mole: 0x9c6b3e, bat: 0xb48cff };