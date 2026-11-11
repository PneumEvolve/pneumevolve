// Critter Quest — pixel art. Every sprite is a list of strings, one character per pixel.
// Colors come from PAL. "." is empty. Sprites with outline:true get a dark outline added automatically.

export const T = 16; // tile size in pixels

const PAL = {
  k: '#2a2135', c: '#d94a3a', w: '#f6f3ea', h: '#6b4226', s: '#f2c39b', r: '#2f9e8f', b: '#36477a',
  t: '#e86f8a', g: '#ddd0bb', G: '#b8a68c', p: '#f0a3b5',
  y: '#f2c35b', Y: '#d08a2c', f: '#ff7a2a', F: '#ffd23f', R: '#e2392b',
  n: '#3a2f52', N: '#5a4c80', o: '#e8742c', O: '#b9531b', m: '#a7b0c2', M: '#6b7488',
  u: '#4aa3df', U: '#bfe6fb', v: '#8b7563', V: '#6a5648',
  l: '#7fd35b', L: '#3f8f3a',                                  // leaf greens (Foxlet line)
  q: '#9a948c', Q: '#6f6a64', e: '#bdb8b0',                    // stone (Rockalock)
  i: '#9fb0c4', I: '#6d7f95', j: '#e3ebf3',                    // steel (Steel Dog)
};

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  return [c, g];
}
export const px = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
export function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function sprite(rows, { flip = false, tint = null, outline = true } = {}) {
  const w0 = Math.max(...rows.map(r => r.length)), h0 = rows.length, pad = outline ? 1 : 0;
  const W = w0 + pad * 2, H = h0 + pad * 2;
  const grid = Array.from({ length: H }, () => Array(W).fill(null));
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && PAL[ch]) grid[y + pad][x + pad] = ch; }));
  if (outline) {
    const edge = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx])) edge.push([x, y]);
    }
    edge.forEach(([x, y]) => (grid[y][x] = 'k'));
  }
  const [c, g] = mk(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = grid[y][x];
    if (ch) px(g, tint || PAL[ch], flip ? W - 1 - x : x, y);
  }
  return c;
}
const withRows = (rows, from, repl) => rows.slice(0, from).concat(repl, rows.slice(from + repl.length));
const flameSwap = rows => rows.map(r => r.replace(/[fF]/g, ch => (ch === 'f' ? 'F' : 'f')));
const recolor = (rows, map) => rows.map(r => r.replace(/./g, ch => map[ch] || ch));
const mirror = rows => rows.map(r => [...r].reverse().join(''));

/* ---------------- the kid ---------------- */
const P_DOWN = [
  '...kkkkkk...', '..kcccccck..', '.kcccwwccck.', '.kkkkkkkkkk.',
  '.khsssssshk.', '.kssksskssk.', '.kssssssssk.', '..kssssssk..',
  '.krrrrrrrrk.', 'ksrrrwwrrrsk', 'ksrrrrrrrrsk', '.kkrrrrrrkk.',
  '..kbbbbbbk..', '..kbbkkbbk..', '..kbk..kbk..', '..kkk..kkk..'];
const P_UP = [
  '...kkkkkk...', '..kcccccck..', '.kcccccccck.', '.kcccccccck.',
  '.khhhhhhhhk.', '.khhhhhhhhk.', '.kshhhhhhsk.', '..kssssssk..',
  '.krrrrrrrrk.', 'ksrrrrrrrrsk', 'ksrrrrrrrrsk', '.kkrrrrrrkk.',
  '..kbbbbbbk..', '..kbbkkbbk..', '..kbk..kbk..', '..kkk..kkk..'];
const P_SIDE = [
  '...kkkkkk...', '..kcccccck..', '.kcccwwccck.', '.kkkkkkkkkkk',
  '.khhssssssk.', '.khhssskssk.', '.khssssssssk', '..kssssssk..',
  '..krrrrrrk..', '..krrssrrk..', '..krrssrrk..', '..kkrrrrkk..',
  '...kbbbbk...', '...kbbbbk...', '...kbkkbk...', '...kk..kk...'];
