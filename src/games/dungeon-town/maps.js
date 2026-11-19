// Maps: dungeon rooms, bandit camps and the town layout.
import Phaser from 'phaser';
import { ROOM_WAVES } from './tuning';

// # wall · . floor · c crate · r rubble · s spawn · D door · P entry · H hatch
export const TEMPLATES = [
  ['#########DD#########', '#s................s#', '#..................#', '#...r..........r...#', '#......c....c......#', '#..................#', '#s.......HH.......s#', '#..................#', '#......c....c......#', '#...r..........r...#', '#..................#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s......#..#......s#', '#.......#..#.......#', '#..rr..........rr..#', '#..rr...c..c...rr..#', '#..................#', '#s.......HH.......s#', '#....##......##....#', '#....##..cc..##....#', '#..................#', '#..c............c..#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s................s#', '#....rrrr..rrrr....#', '#..................#', '#.c..............c.#', '#.....r......r.....#', '#s.......HH.......s#', '#.....r......r.....#', '#.c..............c.#', '#..................#', '#....rrrr..rrrr....#', '#........PP.......s#', '####################'],
];

export const BOSS_ROOM = ['#########DD#########', '#s................s#', '#..r............r..#', '#..................#', '#.....c......c.....#', '#..................#', '#s.......HH.......s#', '#..................#', '#.....c......c.....#', '#..................#', '#..r............r..#', '#s.......PP.......s#', '####################'];

export const FINAL_ROOM = ['####################', '#s................s#', '#..r............r..#', '#..................#', '#.....c......c.....#', '#..................#', '#s.......HH.......s#', '#..................#', '#.....c......c.....#', '#..................#', '#..r............r..#', '#s.......PP.......s#', '####################'];

// Subway: '=' rows are train tracks
export const SUB_TEMPLATES = [
  ['#########DD#########', '#s................s#', '#...c..........c...#', '#..................#', '#==================#', '#..................#', '#s.......HH.......s#', '#..r............r..#', '#..................#', '#==================#', '#..................#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s.....##..##.....s#', '#..................#', '#..c...........c...#', '#..................#', '#s.......HH.......s#', '#==================#', '#..................#', '#...##........##...#', '#...##...cc...##...#', '#..................#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s................s#', '#==================#', '#..................#', '#..####....####....#', '#........HH........#', '#s................s#', '#..####....####....#', '#..................#', '#==================#', '#..c............c..#', '#s.......PP.......s#', '####################'],
];

export const SUB_BOSS = ['#########DD#########', '#s................s#', '#..................#', '#==================#', '#..................#', '#.....c......c.....#', '#s.......HH.......s#', '#..................#', '#..................#', '#==================#', '#..r............r..#', '#s.......PP.......s#', '####################'];

export const SUB_FINAL = SUB_BOSS.map((r, i) => (i === 0 ? '####################' : r));

// Hospital: 'v' = gas vents (puff toxic clouds)
export const HOS_TEMPLATES = [
  ['#########DD#########', '#s................s#', '#....v........v....#', '#..................#', '#...#..c....c..#...#', '#...#..........#...#', '#s.......HH.......s#', '#..................#', '#......c....c......#', '#....v........v....#', '#..................#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s................s#', '#..rr..rr..rr..rr..#', '#..................#', '#.........v........#', '#..c............c..#', '#s.......HH.......s#', '#..................#', '#..v............v..#', '#..................#', '#..rr..rr..rr..rr..#', '#s.......PP.......s#', '####################'],
  ['#########DD#########', '#s.......##.......s#', '#........##........#', '#..v............v..#', '#.....c......c.....#', '#..................#', '#s.......HH.......s#', '#..####......####..#', '#..................#', '#.....v......v.....#', '#..................#', '#s.......PP.......s#', '####################'],
];
export const HOS_BOSS = ['#########DD#########', '#s................s#', '#..v............v..#', '#..................#', '#.....r......r.....#', '#..................#', '#s.......HH.......s#', '#..................#', '#.....r......r.....#', '#..................#', '#..v............v..#', '#s.......PP.......s#', '####################'];
export const HOS_FINAL = HOS_BOSS.map((r, i) => (i === 0 ? '####################' : r));

