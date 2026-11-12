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
  z: '#7a8a5a', Z: '#566440', x: '#c9c08f',                    // komodo scales and belly
  E: '#ffe14a', a: '#c98f1f', B: '#bff3ff',                    // electric yellow, amber, spark white-blue
  A: '#6fa3c4', H: '#3f6a8a', W: '#e2f7ff',                    // ice dinosaur blues and icicle white
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
const swapPair = (rows, [a, b]) => rows.map(r => r.replace(new RegExp(`[${a}${b}]`, 'g'), ch => (ch === a ? b : a)));
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
  // Splashcano: a baby stone turtle on four little legs, with one small volcano on its shell that splashes water.
  splashcano: [
    '...U.U............',
    '..UuUuU...........',
    '...uUu............',
    '...quq............',
    '..qqqqq.....qqqq..',
    '.qqqqqqqqq.qqqqkq.',
    'qqqQqqqqqqqqqqqqq.',
    'qqqqqqQqqqqqqqqq..',
    'qQqqqqqqqQqqqq....',
    '.yyyyyyyyyyyyy....',
    '..qq.qq...qq.qq...',
    '..qq.qq...qq.qq...',
    '..QQ.QQ...QQ.QQ...',
  ],
  // Boomcano: a young stone turtle on two legs with one steaming volcano on its shell and gorilla arms, holding a rocket launcher (w/U steam swaps to flicker).
  boomcano: [
    '.....w.U......................',
    '....wUwUw.....................',
    '.....wUw......................',
    '......u.......................',
    '.....quq..........qqqq........',
    '....qqqq.........qqqkqq.......',
    '...qqqqqqqqq....qqqqqqq.......',
    '..qqqqqqqqqqqqqqqqqqqq........',
    '.qqQqqqqqqqqqyyqqqqqq.........',
    '.qqqqqqQqqqqyyyyqqqq..........',
    '.qqqqqqqqqqqyyyyqqqqq.........',
    '.qQqqqqqqqqqyyyy.mmmmmmmmmmmR.',
    'QqqqqqQqqqqqyyyyMMMMMMMMMMMMRR',
    'QQqqqqqqqqqqyyy.mqqqqqmmmmmmR.',
    'QQQqqqqqqqqyyy...qqQqq........',
    'QQQ....qqq.qqq................',
    'QQQ....qqq.qqq................',
    'QQQ...QQQQ.QQQQ...............',
  ],
  rabbit: mirror(RABBIT_LEFT),
  megabun: [
    '..........gg..gg....', '.........gpg.gpg....', '.........gpg.gpg....', '.........gpg.gpg....',
    '.........gpg.gpg....', '..........gggggg....', '.........cccccccc...', '........gggggkggg...',
    '........ggggggggpk..', '...ww...gggggwwgg...', '..wwwgggggggwwww....', '..wwggggggggggggg...',
    '...gggggggGGGgggg...', '...ggggggGGGGgggg...', '...gggggGGGGgggggg..', '....ggggggggggggg...',
    '....GGGgggggggGGg...', '...GGGGG....gGGGG...', '..GGGGGG...GGGGGG...', '..wwwwww...wwwwww...'],
  skyhawk: [
    'bb....................', 'bub...................', 'buub.........uuu......', '.buub.......uuuuu.....',
    '.buuub......uukuuFFF..', '..buuuub....uuuuuFF...', '..buuuuubb..uuuuu.....', '...buuuuuuubooou......',
    '....buuuuuuoooooou....', '.....bbuuuuooooooou...', 'uuu....buuuoooooou....', 'UuuUu...uuuuuuuuu.....',
    '.UuuUuuuuuuuuuuu......', '...UUuuuuuuuuu........', '..........F..F........', '.........FF.FF........'],
  elderfox: [
    '..............O...O...', '..............Oo.Oo...', '.............ooooooo..', '.............ooookooo.',
    '.............oooowwwwk', 'OO...........ooowwww..', 'Ooo..OO.......NNNNN...', 'wooo.Ooo....oooNNNNN..',
    'wwooowoooooooooooNN...', '.wwooooooooooooooo....', 'OO.wwooooooooowwooo...', 'Ooo..ooooooooowwwoo...',
    'woooooooooooooooooo...', 'wwoooooooooooooooo....', '.ww...oOo.....oOo.....', '......oOo.....oOo.....',
    '......oOO.....oOO.....', '......kkk.....kkk.....'],
  steelwolf: [
    '................I.....', '...............IiI....', '..............iiiiii..', 'II..M.M.M.....iiRiiii.',
    '.I.MMMMMMM...iiiiijjjI', '..iiiiiiiiiiiiiijjj...', '.iiiiiiiiiiiiiii......', 'Iiiiiiiiijjjiiii......',
    'IIiiiiiiijjjjiiI......', '.Iiiiiiiiiiiiii.......', '..IiiI.....IiiI.......', '..IiiI.....IiiI.......',
    '..IiiI.....IiiI.......', '..IIII.....IIII.......'],
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
ART.komodo = [
  '............zzzzz...', '...........zzzzkzzz.', 'zz........zzzzzzzzzt', '.zzz....zzzzzzzzzz.t',
  '..zzzzzzzzzzzzzzz...', '...zzzZzzzZzzzzzz...', '....zzxxxxxxxxzz....', '....zZ.zZ...zZ.zZ...',
  '....ww.ww...ww.ww...'];
ART.darkkomodo = [
  '..........F.F.F...........', '.........fRfRfRf..nnnnnn..', '........nnnnnnnnnnnnnFnnn.', 'nn....nnnnnnnnnnnnnnnnnnnR',
  '.nnn.nnnnnnnnnnnnnnnnnnn.R', '..nnnnnnNnnnnNnnnnnnnnn...', '...nnnnnnnnnnnnnnnnnnn....', '....nnnRRRRRRRRRRRRnnn....',
  '....nnN..nnN....nnN..nnN..', '....nnN..nnN....nnN..nnN..', '...www..www....www..www...'];
ART.snapling = [
  '.....LLLLL......', '...LLlllllLL....', '..LlllLllllLL...', '..LllllllLlllL..',
  '...LLllllllLL...', '.....LLLLLL.....', '....hhhhhhh.....', '...hhkhhhkhh....',
  '..hkkkkkkkkkh...', '..hkwkwkwkwkh...', '..hkkkkkkkkkh...', '..hkwkwkwkwkh...',
  '...hhhhhhhhh....', '..hh.hh.hh.hh...', '.hh..h...h..hh..'];
ART.treetitan = [
  '.......LLLLLLLLL........', '.....LLlllllllllLL......', '...LLllllLlllllllLLL....', '..LlllllllllLllllllL....',
  '.LllLllllllllllllLllL...', '.LllllllllLllllllllllL..', '..LLlllllllllllllLlLL...', '....LLLLllllllLLLLLL....',
  'hh.....hhhhhhhhhh.....hh', '.hh...hhhhhhhhhhhh...hh.', '..hhhhhhkhhhhhhkhhhhhh..', '...hhhhhhhhhhhhhhhhhh...',
  '......hkkkkkkkkkkh......', '......hkwkwkwkwkwh......', '......hkkkkkkkkkkh......', '......hkwkwkwkwkwh......',
  '......hhhhhhhhhhhh......', '.......hhhhhhhhhh.......', '.......hhh....hhh.......', '......hhhh....hhhh......',
  '.....hhhhh....hhhhh.....', '....hh.h.h....h.h.hh....'];