const LEGS_STEP = ['..kbk..kkk..', '..kkk.......'];
const LEGS_SIDE = ['..kbbkkbbk..', '..kbk..kbk..', '..kk....kk..'];

/* ---------------- critters (all drawn facing RIGHT) ---------------- */
const FOX_ROWS = [
  '..........O..O..', '..........Oo.Oo.', '.........oooooo.', '.........oookoo.',
  '.........ooowwwk', '..........owww..', 'OO.....oooww....', 'Ooo..ooooooo....',
  'wooooooooooo....', 'wwooooooooo.....', '.wwooooooooo....', '....oOo..oOo....',
  '....oO...oO.....', '....kk...kk.....'];
const DOG_ROWS = [
  '...........kk...', '..........kDdk..', '.........kdddddk', '.........kdkdddk',
  '.k.......kddwwwk', 'kdk.....kddddtk.', '.kdkkkkkkddddk..', '..kdddddddddk...',
  '..kddddwwdddk...', '..kddddddddk....', '..kdkdk..kdkdk..', '..kkkkk..kkkkk..'];
const RABBIT_LEFT = [
  '..kk.kk.........', '.kgpkkgpk.......', '.kgpkkgpk.......', '.kgpkkgpk.......',
  '..kgkkgk........', '.kggggggk.......', 'kgkgggggk.......', 'kpggggggggkkk...',
  '.kggggggggggggk.', '..kgggggggggggwk', '..kggggGGGgggwwk', '..kgggGGGGggggk.',
  '...kgggggggggk..', '..kggk...kgggk..', '.kgggk..kggggk..', '.kkkkk..kkkkkk..'];