export function hospitalWaves(room) {
  const fixed = {
    1: [['patient', 'patient', 'walker'], ['patient', 'patient', 'patient', 'runner']],
    2: [['walker', 'gasser', 'patient', 'patient'], ['spitter', 'patient', 'patient', 'gasser']],
    3: [['gasser', 'gasser', 'patient', 'walker'], ['brute', 'patient', 'patient']],
    4: [['spitter', 'spitter', 'patient', 'patient', 'gasser'], ['brute', 'gasser', 'patient', 'patient', 'patient']],
    5: [['patient', 'patient', 'gasser', 'walker'], ['zero', 'patient', 'patient']],
    10: [['brute', 'gasser', 'gasser', 'spitter', 'patient', 'patient'], ['zero', 'brute', 'patient', 'patient', 'patient']],
  };
  if (fixed[room]) return fixed[room].map(w => w.slice());
  const pool = ['patient', 'patient', 'walker', 'gasser', 'spitter', 'runner', 'bloater'];
  const n = 3 + Math.floor(room / 2);
  const mk = (k) => { const w = []; for (let i = 0; i < k; i++) w.push(Phaser.Utils.Array.GetRandom(pool)); return w; };
  const waves = [mk(n), mk(n), mk(n - 1)];
  if (room >= 7) waves[2].push('brute');
  return waves;
}

export function subwayWaves(room) {
  const fixed = {
    1: [['walker', 'walker', 'crawler'], ['runner', 'runner', 'crawler', 'walker']],
    2: [['walker', 'shrieker', 'walker', 'runner'], ['crawler', 'crawler', 'spitter']],
    3: [['crawler', 'crawler', 'shrieker', 'walker'], ['brute', 'runner', 'runner']],
    4: [['spitter', 'shrieker', 'crawler', 'crawler', 'runner'], ['bloater', 'bloater', 'walker', 'crawler']],
    5: [['walker', 'walker', 'crawler', 'runner'], ['mother', 'shrieker']],
    10: [['brute', 'crawler', 'crawler', 'shrieker', 'spitter'], ['mother', 'brute', 'runner', 'runner']],
  };
  if (fixed[room]) return fixed[room].map(w => w.slice());
  const pool = ['walker', 'runner', 'crawler', 'crawler', 'spitter', 'shrieker', 'bloater'];
  const n = 3 + Math.floor(room / 2);
  const mk = (k) => { const w = []; for (let i = 0; i < k; i++) w.push(Phaser.Utils.Array.GetRandom(pool)); return w; };
  const waves = [mk(n), mk(n), mk(n - 1)];
  if (room >= 7) waves[2].push('brute');
  return waves;
}

export function wavesFor(room) {
  if (room <= 4) return ROOM_WAVES[room].map(w => w.slice());
  if (room === 5) return [['walker', 'walker', 'runner', 'runner', 'spitter'], ['boss', 'runner', 'runner']];
  if (room === 10) return [['brute', 'bloater', 'bloater', 'spitter', 'spitter', 'runner'], ['boss', 'walker', 'walker', 'runner', 'runner']];
  const pool = ['walker', 'walker', 'runner', 'runner', 'spitter', 'bloater'];
  const n = 2 + Math.floor(room / 2);
  const mk = (k) => { const w = []; for (let i = 0; i < k; i++) w.push(Phaser.Utils.Array.GetRandom(pool)); return w; };
  const waves = [mk(n), mk(n + 1), mk(n)];
  if (room >= 7) waves[2].push('brute');
  return waves;
}

// ===================================================================
//  BANDIT CAMPS — picked at the War Table, one raid a day
//  # rock · . floor · W camp wall · g gate · x wire (slows you) · ^ spikes (hurt)
//  Q reinforced wall · m hidden mine · v gas vent · t turret · R radio tower (destroy it to win) · b rifleman · B bruiser · P your entry · c crate
// ===================================================================
export const CAMP_TOTAL = 12;

export const CAMP_HP = { W: 8, g: 4, Q: 24 };