ART.zapcat = [
  '..........E...E.', '.........EaE.EaE', '.........EEEEEEE', 'B........EEkEEkE',
  'BB.......EEEEtEE', '.BB......EEaaaE.', '..BBBBEEEEEEEE..', '.BB..EEaEEaEEE..',
  'BB..EEEEEEEEEE..', 'B...EEaEEEEaEE..', '....EE.EE.EE.EE.', '....kk.kk.kk.kk.'];
ART.darkzapcat = [
  '..............n...n.', '.............nNn.nNn', '.............nnnnnnn', 'E............nnEnnEn',
  'EE...........nnnnnnn', '.EE..........nnRRRn.', '..EE.......nnnnnnn..', '...EEEEnnnnnEnnnnn..',
  '....nnnnnEnnnnEnnn..', '...nnnnEnnnnnEnnnn..', '...nnnnnnnnnnnnnnn..', '....nnN.nnN.nnN.nnN.',
  '....nnN.nnN.nnN.nnN.', '....EE..EE..EE..EE..'];
ART.demoncat = [
  '................R....R..', '...............RR...RR..', '..............RnnnnnnR..', 'NN...........nnnnnnnnn..',
  'NNN.........nnFFnnnFFnn.', '.NNN........nnnnnnnnnnn.', '..NNNN......nnnRwRwRnn..', '...NNNNN.....nnnnnnnn...',
  'E...NNNNNnnnnnnnnnn.....', 'EE...NNnnnnnnnnnnnnn....', '.EE...nnnnnEnnnnnEnnn...', '..EEE.nnnnnnnEnnnnnnn...',
  '....EEnnnnnnnnnnnnnnn...', '.....nnnnnnnnnnnnnnnn...', '......nnN..nnN..nnN.nnN.', '......nnN..nnN..nnN.nnN.',
  '......nnN..nnN..nnN.nnN.', '.....RRR..RRR..RRR.RRR..'];
// Warfox: four arms, hammers up top, axes down low
ART.warfox = recolor([
  'MMMM......O....O.....MMMM.', 'MmmM......Oo..Oo.....MmmM.', 'MMMM......oooooo.....MMMM.', '..h......cccccccc.....h...',
  '..h......oooooko......h...', '..h......oooooowwwk...h...', '..hoo.....oooowww....ooh..', '...ooo.....owww.....ooo...',
  '.....ooommmmmmmmmooo......', '........mmMmmmMmm.........', '........mmmmmmmmm.........', '.....oooommMmmmmmoooo.....',
  '...oo...ooooooooo...oo....', '..mMm...ooowwwooo...mMm...', '.mmMm...ooowwwooo...mMmm..', '..mMh...ooooooooo...hMm...',
  '....h..ccccccccccc..h.....', '....h...oooo.oooo...h.....', '........ooO...ooO.........', '.......ooOO...ooOO........',
  '.......kkkk...kkkk........'], { O: 'L', c: 'L' });
// Twinblaze: two flaming heads and big wings
ART.twinblaze = [
  '................nnnn......', '...............nnnnFn.....', '..N...........fnnnnnnn....', '.NNN.........fRnnnn.nnnn..',
  'NNNNN.......fRRnnn.nnnFnn.', 'NNNNNN......fRnnn..nnnnnnn', '.NNNNNN.....fRnn..nnnn....', '..NNNNNNN...fRnn.nnnn.....',
  '...NNNNNNNnnfnnnnnnn......', '.F...NNNNnnnnnnnnnnn......', 'FfF...nnnnnnnnnnnnnN......', 'fRfF.nnnnnnnnnnnnnnN......',
  '.fRRnnnnnnnnnnnnnnnN......', '..fRnnnnnnnnnnnnnnnN......', '...NnnnnnnnnnnnnnnnN......', '....nnN.......nnN.........',
  '....nnN.......nnN.........', '....nnN.......nnN.........', '...FfRF......FfRF.........', '....FF........FF..........'];
// Tricano: a stone turtle on two legs with gorilla arms, two steaming volcanoes leaning forward off its rocky shell, and a big rocket launcher in its hands
ART.tricano = [
  '....w.U.....w.U...................',
  '...wUwUw...wUwUw..................',
  '....wUw.....wUw...................',
  '.....u.......u....................',
  '....quq.....quq..qqqq.............',
  '...qqqq....qqqq.qqqkqq............',
  '..qqqqq..qqqqqqqqqqqqq............',
  '..qqQqqqqqqqqqqqqqqqq.............',
  '...qqqqqqqqqqqqyyqqqq.............',
  '...qqqqqQqqqqqyyyyqqqqq...........',
  '..QqqqqqqqqqqqyyyyqqQqqq..........',
  '.QQqQqqqqqqqqqyyyy.qqqQqq.........',
  '.QQqqqqqqqQqqqyyyy..qqqQqq........',
  'QQQqqqqqqqqqqqyyyy.mmmmmmmmmmmmmR.',
  'QQQQqqqqQqqqqqyyyyMMMMMMMMMMMMMMRR',
  'QQQQqqqqqqqqqqyyyymMMMMMMMMMMMMMRR',
  'QQQQ.qqqqqqqqqyyy.mqqqqqqmmmmmmR..',
  'QQQQ..qqqqqqqyyy...qqQqQq.........',
  'QQQQ......qqqq....................',
  'QQQQ.....qqq.qqq..................',
  'QQQQ.....qqq.qqq..................',
  'QQQQ.....qqq.qqq..................',
  'QQQQ....QQQQ.QQQQ.................',
];
// Iron Hound: a big steel hunting hound with a fiery collar
ART.ironhound = [
  '..................II....', '.................IiiI...', '....fFf.fFf.....iiiiii..', 'II..MMMMMMMM....iiRiiiiI',
  '.I.MMiiiiiiMM..iiiiijjjj', '..iiiiiiiiiiiiiiiiijjfF.', '.iiiiiiiiiiiiiiiiiii..f.', 'Iiiiiiiiiijjjjiiiii.....',
  'IIiiiiiiijjjjjiiiI......', '.Iiiiiiiiiiiiiiiii......', '..IiiI......IiiiI.......', '..IiiI......IiiiI.......',
  '..IiiI......IiiiI.......', '.IIIII.....IIIIII.......'];
ART.volcanobun = [
  '...........vv.vv..', '.F..F......vRvvRv.', 'FfFFfF.....vRvvRv.', '.fRRf......vRvvRv.',
  '.vRRv.vRv..vvvvvv.', 'vvRRvvvRvvvvvvkvvv', 'vvvvvvvvvvvvvvvvvR', '.vvvvvvvvvvvvvvvv.',
  '.vvVVVvvvvvvvvvv..', '..vvvvvvvvvvvvvv..', '..VVV.....vvVV....', '.VVVV....VVVVV....'];
