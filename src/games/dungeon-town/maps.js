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
//  t turret · R radio tower (destroy it to win) · b rifleman · B bruiser · P your entry · c crate
// ===================================================================
export const CAMP_TOTAL = 10;

export const CAMP_HP = { W: 8, g: 4 };

export const CAMPS = [
  { name: 'Scrap Outpost', teach: 'Walls and a gate. Break in and knock down the radio tower.', reward: 60, map: [
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
  { name: 'Wire Yard', teach: 'Wire slows you and spikes hurt. Dash across or find the way around.', reward: 90, map: [
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
  { name: 'Turret Row', teach: 'Turrets out-range your gun. Hide behind walls, or let your pets go first.', reward: 130, map: [
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
];

// Town: # rubble wall · r rubble · W war table · S zombie entrance (west path) · X east path (opens at Town Hall 2) · G generator · T town hall · R ruins hatch · U subway · K creature pen
export const TOWN_MAP = [
  '########################',
  '#......................#',
  '#..rr......WW......rr..#',
  '#..r.......WW.......r..#',
  '#......................#',
  '#......................#',
  '#......................#',
  'SRR........GG........UUX',
  'SRR........GG........UUX',
  '#......................#',
  '#..........TT..........#',
  '#..........TT..........#',
  '#..r................r..#',
  '#..rr..............KK..#',
  '#..................KK..#',
  '########################',
];