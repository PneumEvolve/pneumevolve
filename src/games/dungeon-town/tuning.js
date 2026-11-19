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
  genLossPct: 0.25, storehouseProtects: 50, farmScrap: 20, farmFood: 6, salvageParts: 3, stashBase: 5, stashPerStorehouse: 5,
  labRate: 12, labLeave: 3, kitchenSeats: 4, seatsPerLvl: 2,
  looterChance: 0.35, crateParts: 0.4, civUpg: [0, 6, 14],
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
  // hospital
  patient: { hp: 3, speed: 135, windupRange: 55, windup: 0.3, lunge: 480, lungeT: 0.14, recover: 0.45, dmg: 1, scrap: [1, 1] },
  gasser:  { hp: 5, speed: 66, windupRange: 65, windup: 0.5, lunge: 380, lungeT: 0.18, recover: 0.6, dmg: 1, scrap: [1, 2] },
  zero:    { hp: 60, speed: 52, dmg: 1, callCd: 6, coughCd: 5, scrap: [14, 18] },
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
  workbench:  { name: 'Workbench', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, desc: 'Turns Parts into Cages, Noise Lures or Turret Ammo every morning.' },
  kitchen:    { name: 'Kitchen', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, desc: 'Turns Food into Med Kits or Pet Treats every morning.' },
  farm:       { name: 'Farm', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: 'Grows 20 scrap or 6 Food every morning.' },
  storehouse: { name: 'Storehouse', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: '+5 stash room, and protects 50 scrap if the generator falls.' },
  lab:        { name: 'Lab', cat: 'civ', cost: 4, hp: 16, pathCost: 30, solid: true, desc: 'Studies creatures for the cure. Each fed morning a creature spends 1 level to add 12% to its species. Level 10 → 1 = 100%.' },
  salvage:    { name: 'Salvage Yard', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, desc: 'Strips junk into 3 Parts every morning.' },
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
            active: 'mend', activeName: 'MEND', cdMax: 20, activeDesc: '+1 heart to you and every pet (once per dungeon room)',
            passive: 'nurse', passiveName: 'Nurse', passiveDesc: 'Bench pets heal 1 heart per room',
            activeRanks: ["+1 heart to everyone, once per dungeon room", "+2 hearts to everyone", "Twice per dungeon room"], passiveRanks: ["Bench pets heal 1 heart per room", "Bench pets heal 2 per room", "Bench pets heal 3; active pets +1 per room"] },
  beetle: { name: 'Rust Beetle', hearts: 4, speed: 150, fly: false, attack: 'melee', dmg: 1, cd: 1.4, range: 52, body: [14, 10, 12], wildHp: 12,
            active: 'shell', activeName: 'SHELL', cdMax: 12, activeDesc: 'Pulls zombies onto it; can\'t be hurt for 3s',
            passive: 'tough', passiveName: 'Hard Shell', passiveDesc: '+1 max heart for you',
            activeRanks: ["Pulls zombies onto it, unhurtable for 3s", "Lasts 4.5s", "Also heals itself 1, cooldown -2s"], passiveRanks: ["You get +1 max heart", "Still +1 max heart; the beetle gets +1 heart", "+2 max hearts for you"] },
};

SP.mole = { name: 'Tunnel Mole', hearts: 3, speed: 230, fly: false, attack: 'melee', dmg: 1, cd: 1.0, range: 48, body: [11, 13, 18], wildHp: 9,
  active: 'dig', activeName: 'DIG', cdMax: 8, aim: true, activeDesc: 'Burrows to a spot and erupts',
  passive: 'sniffer', passiveName: 'Scrap Sniffer', passiveDesc: 'Sniffs out a buried stash in every dungeon room and camp',
  activeRanks: ['Burrows over and erupts: 3 dmg + stun', '+1 damage, bigger blast', 'Longer stun, cooldown -2s'],
  passiveRanks: ['A buried stash each room: 4–6 scrap', 'Bigger stashes: 7–10 scrap', 'Stashes can hold a Cage or Med Kit'] };

SP.bat = { name: 'Pipe Bat', hearts: 2, fly: true, attack: 'zap', boltColor: 0xb48cff, dmg: 1, cd: 1.3, range: 200, body: [9, 15, 14], wildHp: 7,
  active: 'screech', activeName: 'SCREECH', cdMax: 9, activeDesc: 'Stuns zombies around you, digs out crawlers',
  passive: 'swift', passiveName: 'Swift Wings', passiveDesc: 'Pet ability cooldowns 15% shorter',
  activeRanks: ['Stuns zombies within 160 for 1.5s, digs out crawlers', 'Radius 220', 'Stun 2.5s, cooldown -2s'],
  passiveRanks: ['Pet cooldowns -15%', '-25%', '-35%'] };