// Magma Bunny: a bunny made of pure lava (the whole body shimmers)
ART.magmabunny = [
  '..............RR..RR..', '.............RfR.RfR..', '.............RFR.RFR..', '.............RfR.RfR..',
  '.............RfRRRfR..', '............RffffffR..', '............RfFfffFfR.', '...F........RffffffffR',
  '..FfF.......RffRRRffR.', '.FfRfF...RRRffffffRR..', '..fRf..RRfffFffffffR..', '...RRRRffffffffFfffR..',
  '....RffffFffffffffR...', '....RfffffffFffffffR..', '....RffFffffffffffR...', '.....RRfffRRRRffffR...',
  '....RffR.....RfffR....', '...RfffR....RffffR....', '...RRRRR....RRRRRR....'];
ART.ninjamonkey = [
  '........hhhh......', '.......hhhhhh.....', '...RR.RRRRRRRR....', '..RR..hsksskh.....',
  '.......sssssst....', '........ssss......', '......nnnnnnn.....', '.hh..nnnRnnnnhh...',
  '..hhnnnnRnnnn.hh..', '....nnnnnnnn...hs.', '....nnnnnnnn......', 'F...hnnnnnnh......',
  'fF..hh....hh......', '.Ff.hh....hh......', '..fhhh....hhh.....', '....kk....kkk.....'];
// Sky Ninja: flaming wings and a giant golden sword
ART.skyninja = [
  '......................yY..', '.....................yYy..', '........hhhh........yYy...', '.......hhhhhh......yYy....',
  '...RR.RRRRRRRR....yYy.....', '..RR..hsksskh....yYy......', '.......sssssst..yYy.......', 'f.......ssss...yYy........',
  'Ff....nnnnnnn.hYh.........', 'FfF.nnnnRnnnnhhh..........', '.FfFnnnnRnnnn.............', '..FfnnnnnnnnF.............',
  '...fnnnnnnnnfF............', '....hnnnnnnhFf............', '....hh....hh.f............', '....hh....hh..............',
  '....kk....kkk.............'];
// Zen Ninja: slim and golden with goat horns, floating upright with straight legs over two little flames
ART.zenninja = [
  '..QQ..........QQ..', '...Q..........Q...', '....Q.yyyyyy.Q....', '.....QyyyyyyQ.....',
  '......ykyyky......', '......yyyyyy......', '.......yRRy.......', '.....yyyyyyyy.....',
  '....y.yyyyyy.y....', '....y.yyyyyy.y....', '...y..yyyyyy..y...', '.......yyyyF......',
  '.......y..y.fF....', '.......y..y..Ff...', '.......y..y...F...', '.......Y..Y.......',
  '..................', '......fF..Ff......', '.......f..f.......'];
// Pyrolion: the legendary FIRE/WATER lion with a flaming mane and water-swirl paws
ART.pyrolion = [
  '...............F.F.F......', '..............FfRfRfF.....', '.............FfRRRRRfF....', '............FfRRyyyyRfF...',
  '...........FfRRyykyyyRfF..', '...........fRRyyyyyyyyyRf.', '...........fRyyyyyyykyyyR.', '...........fRRyyyyUUUyyR..',
  '............fRRyyyyyyyR...', 'uu..........FfRRRRRRRRf...', 'Uuu......yyyyyFfRRRRfF....', '.uUu..yyyyyyyyyyyyyyy.....',
  '..uuyyyyyyyyyyyyyyyyy.....', '...yyyyyYyyyyyyyyyyyy.....', '...yyyyyyyyyyyyyyyYyy.....', '....yyyyyyyyyyyyyyyyy.....',
  '....yyY.....yyY..yyY......', '....yyY.....yyY..yyY......', '...UuuU....UuuU.UuuU......'];
// Psyraven: a giant psychic raven with stone-piercing silver feathers
ART.psyraven = [
  'm.m.m.....................', '.mNmNm....................', '..nNnNn..............nnn..', '...nnNnn............nnnnn.',
  '....nnnnn..........nnpnnMM', '.....nnnnnn.......nnnnnMM.', '......nnnnnnn....nnnnnn...', '.......nnnnnnnnnnnnnnn....',
  '........nnnnnNnnnnnnn.....', '......nnnnnnnppnnnnnn.....', 'mm..nnnnnnnnnNNNnnnnn.....', '.mnnnnnnnnnnnnnnnnnn......',
  '..mnnnnnnnnnnnnnnnn.......', '...mmnnn.....nnnnn........', '.............M..M.........', '............MM.MM.........'];
// Stone Bull: carved from stone a thousand years ago: shoulder hump, big curved horns (they fire like rockets), thin legs, tufted tail
ART.stonebull = [
  '..............kw..........wk',
  '...............ww........ww.',
  '................www....www..',
  '........qqqqqq....wwqqqqww..',
  '......qqqqqqqqqq..qqqqqqqq..',
  '....qqqqqqqqqqqqqqqqqFqqqF..',
  '...qqqqqqqqqqqqqqqqqqqqqqqq.',
  '..qqqqqqqqqqqqqqqqqqqQqqqQq.',
  '.eqqqqeqqqqqqqqqqqqqqQkQkQ..',
  '.eqqqqqqqqqqqqqqqqq..QQQQQ..',
  '.e.qqqqqqqqqqqqqqq....yYy...',
  '.e..qqqqqqqqqqqqq...........',
  'QQ..qqQ.qqQ...qqQ.qqQ.......',
  'QQ..qqQ.qqQ...qqQ.qqQ.......',
  '....qqQ.qqQ...qqQ.qqQ.......',
  '....qqQ.qqQ...qqQ.qqQ.......',
  '....QQQ.QQQ...QQQ.QQQ.......',
];
// Saber Stag: a grass deer with a red chin spike and saber teeth
ART.saberstag = [
  '...............h...h....', '..............hh.h.hh...', '...............hhhhh....', '.................hh.....',
  '................LLLL....', '...............LLlkLL...', '...............LlllllL..', '...............LlllllLL.',
  '................LwLwlL..', '................LwLwR...', '...............LllL.R...', '..L...........LllL......',
  '.LlL.LLLLLLLLLlllL......', '.LllLlllllllllllllL.....', '..LlllllllllllllllL.....', '...LlllwwwwwwwlllL......',
  '...LlllllllllllllL......', '...Lll.Lll...Lll.LllL...', '...Lll..LL...LL...LlL...', '...LL...LL...LL....LL...',
  '...kk...kk...kk....kk...'];