const ART = {
  blazepony: [
    '........F.......', '.......FfF......', '.......fRfyy....', '......FfRyyyyy..',
    '......fRyyykyyy.', '.......fyyyyyyy.', '.F.....fyyyY....', 'FfF....fyyy.....',
    'fRf.yyyyyyyy....', '.fRyyyyyyyyy....', '..fyyyyyyyyY....', '...YyyyyyyyY....',
    '...yy....yy.....', '...yy....yy.....', '...kk....kk.....'],
  shadowblaze: [
    '..........F.F...........', '.........FfFfF..........', '........FfRfRf..........', '........fRRfRnnn........',
    '.......FfRRfnnnnnn......', '.......fRRfnnnnFnnnn....', '.......fRRfnnnnnnnnnn...', '........fRfnnnnnNnnnn...',
    '........fRnnnnN.........', '.F......fRnnnnN.........', 'FfF.....fnnnnnN.........', 'fRfF..nnnnnnnnnN........',
    '.fRRfnnnnnnnnnnnN.......', '..fRnnnnnnnnnnnnN.......', '...fnnnnnnnnnnnnN.......', '....NnnnnnnnnnnnN.......',
    '.....nnN....nnN.........', '.....nnN....nnN.........', '.....nnN....nnN.........', '.....nnN....nnN.........',
    '....FfRF...FfRF.........', '.....FF.....FF..........'],
  foxlet: recolor(FOX_ROWS, { O: 'L', w: 'l' }),
  hammerfox: recolor([
    '........O....O..........', '........Oo..Oo....MMMMMM', '........oooooo....MmmmmM', '.......cccccccc...MmmmmM',
    '.......oooooko....MmmmmM', '.......oooooowwwk.MMMMMM', '........oooowww.....hh..', '.........owww.......hh..',
    '.......mmmmmmm......hh..', '......mmMmmmMmm.....hh..', '......mmmmmmmmmooooohh..', 'OO....mmmMmmmmm.....hh..',
    'Ooo...ooooooooo.....hh..', 'wooo..ooowwwooo.....hh..', 'wwooooooowwwooo.....hh..', '.wwoooooooooooo.....hh..',
    '...ccccccccccc......hh..', '......oooo.ooo......hh..', '......ooO...ooO.....hh..', '......ooO...ooO.....hh..',
    '.....ooOO..ooOO.........', '.....kkkk..kkkk.........'], { O: 'L', c: 'L' }),
  splashcano: [
    '......U..U......', '.....UuUUuU.....', '......uuuu......', '......uUUu......',
    '.....vuuuuv.....', '.....vvvvvv.....', '....vvuvvvvv....', '....vvkvvkvv....',
    '...vvvvvvvvvv...', '...vvvvttvvvv...', '..vvVvvuvvvVvv..', '..vvvvvuvvvvvv..',
    '.vVvvvvvvvvvvVv.', '.vvvvvvvvvvvvvv.', 'VVVVVVVVVVVVVVVV'],
  boomcano: [
    '.......F..F.............', '......FfFFfF............', '.......fRRf.............', '.......RffR.............',
    '......vRffRv............', '......vvRRvv............', '.....vvvRvvvv...........', '.....vvvRvvvv..mmmmmmmR.',
    '....vvvvvvvvvvMMMMMMMMRR', '....vvkFvvkFvvmmmmmmmmR.', '...vvvvvvvvvvvvM.M......', '...vvvvRRRRvvvvvv.......',
    '..vvvvvvvvvvvvvvv.......', '..vvVvvvvvvvvvVvvv......', '.vvvvvvvRvvvvvvvvv......', '.vvvvvvvRRvvvvvvvvv.....',
    '.vVvvvvvvRvvvvvvVvvv....', 'vvvvvvvvvvvvvvvvvvvvv...', 'VVVVVVVVVVVVVVVVVVVVV...'],
  rabbit: mirror(RABBIT_LEFT),
  bluebird: [
    '.........uuu....', '........uuuuu...', '........uukuuFF.', '........uuuuuF..',
    '...UU...ooouu...', '..UuuU.oooooo...', '.uUuuuuoooooo...', 'uuuUuuuooooou...',
    '.uuuuuuuoooou...', '...uuuuuuuuu....', '......F..F......', '.....FF.FF......'],
  fox: FOX_ROWS,
  steeldog: recolor(DOG_ROWS, { d: 'i', D: 'I', w: 'j', t: 'R' }),
  rockalock: [
    '......qqqqqqqqqq......', '....qqeeqqqqqqqqqq....', '...qqeeqqqqqqqqqQqq...', '..qqeqqqqqqqqqqqqQqq..',
    '..qqqqwwkqqqqwwkqqqq..', '.qqqqqwwkqqqqwwkqqqqq.', '.qqqqqqqqqqqqqqqqqqqq.', 'QQqqqqqQkkkkkkQqqqqqQQ',
    'QQQqqqqqqqqqqqqqqqqQQQ', 'QQ.qqqqQqqqqqqqQqqq.QQ', 'QQ.qqqqqqqqqqqqqqqq.QQ', 'Qe.qqqQqqqqqqqQqqqq.eQ',
    '...qqqqqqqqqqqqqqqq...', '....QqqqqqqqqqqqqQ....', '.....QQQ......QQQ.....', '.....QqQ......QqQ.....',
    '....QQqQ......QqQQ....', '....QQQQ......QQQQ....'],
};
const NO_OUTLINE = new Set(['rabbit', 'steeldog']);

/* ---------------- tiles ---------------- */
function tile(fn) { const [c, g] = mk(T, T); fn(g); return c; }
function grassBase(g, seed) {
  px(g, '#7cc56a', 0, 0, 16, 16);
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(hash(seed, i * 7) * 12), y = 3 + Math.floor(hash(i * 3, seed) * 11);
    px(g, '#62ab55', x, y); px(g, '#62ab55', x + 1, y - 1); px(g, '#62ab55', x + 2, y);
  }
}
function rockBase(g, seed) {
  px(g, '#c4b79d', 0, 0, 16, 16);
  for (let i = 0; i < 3; i++) {
    const x = 1 + Math.floor(hash(seed, i * 5) * 13), y = 1 + Math.floor(hash(i * 9, seed) * 13);
    px(g, '#a99c82', x, y, 2, 1); px(g, '#d8cdb6', x, y - 1);
  }
}