SP.ram = { name: 'Rad Ram', hearts: 4, speed: 210, fly: false, attack: 'melee', dmg: 2, cd: 1.5, range: 52, body: [13, 12, 14], wildHp: 12,
  active: 'charge', activeName: 'CHARGE', cdMax: 9, aim: true, activeDesc: 'Rams in a line, smashing zombies and walls',
  passive: 'demolish', passiveName: 'Demolition', passiveDesc: 'Your squad does +50% damage to buildings (camps, raids)',
  activeRanks: ['Charge: 3 dmg to everything in the line, smashes walls', 'Longer charge, +1 damage', 'Stuns what it hits, cooldown -2s'],
  passiveRanks: ['+50% damage to buildings', '+75%', '+100%'] };

SP.toad = { name: 'Gas Toad', hearts: 3, speed: 200, fly: false, attack: 'zap', boltColor: 0x8fae4a, dmg: 1, cd: 1.4, range: 170, body: [12, 14, 18], wildHp: 9,
  active: 'cloud', activeName: 'TOXIC CLOUD', cdMax: 9, aim: true, activeDesc: 'Spits a cloud that hurts everything inside',
  passive: 'thickskin', passiveName: 'Thick Skin', passiveDesc: 'You and your pets ignore gas',
  activeRanks: ['A toxic cloud for 4s (1 dmg every 0.6s)', 'Bigger cloud', 'Lasts 6s and slows zombies, cooldown -2s'],
  passiveRanks: ['You and your pets ignore gas', 'Also: the toad gets +1 heart', 'Also: enemy gas clouds fade twice as fast'] };

// where wild creatures live in the ruins (room range)
export const WILD = { rat: [1, 6], crow: [2, 5], beetle: [3, 8], hound: [4, 9], moth: [6, 10] };

export const FIRST_CATCH = { 1: 'rat', 2: 'crow', 3: 'beetle', 6: 'moth' }; // guaranteed until you own one

export const WILD_SUB = { mole: [1, 7], crow: [2, 6], bat: [3, 10] };

export const FIRST_SUB = { 2: 'mole', 4: 'bat' };

export const WILD_HOS = { toad: [2, 7], ram: [4, 9], moth: [5, 10] };

export const FIRST_HOS = { 2: 'toad', 4: 'ram' };

export const MIL_ITEMS = ['wall', 'gate', 'wire', 'spikes', 'turret', 'guard'];

export const CIV_ITEMS = ['farm', 'kitchen', 'workbench', 'salvage', 'storehouse', 'lab'];

// what each production building makes (set per building)
export const RECIPES = { farm: ['scrap', 'food'], kitchen: ['medkit', 'treat'], workbench: ['cage', 'lure', 'ammo'], salvage: ['parts'] };
// what one item costs to make
export const RCP_COST = { medkit: { food: 4 }, treat: { food: 3 }, cage: { parts: 2 }, lure: { parts: 2 }, ammo: { parts: 3 } };
// buildings zombies like to wreck (they make nothing the morning after)
export const PROD_T = ['farm', 'kitchen', 'workbench', 'salvage'];
// neighbour bonuses: building a touching (8 tiles around) building b
export const NEIGHBORS = [
  { a: 'kitchen', b: 'farm', txt: 'next to a Farm: +1 item' },
  { a: 'workbench', b: 'storehouse', txt: 'next to a Storehouse: +1 item' },
  { a: 'farm', b: 'farm', txt: 'next to another Farm: +25%' },
  { a: 'salvage', b: 'workbench', txt: 'next to a Workbench: +1 Part' },
];
export const RES_ICON = { scrap: '⚙', food: '🌾', parts: '🔩' };
export const isRes = (k) => k in RES_ICON;
const NAMES = { cage: ['Cage', 'Cages'], medkit: ['Med Kit', 'Med Kits'], treat: ['Pet Treat', 'Pet Treats'], lure: ['Noise Lure', 'Noise Lures'], ammo: ['Turret Ammo', 'Turret Ammo'], scrap: ['Scrap', 'Scrap'], food: ['Food', 'Food'], parts: ['Parts', 'Parts'] };
export const nameOf = (k, n = 1) => (NAMES[k] ? NAMES[k][n === 1 ? 0 : 1] : k);
// "+9 🌾" / "2 Med Kits"
export const amtTxt = (k, n) => (isRes(k) ? `+${n} ${RES_ICON[k]}` : `${n} ${nameOf(k, n)}`);