ART.aquakylo = [
  '........u.u.u.u.........',
  '......uzuzuzuzuzu.......',
  '....zzzzzzzzzzzzzz......',
  'UU..zzzzZzzzzZzzzzz.....',
  'uUuzzzzzzzzzzzzzzzzzzz..',
  'uuuZzzzZzzzzzzzZzzzzzkz.',
  '.u..zzzzzzzzzzzzzzzzzzzz',
  '....xxxxxxxxxxxxxxzzz...',
  '.....zzZ.zzZ..zzZ.zzZ...',
  '.....zzZ.zzZ..zzZ.zzZ...',
  '.....ZZZ.ZZZ..ZZZ.ZZZ...',
];
ART.brawlkylo = [
  '...............zzzz.......',
  '..............zzzzzkz.....',
  '............u.zzzzzzzz....',
  '...........uzuzzzzzxx.....',
  '..........uzzzzzzzxxzz....',
  '.........uzzzzZzzzxxzzz...',
  '........uzzzzzzzzxxx.zzz..',
  '........zzzzzZzzzxxx..zzz.',
  '.......uzzzzzzzzzxxx..uUu.',
  '.......zzzzZzzzzzxxx.uUUUu',
  '......uzzzzzzzzzxxxxZuUUUu',
  '......zzzzzzzzzzxxxZZ.uUu.',
  '...zzzzzzZzzzzzzxxxZ......',
  'uUzzz..zzzzzzzzzzZZ.......',
  'UUu.....zzzzzzzz.uUu......',
  'uU......zzz...zzuUUUu.....',
  '........zzz...zzzuUu......',
  '.......ZZZZ..ZZZZ.........',
];
ART.frostosaur = [
  '..................AAAAA...',
  '......W.W.W......AAAAkAA..',
  '.....WBWBWBW....AAAAAAAAA.',
  '....AAAAAAAAAA.AAAAAwWwWw.',
  '..AAAAAAHAAAAAAAAAAAAAA...',
  'AAAAAAAAAAAAAAAAAAAA......',
  '.AAAAHAAAAAAAAWWWAAA......',
  '...AAAAAAAAAAAWWWW.AA.....',
  '.......AAAAAAAWWW..AH.....',
  '........AAAA.AAAA.........',
  '........AAA...AAA.........',
  '........AAA...AAA.........',
  '.......HHHH..HHHH.........',
];
ART.xenofrost = [
  '...............HHHHHH.....',
  '..........W.W.HHAAAAHHH...',
  '.........WBWBHHHAAAAkHHH..',
  '........HHHHHHHHHHHHHWwWH.',
  '......HHHHHAHHHHHHHHwHwH..',
  '....HHHHHHHHHHHHHHHHH.....',
  '..HHHHHAHHHHHHHHHHH.HHW...',
  'HHHHHHHHHHHHHHHHHHHH..HWW.',
  '.HHHHHHAHHHHHAAAHH.HHW....',
  '....HHHHHHHHHAAAH....HWW..',
  '......HHHHHHHHAAH.........',
  '.......HHH...HHH..........',
  '.......HHH...HHH..........',
  '......HHHH...HHHH.........',
  '......WWW....WWW..........',
];
ART.firespino = [
  '..........F..F..............',
  '........FfF.FfF.F...........',
  '.......FfRfFfRfFfF..........',
  '.......fRRRfRRRfRf..........',
  '........RRRRRRRRR.....vvv...',
  '......vvvvvvvvvvvvv.vvvkvvvv',
  '...vvvvvvvVvvvvvvvvvvvvvvvvw',
  'vvvvvvvvvvvvvvvvvvvvvv.wwww.',
  '.vvvvVvvvvvvxxxxxvvv........',
  '...vvvvvvvvvxxxxvv.vV.......',
  '......vvvvvvxxxvv..V........',
  '.......vvvv...vvv...........',
  '.......vvv....vvv...........',
  '......VVVV...VVVV...........',
];
ART.twinspino = [
  '..........F..F..F...............',
  '........FfF.FfF.FfF.............',
  '.......FfRfFfRfFfRfF....vvv.....',
  '.......fRRRfRRRfRRRf...vvvkvvvv.',
  '........RRRRRRRRRRRR..vvvvvvvwww',
  '.....vvvvvvvvvvvvvvvvvvv..vvvv..',
  '..vvvvvvvVvvvvvvvvvvvvvv.vvkvvvv',
  'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvwww',
  '.vvvvVvvvvvvvvvvvvvvvvvv........',
  '...vvvvvvvvxxxxxxxxvvvjj........',
  '....vvvvvvvxxxxxxxvvvjj.jj......',
  '.....vvv.vvv...vvv.vvv..jj......',
  '.....vvv.vvv...vvv.vvv..........',
  '....VVVV.VVVV..VVVV.VVVV........',
];
ART.ironrex = [
  '....................m.M.m.....',
  '.....................MmM......',
  '...................j.mM.......',
  '..................jj..m.......',
  '.................jjiiFfiii....',
  '...............iiiiiRFRiiii...',
  '...............iiiiiiiiiiiiI..',
  '...............iiIi.jjj.jjj...',
  '...............iiiij.j.j.j....',
  '...............iiiiiiiiiI.....',
  '..............iiiiIIII........',
  '.........iiiiiiiii............',
  '.....iiiiiI.i.i.iiii..........',
  '..iiiiiiiiIi.i.i.iiiI.ii......',
  'iiiI....iiI.i.i.iiiii..j......',
  '.iI.....iiiiiiiiiiiii.........',
  '........iiiI.iiiiiIi..........',
  '.........iiI..iiiIi...........',
  '.........iI....iiI............',
  '........iiI....iiI............',
  '.......jjjI...jjjI............',
];
const BONES = [
  '..........................gggggg........',
  '.........................ggggggggg......',
  '........................gggkRgggggg.....',
  '........................gggggggggggg....',
  '........................ggg.g.g.g.......',
  '..................gggggggggg.g.g........',
  '..............ggggggg..ggGgggggg........',
  '...........gggg.g.g.g.g.g...............',
  '.......gggg.g.g.g.g.g.g.g...............',
  '...gggg...G.g.g.g.g.g.g.G...............',
  'ggg.......GgggggggggggggG...............',
  '..........GGG.......GGG.................',
  '...........GG........GG.................',
  '..........GGG.......GGG.................',
  '.........gggg......gggg.................',
];
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

/* ---------------- shiny recoloring ---------------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// cfg: { hue: degrees to rotate, sat: saturation multiplier } or { set: [hue, saturation] } for grey critters.
// Dark outline pixels and near-white highlights stay as they are.
function recolorCanvas(src, cfg) {
  const [c, g] = mk(src.width, src.height);
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (l < 0.24 || l > 0.93) continue;
    if (cfg.set) { h = cfg.set[0]; s = cfg.set[1]; }
    else { h += cfg.hue || 0; s = Math.min(1, s * (cfg.sat || 1)); }
    [d[i], d[i + 1], d[i + 2]] = hslToRgb(h, s, l);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ---------------- build everything (needs a browser) ---------------- */