export const CAMPS = [
  { name: 'Scrap Outpost', teach: 'Walls and a gate. Break in and knock down the radio tower.', reward: 60, parts: 4, map: [
    '########################',
    '#......................#',
    '#..c..........WWWWWWW..#',
    '#.............W.....W..#',
    '#.............W..b..W..#',
    '#.............W.....W..#',
    '#......b......W.....W..#',
    '#P............g..R..W..#',
    '#P............g.....W..#',
    '#......b......W.....W..#',
    '#.............W..B..W..#',
    '#.............W.....W..#',
    '#..c..........WWWWWWW..#',
    '#..........B...........#',
    '#......................#',
    '########################'] },
  { name: 'Wire Yard', teach: 'Wire slows you and spikes hurt. Dash across or find the way around.', reward: 90, parts: 6, map: [
    '########################',
    '#......................#',
    '#.....xxxx.....^^^.....#',
    '#.....xxxx..b..^^^..B..#',
    '#..........WWWWWWW.....#',
    '#..xx......W.....W.....#',
    '#..xx...^^.W..R..W..b..#',
    '#P......^^.g.....W.....#',
    '#P......^^.g.....W.....#',
    '#..xx...^^.W.....W..b..#',
    '#..xx......W..B..W.....#',
    '#..........WWWWWWW.....#',
    '#.....xxxx..b..^^^.....#',
    '#.....xxxx.....^^^..B..#',
    '#......................#',
    '########################'] },
  { name: 'Turret Row', teach: 'The Ruins holdout. Turrets out-range your gun: hide behind walls, or send your pets first.', reward: 130, parts: 8, map: [
    '########################',
    '#......................#',
    '#..........W.t.W.......#',
    '#..........WWWWW...b...#',
    '#......................#',
    '#.....t.......WWWWWWW..#',
    '#.....W.......W.....W..#',
    '#P.........b..g..R..W..#',
    '#P............g..t..W..#',
    '#.....W.......W.....W..#',
    '#.....t.......WWWWWWW..#',
    '#......................#',
    '#..........WWWWW...B...#',
    '#..........W.t.W.......#',
    '#......................#',
    '########################'] },
    { name: 'Ticket Hall', teach: 'Two boxes of turrets guard the tower. Take one box at a time.', reward: 160, parts: 9, map: [
      '########################',
      '#......................#',
      '#..xx....b.......WWWWW.#',
      '#..xx..........b.W.t.W.#',
      '#.......WWgWW....W...W.#',
      '#.......W...W....WWgWW.#',
      '#..b....W.b.W..........#',
      '#P......g...W....^^^...#',
      '#P......W...W....^^^.R.#',
      '#..b....W.B.W..........#',
      '#.......WWWWW....WWgWW.#',
      '#..xx............W...W.#',
      '#..xx..........b.W.t.W.#',
      '#........b.......WWWWW.#',
      '#......................#',
      '########################'] },
    { name: 'Signal Box', teach: 'Turrets cover each other. Knock out the outer ones first.', reward: 190, parts: 10, map: [
      '########################',
      '#......................#',
      '#.....^^^.....WWWWWWW..#',
      '#..b..^^^..b..W.t...W..#',
      '#.............W.....W..#',
      '#...WWW.......W..R..W..#',
      '#...WtW...xx..g.....W..#',
      '#P........xx..g..t..W..#',
      '#P........xx..W.....W..#',
      '#...WtW.......W.....W..#',
      '#...WWW.......W..B..W..#',
      '#..b..^^^..b..W.t...W..#',
      '#.....^^^.....WWWWWWW..#',
      '#..........B...........#',
      '#......................#',
      '########################'] },
    { name: 'The Depot', teach: 'The Subway holdout: a fort inside a fort. Beat it to reclaim the Subway.', reward: 240, parts: 12, map: [
      '########################',
      '#......................#',
      '#..b...xxxx....WWWWWWW.#',
      '#......xxxx....W..b..W.#',
      '#...t..........W.WWW.W.#',
      '#..WWW...^^^...W.WRW.W.#',
      '#..........B...W.WgW.W.#',
      '#P....b........g..t..W.#',
      '#P....b........g.....W.#',
      '#..........B...W.t...W.#',
      '#..WWW...^^^...W.....W.#',
      '#...t..........W..b..W.#',
      '#......xxxx....WWWWWWW.#',
      '#..b...xxxx............#',
      '#......................#',
      '########################'] },
    { name: 'Triage Tent', teach: 'Hidden mines everywhere. Go slow, or bring the Bat: its Screech shows them.', reward: 280, parts: 12, map: [
      '########################',
      '#......................#',
      '#..b.....m....m........#',
      '#.....m.....m....WWWWW.#',
      '#..m......b......W...W.#',
      '#.....m.....m....W.R.W.#',
      '#P.......m.......W...W.#',
      '#P...m......m....WWgWW.#',
      '#.......m......b.......#',
      '#..m.......m......m....#',
      '#.....b......m.....t...#',
      '#..m......m.....m......#',
      '#......m.....B.........#',
      '#..b......m.......m....#',
      '#......................#',
      '########################'] },
    { name: 'The Ward', teach: 'Reinforced walls shrug off your gun. Find the weak gate, charge with the Ram, or dig under with the Mole.', reward: 320, parts: 14, map: [
      '########################',
      '#......................#',
      '#..b...QQQQQQQQQQQQ....#',
      '#......Q..........Q..b.#',
      '#......Q.t......t.Q....#',
      '#..B...Q..QQQQQQ..Q....#',
      '#P.....Q..Q..R.Q..Q....#',
      '#P.....g..Q....Q..Q....#',
      '#......Q..QQgQQQ..Q..b.#',
      '#..b...Q..........Q....#',
      '#......Q.b......b.Q....#',
      '#......QQQQQQQQQQQQ....#',
      '#..........B...........#',
      '#......................#',
      '#......................#',
      '########################'] },
    { name: 'Quarantine Gate', teach: 'The Hospital holdout: gas vents, reinforced walls, turrets. The Toad makes the gas harmless.', reward: 380, parts: 16, map: [
      '########################',
      '#......................#',
      '#..v.......b......QQQQ.#',
      '#.........v.......Q.tQ.#',
      '#..b..QQQQQQQ.....Q..Q.#',
      '#.....Q.v...Q.....QQgQ.#',
      '#P....Q..R..Q..b.......#',
      '#P....Q.....g....v.....#',
      '#.....Q..t..Q..........#',
      '#..b..QQQQQQQ.....QQgQ.#',
      '#.........v.......Q..Q.#',
      '#..v.......b......Q.tQ.#',
      '#.................QQQQ.#',
      '#..........B...........#',
      '#......................#',
      '########################'] },
];