export const recipeOf = (b) => (RECIPES[b.t] ? (RECIPES[b.t].includes(b.rcp) ? b.rcp : RECIPES[b.t][0]) : null);

export const XP = { walker: 2, runner: 2, spitter: 3, bloater: 3, brute: 8, crawler: 3, shrieker: 4, boss: 30, rifleman: 4, bruiser: 4, patient: 2, gasser: 3, bturret: 5, radio: 12 };

export const PERKS = { tough: ['Tough', '+1 max heart'], quick: ['Quickdraw', '+1 ammo, reload 25% faster'], blade: ['Blademaster', '+1 sword damage'], gunner: ['Gunner', '+1 gun damage'], fleet: ['Fleet', 'Dash recharges 30% faster'] };

// ---- jobs: one worker per Workbench / Kitchen / Farm / Storehouse / Turret
export const JOB_SITES = ['workbench', 'kitchen', 'farm', 'salvage', 'storehouse', 'turret', 'guard'];

export const FAV = { workbench: 'hound', kitchen: 'moth', farm: 'beetle', storehouse: 'rat', turret: 'crow', guard: 'mole', salvage: 'bat' };
// buildings can share favourites
export const FAV_EXTRA = { salvage: ['ram'], farm: ['toad'] };
export const favs = (t) => [FAV[t]].concat(FAV_EXTRA[t] || []).filter(Boolean);
export const isFavSp = (t, sp) => favs(t).includes(sp);
export const favJobOf = (sp) => Object.keys(FAV).find(k => FAV[k] === sp) || Object.keys(FAV_EXTRA).find(k => FAV_EXTRA[k].includes(sp));

// Lab: what each species gives once Studied (forever), and while one is in the Lab (active)
export const LAB_BONUS = {
  hound:  { studied: 'Squad pets +1 heart', active: '+25% scrap from dungeon runs' },
  crow:   { studied: 'Turrets +15% range', active: 'Turrets +1 damage at night' },
  rat:    { studied: '+2 stash room', active: 'Every crate drops a Part' },
  moth:   { studied: 'Pet Treats heal +1', active: 'You heal 2 hearts per room (not 1)' },
  beetle: { studied: 'Buildings +20% HP', active: 'Walls and gates +50% HP at night' },
  mole:   { studied: 'A buried stash every room, any squad', active: 'Buried stashes hold double' },
  bat:    { studied: 'You move 10% faster', active: 'Wild creatures show up more often' },
  ram:    { studied: 'Your hits do +25% to walls and turrets', active: 'Salvage Yards +2 🔩' },
  toad:   { studied: 'Gas can\'t hurt you or your pets, anywhere', active: 'Farms +2 🌾' },
};
export const JOB_SHORT = { workbench: ['+1 item', '+2 items'], kitchen: ['+1 item', '+2 items'], farm: ['+50%', '+100%'], salvage: ['+2 🔩', '+4 🔩'], storehouse: ['protects +50 ⚙', 'protects +100 ⚙'], turret: ['+1 damage', '+1 dmg, 25% faster'], guard: ['guards at night', '+2 ♥ guard, Engineer'] };
// what the next building level does
export const NEXT_LVL = { farm: '+50% harvest', salvage: '+50% Parts', kitchen: '+1 item and +2 feeding seats', lab: '+1 research slot', workbench: '+1 item each morning', storehouse: '+3 stash room, protects more scrap' };
export const JOB_DESC = {
  workbench: ['Builds 1 more item each morning, and brings it in', 'Builds 2 more items each morning, and brings them in'],
  kitchen: ['Cooks 1 more item each morning, and brings it in', 'Cooks 2 more items each morning, and brings them in'],
  farm: ['+50% harvest, and brings it in', '+100% harvest, and brings it in'],
  salvage: ['+2 Parts each morning, and brings them in', '+4 Parts each morning, and brings them in'],
  storehouse: ['protects 50 more scrap', 'protects 100 more scrap'],
  turret: ['+1 turret damage', '+1 damage and fires 25% faster'],
  guard: ['Defends the post at night', 'Defends the post with +2 hearts, and all your buildings get +50% HP at night (Engineer)'],
};

// ---- items: the town makes them each morning into your stash
export const ITEMS = { cage: 'Cage', medkit: 'Med Kit', treat: 'Pet Treat', lure: 'Noise Lure', ammo: 'Turret Ammo' };

export const SP_COLOR = { hound: 0xe08a3c, crow: 0x5fd3ff, rat: 0xb0b8c0, moth: 0xf2d14b, beetle: 0xd0392b, mole: 0x9c6b3e, bat: 0xb48cff, ram: 0xd8d8d0, toad: 0x8fae4a };