/* ---------------- build everything (needs a browser) ---------------- */
export function buildArt(speciesTable) {
  const NO = { outline: false };
  const KID = {
    down: sprite(P_DOWN, NO), downA: sprite(withRows(P_DOWN, 14, LEGS_STEP), NO), downB: sprite(withRows(P_DOWN, 14, LEGS_STEP), { outline: false, flip: true }),
    up: sprite(P_UP, NO), upA: sprite(withRows(P_UP, 14, LEGS_STEP), NO), upB: sprite(withRows(P_UP, 14, LEGS_STEP), { outline: false, flip: true }),
    right: sprite(P_SIDE, NO), rightW: sprite(withRows(P_SIDE, 13, LEGS_SIDE), NO),
    left: sprite(P_SIDE, { outline: false, flip: true }), leftW: sprite(withRows(P_SIDE, 13, LEGS_SIDE), { outline: false, flip: true }),
  };

  // R = facing right (your side), L = facing left (wild side). Two frames so flames flicker.
  const SPR = {};
  for (const [k, s] of Object.entries(speciesTable)) {
    const a = ART[k], b = s.fire ? flameSwap(a) : a, outline = !NO_OUTLINE.has(k);
    SPR[k] = {
      R: [sprite(a, { outline }), sprite(b, { outline })],
      L: [sprite(a, { outline, flip: true }), sprite(b, { outline, flip: true })],
      W: sprite(a, { outline, tint: '#ffffff' }),
      WL: sprite(a, { outline, flip: true, tint: '#ffffff' }),
    };
  }
  const urlCache = {};
  const spriteURL = sp => (urlCache[sp] ||= SPR[sp].R[0].toDataURL());

  const TILES = {
    grass: [0, 1, 2, 3].map(s => tile(g => grassBase(g, s + 11))),
    ground: [0, 1, 2].map(s => tile(g => rockBase(g, s + 21))),
    tall: tile(g => {
      px(g, '#56a54d', 0, 0, 16, 16);
      const clump = ['l...l.', 'dl.ld.', 'dd.dd.', 'dddl..', '.ddd..'];
      for (const [ox, oy] of [[1, 1], [9, 2], [4, 8], [11, 10], [0, 11]])
        clump.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'l') px(g, '#9be08a', ox + x, oy + y);
          if (ch === 'd') px(g, '#357a39', ox + x, oy + y);
        }));
    }),
    rubble: tile(g => {
      px(g, '#b6a88d', 0, 0, 16, 16);
      for (const [x, y] of [[1, 2], [8, 1], [12, 6], [3, 8], [9, 10], [12, 13], [2, 13], [6, 5]]) {
        px(g, '#6f6a64', x, y + 1, 3, 1); px(g, '#8d8780', x, y, 3, 1); px(g, '#c9c4bc', x, y - 1, 2, 1);
      }
    }),
    path: tile(g => {
      px(g, '#e4cc92', 0, 0, 16, 16);
      [[3, 4], [11, 2], [7, 11], [13, 12], [2, 13]].forEach(([x, y]) => { px(g, '#c8ab6c', x, y, 2, 1); px(g, '#f2deaf', x, y - 1); });
    }),
    tree: tile(g => {
      grassBase(g, 5);
      px(g, '#4a2e17', 5, 11, 6, 5); px(g, '#7a4e2b', 6, 11, 4, 5); px(g, '#956339', 6, 11, 1, 5);
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 6.5);
        if (d < 7.4) px(g, d > 6.4 ? '#1d4f2c' : '#2f7f40', x, y);
      }
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 5, y - 4) < 2.6) px(g, '#4ea457', x, y);
      px(g, '#6fc070', 4, 3); px(g, '#4ea457', 10, 8, 2, 1);
    }),
    pine: tile(g => {
      rockBase(g, 7);
      px(g, '#4a2e17', 7, 12, 2, 4);
      const layers = [[0, 3], [3, 5], [6, 6], [9, 7]];   // [top row, widest half-width]
      for (const [top, half] of layers)
        for (let y = 0; y < 4; y++) {
          const w = Math.min(half, 1 + y * 2);
          px(g, '#1b3d2d', 8 - w - 1, top + y, (w + 1) * 2, 1);
          px(g, '#2b5e45', 8 - w, top + y, w * 2, 1);
          px(g, '#3f7a58', 8 - w, top + y, Math.max(1, w - 1), 1);
        }
      px(g, '#f4f7fb', 7, 0, 2, 2);
    }),
    boulder: tile(g => {
      rockBase(g, 3);
      for (let y = 2; y < 16; y++) for (let x = 0; x < 16; x++) {
        const v = ((x - 7.5) / 7.5) ** 2 + ((y - 9.5) / 6.5) ** 2;
        if (v <= 1) px(g, v > 0.8 ? '#4d4843' : (y < 8 ? '#b3ada5' : '#9a948c'), x, y);
      }
      px(g, '#d3cec6', 4, 5, 3, 1); px(g, '#6f6a64', 9, 9, 1, 3); px(g, '#6f6a64', 10, 12, 2, 1);
    }),
    flowers: tile(g => {
      grassBase(g, 9);
      [[3, 4, '#f15b5b'], [11, 6, '#ffd84a'], [6, 11, '#ffffff'], [12, 12, '#f15b5b']].forEach(([x, y, c]) => {
        px(g, c, x - 1, y); px(g, c, x + 1, y); px(g, c, x, y - 1); px(g, c, x, y + 1); px(g, '#f39a2b', x, y);
      });
    }),
    sign: tile(g => {
      grassBase(g, 2);
      px(g, '#4a2e17', 7, 9, 2, 7); px(g, '#7a4e2b', 7, 9, 1, 7);
      px(g, '#5b3a20', 2, 2, 12, 8); px(g, '#d39c5c', 3, 3, 10, 6);
      px(g, '#9a6a37', 4, 4, 8, 1); px(g, '#9a6a37', 4, 6, 6, 1);
      px(g, '#5b3a20', 3, 10, 10, 1);
    }),
    water: [0, 1].map(f => tile(g => {
      px(g, '#4aa3df', 0, 0, 16, 16);
      const o = f * 3;
      px(g, '#a8dcf7', 2 + o, 4, 4, 1); px(g, '#a8dcf7', 9 - o, 10, 4, 1); px(g, '#7cc2ec', 6, 13 - f, 3, 1);
    })),
    gate: [false, true].map(open => tile(g => {
      px(g, '#e4cc92', 0, 0, 16, 16);
      for (const x of [1, 12]) { px(g, '#4a2e17', x, 1, 3, 15); px(g, '#8a5a2e', x + 1, 2, 1, 13); px(g, '#2a2135', x, 0, 3, 1); }
      if (!open) {
        for (const y of [4, 9]) { px(g, '#4a2e17', 4, y, 8, 3); px(g, '#a26c39', 4, y + 1, 8, 1); }
        px(g, '#2a2135', 6, 6, 4, 4); px(g, '#ffd23f', 7, 7, 2, 2);
      }
    })),
  };

  const HOUSE = (() => {
    const [c, g] = mk(80, 64);
    px(g, '#2a2135', 58, 0, 10, 14); px(g, '#9c4a3a', 59, 1, 8, 13); px(g, '#7c3a2e', 59, 5, 8, 1); px(g, '#7c3a2e', 59, 9, 8, 1);
    px(g, '#2a2135', 0, 6, 80, 26); px(g, '#c8473a', 1, 7, 78, 24);
    for (let y = 10; y < 31; y += 5) px(g, '#a53a2f', 1, y, 78, 1);
    for (let y = 7; y < 31; y += 5) for (let x = (y / 5) % 2 ? 4 : 9; x < 79; x += 10) px(g, '#a53a2f', x, y, 1, 3);
    px(g, '#e2685a', 1, 7, 78, 1);
    px(g, '#2a2135', 3, 31, 74, 33);
    px(g, '#f3e6c8', 4, 31, 72, 32); px(g, '#e2d2ae', 4, 31, 72, 2); px(g, '#d6c39b', 4, 60, 72, 3);
    for (const wx of [12, 54]) {
      px(g, '#5b4a3a', wx, 38, 14, 12); px(g, '#a8dcf7', wx + 1, 39, 12, 10);
      px(g, '#d9f1fb', wx + 2, 40, 3, 3); px(g, '#5b4a3a', wx + 6, 39, 2, 10); px(g, '#5b4a3a', wx + 1, 43, 12, 1);
      px(g, '#b5463a', wx - 1, 50, 16, 2);
    }
    px(g, '#2a2135', 33, 42, 14, 22); px(g, '#8a5a2e', 34, 43, 12, 21); px(g, '#a26c39', 35, 44, 4, 19);
    px(g, '#f2c94c', 43, 53, 2, 2);
    return c;
  })();

  // Battle backdrops: a sunny meadow and a rocky mountain.
  function makeField(platforms, mountain) {
    const [c, g] = mk(240, 160);
    const sky = mountain ? ['#b9d3e6', '#c4dbea', '#cfe2ee', '#dae9f1', '#e3eef2', '#ebf2f2'] : ['#a9dcf0', '#b6e2f2', '#c3e8f3', '#d0edf4', '#dcf1f3', '#e6f4f1'];
    sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 7, 240, 7); });
    const cloud = (x, y) => { px(g, '#ffffff', x + 4, y, 14, 4); px(g, '#ffffff', x, y + 3, 24, 4); px(g, '#eaf6fb', x, y + 6, 24, 1); };
    cloud(22, 8); cloud(112, 4); cloud(196, 14);
    for (let x = 0; x < 240; x++) {
      if (mountain) {
        const peak = 14 + Math.round(Math.abs(((x + 30) % 80) - 40) * 0.6 + Math.sin(x / 7) * 1.5);
        px(g, '#8e8a99', x, peak, 1, 60); if (peak < 24) px(g, '#f4f7fb', x, peak, 1, 24 - peak);
        const ridge = 32 + Math.round(Math.sin(x / 13) * 4);
        px(g, '#9e927f', x, ridge, 1, 30);
      } else {
        const h = 30 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5);
        px(g, '#a6d695', x, h, 1, 30);
        const t = 38 + Math.round(Math.abs(Math.sin(x / 5)) * -4 + Math.sin(x / 31) * 2);
        px(g, '#6fb36a', x, t, 1, 20); px(g, '#5a9f58', x, t + 6, 1, 14);
      }
    }
    const bands = mountain ? ['#c4b79d', '#bcae93'] : ['#9cd27b', '#a5d985'];
    for (let y = 46; y < 160; y++) { g.fillStyle = bands[Math.floor((y - 46) / 6) % 2]; g.fillRect(0, y, 240, 1); }
    const [edge, top, base] = mountain ? ['#857a68', '#d3c8b1', '#ab9f86'] : ['#5d9c4c', '#92ce6e', '#7fbd5f'];
    for (const [cx, cy, rx, ry] of platforms)
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
        const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (v <= 1) px(g, v > 0.78 ? edge : y < cy - ry * 0.25 ? top : base, x, y);
      }
    return c;
  }
  const BATTLE_PLATFORMS = [[184, 54, 42, 9], [66, 100, 48, 10]];
  const BG = {
    meadow: makeField(BATTLE_PLATFORMS, false),
    mountain: makeField(BATTLE_PLATFORMS, true),
    choose: makeField([48, 120, 192].map(x => [x, 98, 30, 7]), false),
  };

  return { KID, SPR, TILES, HOUSE, BG, spriteURL };
}