// Town: # wall · gates w e n s (west/east/north/south district gates) · M map table · G generator · T town hall
//       R ruins hatch · U subway · 3 north hatch · 4 south hatch · K creature pen
export const TOWN_MAP = [
  '###########nn###########',
  '#..........33..........#',
  '#......................#',
  '#......................#',
  '#....MM................#',
  '#....MM................#',
  '#......................#',
  'wRR........GG........UUe',
  'wRR........GG........UUe',
  '#......................#',
  '#..........TT..........#',
  '#..........TT......KK..#',
  '#..................KK..#',
  '#......................#',
  '#..........44..........#',
  '###########ss###########',
];

// the 4 districts around town (one per gate). Reclaim one: beat its boss + its 3 bandit camps.
export const DISTRICTS = [
  { key: 'ruins', name: 'The Ruins', gate: 'w', dir: 'W', dungeon: 'ruins', boss: 'The Warden', camps: [0, 1, 2], th: 1, ready: true, perk: 'Survivors farm: Farms +25%', icon: 'hatch' },
  { key: 'subway', name: 'The Subway', gate: 'e', dir: 'E', dungeon: 'subway', boss: 'The Tunnel Mother', camps: [3, 4, 5], th: 2, ready: true, perk: 'Survivors salvage: Salvage Yards +2 🔩', icon: 'stairs' },
  { key: 'north', name: 'The Hospital', gate: 'n', dir: 'N', dungeon: 'hospital', boss: 'Patient Zero', camps: [6, 7, 8], th: 3, ready: true, perk: 'The Lab studies +2% faster', icon: 'cross' },
  { key: 'south', name: '???', gate: 's', dir: 'S', dungeon: null, boss: '???', camps: [], th: 4, ready: false, perk: '', icon: 'boards' },
];