export function buildArt(speciesTable, gyms = {}) {
  const NO = { outline: false };
  const KID = {
    down: sprite(P_DOWN, NO), downA: sprite(withRows(P_DOWN, 14, LEGS_STEP), NO), downB: sprite(withRows(P_DOWN, 14, LEGS_STEP), { outline: false, flip: true }),
    up: sprite(P_UP, NO), upA: sprite(withRows(P_UP, 14, LEGS_STEP), NO), upB: sprite(withRows(P_UP, 14, LEGS_STEP), { outline: false, flip: true }),
    right: sprite(P_SIDE, NO), rightW: sprite(withRows(P_SIDE, 13, LEGS_SIDE), NO),
    left: sprite(P_SIDE, { outline: false, flip: true }), leftW: sprite(withRows(P_SIDE, 13, LEGS_SIDE), { outline: false, flip: true }),
  };

  // R = facing right (your side), L = facing left (wild side). Two frames so flames and steam flicker.
  const SPR = {};
  for (const [k, s] of Object.entries(speciesTable)) {
    const a = ART[k], b = s.flicker ? swapPair(a, s.flicker) : a, outline = !NO_OUTLINE.has(k);
    SPR[k] = {
      R: [sprite(a, { outline }), sprite(b, { outline })],
      L: [sprite(a, { outline, flip: true }), sprite(b, { outline, flip: true })],
      W: sprite(a, { outline, tint: '#ffffff' }),
      WL: sprite(a, { outline, flip: true, tint: '#ffffff' }),
    };
  }
  // Shiny versions are made on demand by recoloring the normal sprite (see SHINY in data.js).
  const shinyCache = {};
  function sprites(sp, shinyCfg) {
    if (!shinyCfg) return SPR[sp];
    return (shinyCache[sp] ||= {
      R: SPR[sp].R.map(c => recolorCanvas(c, shinyCfg)),
      L: SPR[sp].L.map(c => recolorCanvas(c, shinyCfg)),
      W: SPR[sp].W, WL: SPR[sp].WL,
    });
  }
  const urlCache = {};
  const spriteURL = (sp, shinyCfg) => (urlCache[sp + (shinyCfg ? '*' : '')] ||= sprites(sp, shinyCfg).R[0].toDataURL());

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
    signPost: tile(g => {   // see-through sign, drawn over the ground of wherever it sits
      px(g, '#4a2e17', 7, 9, 2, 7); px(g, '#7a4e2b', 7, 9, 1, 7);
      px(g, '#5b3a20', 2, 2, 12, 8); px(g, '#d39c5c', 3, 3, 10, 6);
      px(g, '#9a6a37', 4, 4, 8, 1); px(g, '#9a6a37', 4, 6, 6, 1);
      px(g, '#5b3a20', 3, 10, 10, 1);
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
    forestFloor: [0, 1, 2].map(seed => tile(g => {
      px(g, '#4f7a3c', 0, 0, 16, 16);
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(hash(seed + 40, i * 7) * 14), y = Math.floor(hash(i * 5, seed + 40) * 14);
        px(g, i % 2 ? '#6b4f2a' : '#3f6630', x, y, 2, 1);
      }
    })),
    forestTree: tile(g => {
      px(g, '#4f7a3c', 0, 0, 16, 16);
      px(g, '#2e1d10', 5, 11, 6, 5); px(g, '#5a3a20', 6, 11, 4, 5);
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 6.5);
        if (d < 7.6) px(g, d > 6.6 ? '#0f2a18' : '#1f4a2c', x, y);
      }
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 5, y - 4) < 2.8) px(g, '#2d5f39', x, y);
      px(g, '#3f7a4a', 4, 3, 2, 1); px(g, '#2d5f39', 10, 9, 2, 1);
    }),
    undergrowth: tile(g => {
      px(g, '#45703a', 0, 0, 16, 16);
      const fern = ['l.l.l', '.lLl.', 'L.L.L', '.LLL.', '..L..'];
      for (const [ox, oy] of [[1, 1], [9, 0], [5, 6], [11, 9], [0, 10]])
        fern.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'l') px(g, '#7cc56a', ox + x, oy + y);
          if (ch === 'L') px(g, '#2a5a2e', ox + x, oy + y);
        }));
    }),
    mushrooms: tile(g => {
      px(g, '#4f7a3c', 0, 0, 16, 16);
      for (const [x, y] of [[3, 5], [10, 3], [8, 11]]) {
        px(g, '#f3e6c8', x + 1, y + 2, 2, 3);
        px(g, '#2a2135', x - 1, y - 1, 6, 4); px(g, '#d94a3a', x, y, 4, 2); px(g, '#ffffff', x + 1, y, 1, 1);
      }
    }),
    ash: [0, 1, 2].map(seed => tile(g => {
      px(g, '#4a3d3a', 0, 0, 16, 16);
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(hash(seed + 70, i * 7) * 14), y = Math.floor(hash(i * 5, seed + 70) * 14);
        px(g, i === 0 ? '#ff7a2a' : '#3a2f2c', x, y, i === 0 ? 1 : 2, 1);
      }
    })),
    lava: [0, 1].map(f => tile(g => {
      px(g, '#e2392b', 0, 0, 16, 16);
      px(g, '#ff7a2a', 2 + f * 3, 3, 5, 2); px(g, '#ff7a2a', 9 - f * 2, 9, 5, 2); px(g, '#ffd23f', 4 + f * 2, 12, 3, 1); px(g, '#ffd23f', 11 - f * 3, 5, 2, 1);
    })),
    embers: tile(g => {
      px(g, '#3a2f2c', 0, 0, 16, 16);
      for (const [x, y] of [[1, 2], [8, 1], [12, 6], [3, 8], [9, 10], [12, 13], [2, 13], [6, 5]]) {
        px(g, '#1f1816', x, y + 1, 3, 1); px(g, '#5a4a44', x, y, 3, 1); px(g, '#ff7a2a', x + 1, y - 1, 1, 1);
      }
    }),
    blackrock: tile(g => {
      px(g, '#4a3d3a', 0, 0, 16, 16);
      for (let y = 2; y < 16; y++) for (let x = 0; x < 16; x++) {
        const v = ((x - 7.5) / 7.5) ** 2 + ((y - 9.5) / 6.5) ** 2;
        if (v <= 1) px(g, v > 0.8 ? '#120d0c' : (y < 8 ? '#3d3330' : '#2a2220'), x, y);
      }
      px(g, '#5a4a44', 4, 5, 3, 1); px(g, '#ff7a2a', 9, 10, 1, 2);
    }),
    jungle: [0, 1, 2].map(seed => tile(g => {
      px(g, '#a8995f', 0, 0, 16, 16);
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(hash(seed + 90, i * 7) * 14), y = Math.floor(hash(i * 5, seed + 90) * 14);
        px(g, i % 2 ? '#8c7e48' : '#6f8f3a', x, y, 2, 1);
      }
    })),
    ferns: tile(g => {
      px(g, '#6e8a3c', 0, 0, 16, 16);
      const fern = ['l...l', '.l.l.', 'LlLlL', '.LLL.', '..L..'];
      for (const [ox, oy] of [[0, 0], [8, 1], [4, 6], [11, 8], [0, 10], [8, 11]])
        fern.forEach((row, y) => [...row].forEach((ch, x) => {
          if (ch === 'l') px(g, '#b8d65e', ox + x, oy + y);
          if (ch === 'L') px(g, '#3d5f24', ox + x, oy + y);
        }));
    }),
    cycad: tile(g => {
      px(g, '#a8995f', 0, 0, 16, 16);
      px(g, '#4a2e17', 6, 7, 4, 9); px(g, '#7a5a2b', 7, 7, 2, 9); px(g, '#4a2e17', 6, 10, 4, 1); px(g, '#4a2e17', 6, 13, 4, 1);
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 0], [1, 0], [0, -1]])
        for (let i = 0; i < 7; i++) { px(g, '#2f5a22', 7 + dx * i, 6 + dy * Math.round(i * 0.7) + (dx ? Math.floor(i / 3) : -i), 2, 2); }
      px(g, '#5f9a3a', 4, 3, 3, 1); px(g, '#5f9a3a', 10, 3, 3, 1);
    }),
    tar: [0, 1].map(f => tile(g => {
      px(g, '#1e1a24', 0, 0, 16, 16);
      px(g, '#3a3445', 4 + f * 4, 6, 2, 2); px(g, '#3a3445', 10 - f * 3, 11, 2, 1); px(g, '#4f4860', 3, 3, 3, 1); px(g, '#4f4860', 11, 2 + f, 2, 1);
    })),
    bones: tile(g => {   // see-through: drawn over the ground of wherever it sits
      px(g, '#2a2135', 2, 9, 12, 4); px(g, '#f3e6c8', 3, 10, 10, 2);
      px(g, '#2a2135', 1, 8, 3, 6); px(g, '#f3e6c8', 2, 9, 1, 4); px(g, '#2a2135', 12, 8, 3, 6); px(g, '#f3e6c8', 13, 9, 1, 4);
      px(g, '#2a2135', 5, 3, 6, 4); px(g, '#ddd0bb', 6, 4, 4, 2); px(g, '#2a2135', 7, 4, 1, 1);
    }),
    busStop: tile(g => {
      px(g, '#7cc56a', 0, 0, 16, 16);
      px(g, '#2a2135', 7, 6, 2, 10); px(g, '#6b7488', 7, 6, 1, 10);           // pole
      px(g, '#2a2135', 1, 0, 14, 8); px(g, '#2f6fc0', 2, 1, 12, 6);           // sign
      px(g, '#ffd23f', 4, 2, 8, 3); px(g, '#a8dcf7', 5, 2, 2, 1); px(g, '#a8dcf7', 8, 2, 2, 1);   // little bus
      px(g, '#2a2135', 5, 5, 1, 1); px(g, '#2a2135', 10, 5, 1, 1);
    }),
    gate: [false, true].map(open => tile(g => {
      px(g, '#e4cc92', 0, 0, 16, 16);
      for (const x of [1, 12]) { px(g, '#4a2e17', x, 1, 3, 15); px(g, '#8a5a2e', x + 1, 2, 1, 13); px(g, '#2a2135', x, 0, 3, 1); }
      if (!open) {
        for (const y of [4, 9]) { px(g, '#4a2e17', 4, y, 8, 3); px(g, '#a26c39', 4, y + 1, 8, 1); }
        px(g, '#2a2135', 6, 6, 4, 4); px(g, '#ffd23f', 7, 7, 2, 2);
      }
    })),
  };

  // A 5x4-tile house; roof = [main, shingle lines, highlight].
  function makeHouse(roof) {
    const [c, g] = mk(80, 64);
    px(g, '#2a2135', 58, 0, 10, 14); px(g, '#9c4a3a', 59, 1, 8, 13); px(g, '#7c3a2e', 59, 5, 8, 1); px(g, '#7c3a2e', 59, 9, 8, 1);
    px(g, '#2a2135', 0, 6, 80, 26); px(g, roof[0], 1, 7, 78, 24);
    for (let y = 10; y < 31; y += 5) px(g, roof[1], 1, y, 78, 1);
    for (let y = 7; y < 31; y += 5) for (let x = (y / 5) % 2 ? 4 : 9; x < 79; x += 10) px(g, roof[1], x, y, 1, 3);
    px(g, roof[2], 1, 7, 78, 1);
    px(g, '#2a2135', 3, 31, 74, 33);
    px(g, '#f3e6c8', 4, 31, 72, 32); px(g, '#e2d2ae', 4, 31, 72, 2); px(g, '#d6c39b', 4, 60, 72, 3);
    for (const wx of [12, 54]) {
      px(g, '#5b4a3a', wx, 38, 14, 12); px(g, '#a8dcf7', wx + 1, 39, 12, 10);
      px(g, '#d9f1fb', wx + 2, 40, 3, 3); px(g, '#5b4a3a', wx + 6, 39, 2, 10); px(g, '#5b4a3a', wx + 1, 43, 12, 1);
      px(g, roof[1], wx - 1, 50, 16, 2);
    }
    px(g, '#2a2135', 33, 42, 14, 22); px(g, '#8a5a2e', 34, 43, 12, 21); px(g, '#a26c39', 35, 44, 4, 19);
    px(g, '#f2c94c', 43, 53, 2, 2);
    return c;
  }
  const HOUSES = {
    red: makeHouse(['#c8473a', '#a53a2f', '#e2685a']),
    blue: makeHouse(['#3f78c9', '#2f5ea3', '#6b9ee0']),
    green: makeHouse(['#4f9a55', '#3c7a42', '#78bf7c']),
    straw: makeHouse(['#c9a24a', '#a7832f', '#e3c26a']),
  };

  // A 9x5-tile gym hall with a badge on the roof and a GYM sign. style: 'stone' (Pebble) or 'wood' (Mossy).
  function makeGym(style) {
    const st = {
      wood:  { roof: '#3f7a3c', roofLine: '#2f5f2e', roofHi: '#5fa05a', wall: '#a9784a', wallLine: '#8a5f36', badge: ['#2f5f2e', '#4caf50', '#7fd35b'], door: ['#4a2e17', '#6b4226'], sign: '#3f7a3c', planks: true },
      stone: { roof: '#4a5568', roofLine: '#3a4352', roofHi: '#6b7891', wall: '#a3a9b5', wallLine: '#8a909c', badge: ['#2a2135', '#9a948c', '#bdb8b0'], door: ['#5b6577', '#748098'], sign: '#c0443a' },
      maple: { roof: '#d9762e', roofLine: '#b45c1f', roofHi: '#f29a52', wall: '#e9d3a8', wallLine: '#cdb382', badge: ['#8a3d12', '#e8742c', '#ffb36b'], door: ['#6b4226', '#8a5a2e'], sign: '#d9762e', planks: true },
      ember: { roof: '#8f1f18', roofLine: '#6b1610', roofHi: '#c0443a', wall: '#3d3330', wallLine: '#2a2220', badge: ['#2a2135', '#e2392b', '#ffd23f'], door: ['#1f1816', '#3a2f2c'], sign: '#e2392b' },
    }[style];
    const [c, g] = mk(144, 80);
    px(g, '#2a2135', 0, 4, 144, 30); px(g, st.roof, 1, 5, 142, 28);
    for (let y = 9; y < 33; y += 6) px(g, st.roofLine, 1, y, 142, 1);
    px(g, st.roofHi, 1, 5, 142, 1);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) {
      const d = Math.hypot(x - 12.5, y - 12.5);
      if (d < 12.5) px(g, d > 11 ? '#2a2135' : d > 8 ? st.badge[1] : st.badge[2], 59 + x, 2 + y);
    }
    if (style === 'wood' || style === 'maple') { px(g, st.badge[0], 71, 7, 2, 16); px(g, st.badge[0], 66, 12, 12, 2); }
    else if (style === 'ember') { px(g, '#ff7a2a', 69, 9, 6, 12); px(g, '#ffd23f', 70, 13, 4, 7); px(g, '#ff7a2a', 71, 6, 2, 3); }
    else { px(g, '#e3dfd8', 66, 8, 4, 3); px(g, '#6f6a64', 72, 16, 5, 1); }
    px(g, '#2a2135', 4, 33, 136, 47); px(g, st.wall, 5, 33, 134, 46);
    for (let y = 37; y < 79; y += 6) {
      px(g, st.wallLine, 5, y, 134, 1);
      if (!st.planks) for (let x = (y / 6) % 2 ? 9 : 19; x < 139; x += 20) px(g, st.wallLine, x, y - 5, 1, 5);
    }
    for (const wx of [16, 108]) { px(g, '#2a2135', wx, 44, 20, 16); px(g, '#a8dcf7', wx + 1, 45, 18, 14); px(g, '#d9f1fb', wx + 2, 46, 4, 4); px(g, '#2a2135', wx + 9, 45, 2, 14); }
    px(g, '#2a2135', 63, 34, 19, 11); px(g, st.sign, 64, 35, 17, 9);
    const letters = { G: ['###', '#..', '#.#', '#.#', '###'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'] };
    let lx = 66;
    for (const ch of 'GYM') { letters[ch].forEach((row, y) => [...row].forEach((p, x) => { if (p === '#') px(g, '#ffffff', lx + x, 37 + y); })); lx += letters[ch][0].length + 1; }
    px(g, '#2a2135', 64, 52, 16, 28); px(g, st.door[0], 65, 53, 14, 27); px(g, st.door[1], 66, 54, 5, 25); px(g, '#ffd23f', 75, 66, 2, 2);
    return c;
  }
  const LEGEND_VOLCANO = (() => {
    const [c, g] = mk(48, 48);
    for (let y = 8; y < 48; y++) for (let x = 0; x < 48; x++) {
      const half = 6 + (y - 8) * 0.48;
      if (Math.abs(x - 23.5) <= half) px(g, Math.abs(x - 23.5) > half - 1.2 ? '#120d0c' : (x < 23.5 - half * 0.3 ? '#4a3d3a' : '#3a2f2c'), x, y);
    }
    px(g, '#120d0c', 16, 6, 16, 4); px(g, '#e2392b', 18, 7, 12, 3); px(g, '#ffd23f', 21, 7, 6, 1);
    px(g, '#e2392b', 23, 10, 2, 14); px(g, '#ff7a2a', 23, 12, 1, 8);              // lava stream
    px(g, '#9c958c', 14, 0, 6, 4); px(g, '#bdb8b0', 22, 1, 7, 4); px(g, '#9c958c', 29, 0, 5, 3);   // smoke
    px(g, '#120d0c', 20, 38, 8, 10); px(g, '#e2392b', 21, 39, 6, 9); px(g, '#ff7a2a', 22, 41, 4, 7); // glowing cave mouth
    return c;
  })();
  // Legendary spots: the tallest tree (with and without the raven), the bull statue, and the forest shrine.
  function makeTallTree(withRaven) {
    const [c, g] = mk(16, 32);
    px(g, '#4a2e17', 6, 22, 4, 10); px(g, '#7a4e2b', 7, 22, 2, 10);
    for (let y = 2; y < 26; y++) for (let x = 0; x < 16; x++) {
      const half = Math.min(7.5, 2 + (y - 2) * 0.35 + (y % 4 === 0 ? 1 : 0));
      if (Math.abs(x - 7.5) <= half) px(g, Math.abs(x - 7.5) > half - 1 ? '#0f2a18' : (x < 7 ? '#2f7f40' : '#1f5530'), x, y);
    }
    if (withRaven) { px(g, '#2a2135', 4, 0, 8, 4); px(g, '#3a2f52', 5, 0, 6, 3); px(g, '#f0a3b5', 9, 1, 1, 1); px(g, '#6b7488', 11, 1, 2, 1); }
    return c;
  }
  function makeBones(eyesBurning) {
    const [c, g] = mk(48, 32);
    const rows = eyesBurning ? BONES : BONES.map(r => r.replace('R', 'k'));
    const img = sprite(rows, { outline: true });
    g.drawImage(img, Math.floor((48 - img.width) / 2), 32 - img.height);
    if (eyesBurning) { px(g, '#bdb8b0', 31, 13, 2, 2); px(g, '#9c958c', 33, 10, 2, 2); px(g, '#bdb8b0', 32, 7, 2, 2); }   // smoke from the eye
    return c;
  }
  const LEGEND_SPOTS = {
    treeWithRaven: makeTallTree(true), tree: makeTallTree(false),
    statue: (() => {
      const [c, g] = mk(32, 32);
      px(g, '#2a2135', 1, 22, 30, 10); px(g, '#8a8273', 2, 23, 28, 8); px(g, '#a39a8a', 2, 23, 28, 2);   // pedestal
      const bull = sprite(ART.stonebull, { outline: true });
      g.drawImage(bull, Math.floor((32 - bull.width) / 2), 22 - bull.height);
      return c;
    })(),
    bones: makeBones(true), bonesQuiet: makeBones(false),
    shrine: (() => {
      const [c, g] = mk(32, 32);
      px(g, '#2a2135', 0, 4, 32, 6); px(g, '#8a8273', 1, 5, 30, 4); px(g, '#4caf50', 1, 5, 30, 1);    // roof stone with moss
      for (const x of [3, 24]) { px(g, '#2a2135', x, 9, 6, 23); px(g, '#a39a8a', x + 1, 10, 4, 22); px(g, '#4caf50', x + 1, 14, 2, 3); }
      px(g, '#1f3d24', 9, 10, 15, 22); px(g, '#7fd35b', 13, 14, 7, 1); px(g, '#7fd35b', 15, 12, 3, 6); // glowing antler sign
      px(g, '#9be08a', 16, 20, 1, 1);
      return c;
    })(),
  };
  const GYM_IMG = { stone: makeGym('stone'), wood: makeGym('wood'), maple: makeGym('maple'), ember: makeGym('ember') };
  const LEADERS = {
    brick: sprite(recolor(P_DOWN, { c: 'Q', r: 'O', b: 'V', w: 'F' }), NO),
    ivy: sprite(recolor(P_DOWN, { c: 'L', r: 'l', b: 'n', w: 'p', h: 'O' }), NO),
    hazel: sprite(recolor(P_DOWN, { c: 'o', r: 'y', b: 'h', w: 'R' }), NO),
    pyra: sprite(recolor(P_DOWN, { c: 'R', r: 'f', b: 'n', h: 'R', w: 'F' }), NO),
  };

  // Battle backdrops: sunny meadow, rocky mountain, the gym hall.
  function makeField(platforms, kind) {
    const [c, g] = mk(240, 160);
    if (kind === 'forest') {
      px(g, '#1f3d24', 0, 0, 240, 48);
      for (let x = 0; x < 240; x++) {
        const c1 = 8 + Math.round(Math.sin(x / 9) * 4 + Math.sin(x / 4) * 2);
        px(g, '#2d5f39', x, 0, 1, c1 + 8); px(g, '#3f7a4a', x, 0, 1, c1);
      }
      for (const tx of [14, 62, 128, 170, 222]) { px(g, '#2e1d10', tx, 14, 10, 34); px(g, '#4a2e17', tx + 2, 14, 3, 34); }
      for (const [lx, ly] of [[40, 20], [100, 12], [150, 26], [200, 18]]) px(g, '#f2e9a0', lx, ly, 2, 2);   // fireflies
    } else if (kind === 'volcano') {
      ['#3a1410', '#4a1a12', '#5a2014', '#6b2816', '#7a3018', '#8a381a'].forEach((col, i) => px(g, col, 0, i * 7, 240, 7));
      for (let x = 0; x < 240; x++) {
        const peak = 18 + Math.round(Math.abs(((x + 50) % 120) - 60) * 0.45);
        px(g, '#2a1f1c', x, peak, 1, 60);
        if (Math.abs(((x + 50) % 120) - 60) < 4) px(g, '#e2392b', x, peak, 1, 4);
      }
      for (const [sx, sy] of [[60, 6], [180, 4], [120, 14]]) { px(g, '#5a4a44', sx, sy, 10, 4); px(g, '#6b5a52', sx + 3, sy - 3, 8, 4); }
      px(g, '#e2392b', 0, 42, 240, 3); px(g, '#ff7a2a', 0, 43, 240, 1);          // far lava river
    } else if (kind === 'prehistoric') {
      ['#f2a45c', '#f2b468', '#f2c374', '#efcf84', '#e9d894', '#e2dea2'].forEach((col, i) => px(g, col, 0, i * 7, 240, 7));
      px(g, '#fff0b8', 180, 6, 14, 14); px(g, '#ffe68a', 182, 8, 10, 10);                                   // big sun
      for (let x = 0; x < 240; x++) {
        const peak = 20 + Math.round(Math.abs(((x + 90) % 160) - 80) * 0.35);
        px(g, '#8a6a52', x, peak, 1, 60);
        if (Math.abs(((x + 90) % 160) - 80) < 3) px(g, '#e2392b', x, peak, 1, 3);
        const hill = 34 + Math.round(Math.sin(x / 15) * 3);
        px(g, '#6f8f3a', x, hill, 1, 20);
      }
      for (const tx of [20, 96, 150, 214]) {                                                            // palm trees
        px(g, '#4a2e17', tx, 20, 3, 26);
        for (let i = 0; i < 9; i++) { px(g, '#2f5a22', tx + 1 + i, 19 + Math.floor(i / 3), 2, 2); px(g, '#2f5a22', tx - i, 19 + Math.floor(i / 3), 2, 2); }
      }
      for (const [bx, by] of [[60, 10], [120, 6]]) { px(g, '#5a4a44', bx, by + 2, 12, 1); px(g, '#5a4a44', bx + 4, by + 1, 4, 3); px(g, '#5a4a44', bx + 8, by, 3, 1); }  // pterodactyls
    } else if (kind.startsWith('gym')) {
      px(g, '#6e7584', 0, 0, 240, 48);
      for (let y = 6; y < 48; y += 7) {
        px(g, '#5c6371', 0, y, 240, 1);
        for (let x = (y / 7) % 2 ? 0 : 14; x < 240; x += 28) px(g, '#5c6371', x, y - 6, 1, 6);
      }
      const banner = kind.split(':')[1] || '#c0443a';
      for (const bx of [30, 110, 190]) { px(g, '#2a2135', bx, 8, 20, 30); px(g, banner, bx + 1, 9, 18, 28); px(g, '#ffd23f', bx + 8, 18, 4, 4); }
      px(g, '#4a5568', 0, 44, 240, 4);
    } else {
      const sky = kind === 'mountain' ? ['#b9d3e6', '#c4dbea', '#cfe2ee', '#dae9f1', '#e3eef2', '#ebf2f2'] : ['#a9dcf0', '#b6e2f2', '#c3e8f3', '#d0edf4', '#dcf1f3', '#e6f4f1'];
      sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 7, 240, 7); });
      const cloud = (x, y) => { px(g, '#ffffff', x + 4, y, 14, 4); px(g, '#ffffff', x, y + 3, 24, 4); px(g, '#eaf6fb', x, y + 6, 24, 1); };
      cloud(22, 8); cloud(112, 4); cloud(196, 14);
      for (let x = 0; x < 240; x++) {
        if (kind === 'mountain') {
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
    }
    const look = {
      meadow:   { bands: ['#9cd27b', '#a5d985'], plat: ['#5d9c4c', '#92ce6e', '#7fbd5f'] },
      mountain: { bands: ['#c4b79d', '#bcae93'], plat: ['#857a68', '#d3c8b1', '#ab9f86'] },
      forest:   { bands: ['#5d8a45', '#56813f'], plat: ['#3c5f2c', '#7aa85c', '#638f4a'] },
      volcano:  { bands: ['#4a3d3a', '#433633'], plat: ['#1f1816', '#6b5a52', '#5a4a44'] },
      prehistoric: { bands: ['#a8995f', '#9f9057'], plat: ['#5a5a2a', '#c7b878', '#998b52'] },
      gym:      { bands: ['#cfc8b8', '#c6bfae'], plat: ['#8a8273', '#e4dccb', '#b9b09d'] },
    }[kind.startsWith('gym') ? 'gym' : kind];
    for (let y = 46; y < 160; y++) { g.fillStyle = look.bands[Math.floor((y - 46) / 6) % 2]; g.fillRect(0, y, 240, 1); }
    const [edge, top, base] = look.plat;
    for (const [cx, cy, rx, ry] of platforms)
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
        const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (v <= 1) px(g, v > 0.78 ? edge : y < cy - ry * 0.25 ? top : base, x, y);
      }
    return c;
  }
  const BATTLE_PLATFORMS = [[184, 54, 42, 9], [66, 100, 48, 10]];
  const BG = {
    meadow: makeField(BATTLE_PLATFORMS, 'meadow'),
    mountain: makeField(BATTLE_PLATFORMS, 'mountain'),
    forest: makeField(BATTLE_PLATFORMS, 'forest'),
    volcano: makeField(BATTLE_PLATFORMS, 'volcano'),
    prehistoric: makeField(BATTLE_PLATFORMS, 'prehistoric'),
    choose: makeField([48, 120, 192].map(x => [x, 98, 30, 7]), 'meadow'),
  };
  for (const [id, gym] of Object.entries(gyms)) BG['gym-' + id] = makeField(BATTLE_PLATFORMS, 'gym:' + (gym.banner || '#c0443a'));

  return { KID, sprites, TILES, HOUSES, GYM_IMG, LEADERS, LEGEND_VOLCANO, LEGEND_SPOTS, BG, spriteURL };
}
