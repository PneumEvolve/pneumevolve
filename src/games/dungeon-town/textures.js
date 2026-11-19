// Pixel art: each letter in a sprite is a palette colour.

// ===================================================================
//  PIXEL ART — each letter is a colour
// ===================================================================
export const PAL = {
  N: '#9c8a64',
  k: '#14161a', K: '#2b2f36', g: '#6b737c', G: '#4f565e', w: '#e8e6df',
  s: '#d9a066', S: '#a8743f', t: '#3fa7a0', T: '#23706b', b: '#6b4a2b', B: '#3f2a18',
  z: '#8fae4a', Z: '#56702a', r: '#d0392b', R: '#7a1f17', o: '#e08a3c', O: '#9c5520',
  y: '#f2d14b', p: '#7d5ba6', P: '#4b3566', c: '#5fd3ff', C: '#2a7fa8',
  m: '#9aa4ad', M: '#4a525a', e: '#fff2a8', l: '#b5c94f', L: '#6f7d2a', n: '#c9b28a',
};

export const SPR = {
  bbullet: ['.RR.', 'Rrr R', 'RrrR', '.RR.'].map(r => r.replace(' ', '')),
  hero: ['................', '.....kkkkk......', '....kBbbbbk.....', '....kbbbbbbk....', '....kbsssSk.....', '....kskskSk.....', '....kssssSk.....', '...kkttttTkk....', '..ktttTtttTtk...', '..ksTttttttsk...', '..kskTtttTksk...', '...kkKKKKKkk....', '....kKKkKKk.....', '....kKk.kKk.....', '....kBk.kBk.....', '....kkk.kkk.....'],
  walker: ['................', '.....kkkkk......', '....kzzzzzk.....', '....kzzrzrk.....', '....kzzzzZk.....', '.....kZZZk......', '....kpppppkkkkk.', '...kpPpppPzzzzk.', '...kpppppppkkkk.', '...kpPpppPk.....', '....kKKKKKk.....', '....kKk.kKk.....', '....kZk.kZk.....', '....kkk.kkk.....', '................', '................'],
  runner: ['................', '................', '................', '......kkkk......', '.....kzzzzk.....', '.....kzrzrk.....', '.....kzzzZk.....', '....kkRRRRkkk...', '...kzRrRRrRzzk..', '...kkRRRRRkkkk..', '.....kKKKk......', '....kKk.kKk.....', '....kZk..kZk....', '....kk....kk....', '................', '................'],
  spitter: ['................', '.....kkkkkk.....', '....kppppppk....', '...kpPppppPpk...', '...kpprpprppk...', '...kpppppppPk...', '....kplllllk....', '.....kPPPPk.....', '....kzzzzzzk....', '...kzZzzzzZzk...', '...kzkzzzzkzk...', '....kKKKKKk.....', '....kKk.kKk.....', '....kkk.kkk.....', '................', '................'],
  brute: ['...kkkkkkkkk....', '..kzzzzzzzzzk...', '..kzzrzzzrzzk...', '..kZzzzzzzzZk...', '.kkkMMMMMMMkkk..', 'kzzkMmmmmmmMkzzk', 'kzzkMmMmmMmMkzzk', 'kZzkMmmmmmmMkzZk', 'kZZkMMMMMMMMkZZk', '.kkkKKKKKKKKkkk.', '...kKKKkkKKKk...', '...kKKk..kKKk...', '...kZZk..kZZk...', '...kkkk..kkkk...', '................', '................'],
  bloater: ['................', '......kkkk......', '.....kzzzzk.....', '.....kzrrzk.....', '....kkkzzkkk....', '...kllllllllk...', '..kllLllllLllk..', '..klllllllllLk..', '..kLlllyylllLk..', '..klllllllllLk..', '...kLllllllLk...', '....kkLLLLkk....', '.....kZkkZk.....', '.....kkk.kkk....', '................', '................'],
  hound: ['................', '................', '................', '................', '...........kk...', '..........kook..', '..k......kooek..', '.kok.....koooOk.', '..kokkkkkkooook.', '...koooooooookk.', '...kooOooooook..', '...kooooooook...', '...kOk.kOk.kOk..', '...kk..kk..kk...', '................', '................'],
  crow: ['................', '................', '................', '.........kkk....', '........kPPPk...', '...kk..kPPePyk..', '..kcck.kPPPPkk..', '..kcPPkPPPPk....', '...kPPPPPPPk....', '....kPPPPPPk....', '.....kPcPPk.....', '......kkyk......', '.......kyk......', '................', '................', '................'],
  crate: ['kkkkkkkkkkkkkkkk', 'kbbbbbbbbbbbbbbk', 'kbBbbbbbbbbbbBbk', 'kbbBbbbbbbbbBbbk', 'kbbbBbbbbbbBbbbk', 'kbbbbBbbbbBbbbbk', 'kbbbbbBbbBbbbbbk', 'kbbbbbbBBbbbbbbk', 'kbbbbbbBBbbbbbbk', 'kbbbbbBbbBbbbbbk', 'kbbbbBbbbbBbbbbk', 'kbbbBbbbbbbBbbbk', 'kbbBbbbbbbbbBbbk', 'kbBbbbbbbbbbbBbk', 'kbbbbbbbbbbbbbbk', 'kkkkkkkkkkkkkkkk'],
  rubble: ['................', '...kkkkkk.......', '..kgggggGkk.....', '.kggGgggggGkkk..', '.kgggggkgggGggk.', 'kgGggggkkgggggk.', 'kggggGgggggGggkk', 'kgggggggGggggGgk', 'kGggggggggggggGk', 'kgggGgggGggggggk', '.kgggggggGgggGk.', '.kkGggggggggGkk.', '...kkkgggGkkk...', '.....kkkkkk.....', '................', '................'],
  cage: ['................', '..kkkkkkkkkkkk..', '..kmmmmmmmmmmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmkMkMkMkMmk..', '..kmmmmmmmmmmk..', '..kkkkkkkkkkkk..', '................'],
  medkit: ['.kkkkkk.', 'kwwwwwwk', 'kwwrrwwk', 'kwrrrrwk', 'kwwrrwwk', 'kwwwwwwk', '.kkkkkk.'],
  treat: ['........', '.kk..kk.', 'kwwkkwwk', '.kwwwwk.', 'kwwkkwwk', '.kk..kk.', '........'],
  lure: ['.kkkkkk.', 'kyyyyyyk', 'kykkkkyk', 'kykrrkyk', 'kykkkkyk', 'kyyyyyyk', '.kkkkkk.'],
  food: ['..y..y..', '.yZy.yZ.', '..yZyZ..', '...yZ...', '...bb...', '..bBBb..', '..bBBb..', '...bb...'],
  part: ['.mm.mm.', 'mMMMMMm', '.MkkkM.', 'mMk.kMm', '.MkkkM.', 'mMMMMMm', '.mm.mm.'],
  ammo: ['.y...y...y.', 'yyy.yyy.yyy', 'GGG.GGG.GGG', 'GGG.GGG.GGG', 'GGG.GGG.GGG', 'kkk.kkk.kkk'],
  salvage: ['............kk..', '...........kgk..', '..........kgk...', '.........kgk....', '....kkkkkgk.....', '....kgggggk.....', '....kgk..k......', '....kgk..y......', '....kgk.kmk.....', '..kkkgkkmMmk....', '.kMmGmMkRrMmk...', 'kmMgGMmMrRmMgk..', 'kMgmMgGmMgMmGmk.', 'kmMGmMgMmGmMgMmk', 'kkkkkkkkkkkkkkkk', '................'],
  lab: ['................', '..kkkkkkkkkkkk..', '..kMMMMMMMMMMk..', '..kMggggggggMk..', '..kMg..kk..gMk..', '..kMg..kk..gMk..', '..kMg.kZZk.gMk..', '..kMgkZzzZkgMk..', '..kMkZzZzzZkMk..', '..kMkZZZZZZkMk..', '..kMgkkkkkkgMk..', '..kMggggggggMk..', '..kMMMMMMMMMMk..', '..kMMkkMMkkMMk..', '..kkkkkkkkkkkk..', '................'],
  ram: ['................', '................', '................', '...........kkk..', '..........kyyyk.', '...kkkkkkkkMMyk.', '..kwwnwwnwkMlMk.', '.kwnwwwwnwwkMMk.', '.kwwwnwwwwnwkk..', '.kwnwwwnwwwwk...', '..kwwwwwwwnk....', '..kMkkMkkMkk....', '..kMk.kMkkMk....', '..kk..kk..kk....', '................', '................'],
  toad: ['................', '................', '................', '................', '....kk....kk....', '...kzzk..kzzk...', '..kzyzzkkzzyzk..', '..kzzzzzzzzzzk..', '.kzzlzzzzzzlzzk.', '.kzzzzZZZZzzzzk.', '.kzlzzZyyZzzlzk.', '..kzzzZZZZzzzk..', '.kZZkkkkkkkkZZk.', '.kkk........kkk.', '................', '................'],
  cross: ['..kkkk..', '..kwwk..', 'kkkrrkkk', 'kwrrrrwk', 'kwrrrrwk', 'kkkrrkkk', '..kwwk..', '..kkkk..'],
  vent: Array.from({ length: 16 }, (_, r) => (r === 0 || r === 15 ? 'kkkkkkkkkkkkkkkk' : r % 2 ? 'kMMMMMMMMMMMMMMk' : 'kMkkkkkkkkkkkkMk')),
  mine: ['..kkkk..', '.kMMMMk.', 'kMMrrMMk', 'kMrrrrMk', 'kMrrrrMk', 'kMMrrMMk', '.kMMMMk.', '..kkkk..'],
  mound: ['...kkkk...', '..kBbbBk..', '.kBbBbbBk.', 'kBbbBbBbBk', 'kkkkkkkkkk'],
  scrap: ['..kkk...', '.kmmMk..', 'kmMmmMk.', 'kMmmmyk.', '.kMmMk..', '..kkk...'],
  gun: ['kkkkkkkkkk', 'kmmmmmmmMk', 'kkkMkkkkkk', '..kk......'],
  bullet: ['.ee.', 'eyye', 'eyye', '.ee.'],
  spit: ['.kk.', 'klLk', 'kllk', '.kk.'],
  spark: ['.cc.', 'cwwc', 'cwwc', '.cc.'],
  splat: ['..LL.L', '.LZZL.', 'LZZZZL', '.LZZL.', 'L.LL..'],
  // town buildings
  wall: ['................', '................', '.kkkkkkkkkkkkkk.', '.kgggGgggggGggk.', '.kgMgggMgggMggk.', '.kkkkkkkkkkkkkk.', '.kbbbBbbbbBbbbk.', '.kbBbbbbBbbbbBk.', '.kkkkkkkkkkkkkk.', '.kgggGgggggGggk.', '.kgMgggMgggMggk.', '.kkkkkkkkkkkkkk.', '.kKKKKKKKKKKKKk.', '.kkkkkkkkkkkkkk.', '................', '................'],
  gate: ['................', '................', '.kkkkkkkkkkkkkk.', '.kbbbBbkkbBbbbk.', '.kbBbbbkkbbbBbk.', '.kbbbBbkkbBbbbk.', '.ktttttkktttttk.', '.kTTTTTkkTTTTTk.', '.kbbbBbkkbBbbbk.', '.kbBbbbkkbbbBbk.', '.kbbbBbkkbBbbbk.', '.kkkkkkkkkkkkkk.', '.kKKKKKKKKKKKKk.', '.kkkkkkkkkkkkkk.', '................', '................'],
  wire: ['................', '................', '..k...k...k...k.', '.kgk.kgk.kgk.kgk', 'kg.gkg.gkg.gkg.g', '.k.k.k.k.k.k.k.k', '................', '..k...k...k...k.', '.kgk.kgk.kgk.kgk', 'kg.gkg.gkg.gkg.g', '.k.k.k.k.k.k.k.k', '................', '..k...k...k...k.', '.kgk.kgk.kgk.kgk', 'kg.gkg.gkg.gkg.g', '.k.k.k.k.k.k.k.k'],
  spikes: ['................', '.KKKKKKKKKKKKKK.', '.K.w...w...w..K.', '.Kkmk.kmk.kmk.K.', '.kMmMkMmMkMmMkK.', '.KKKKKKKKKKKKKK.', '.K...w...w...wK.', '.K..kmk.kmk.kmK.', '.KkkMmMkMmMkMmK.', '.KKKKKKKKKKKKKK.', '.K.w...w...w..K.', '.Kkmk.kmk.kmk.K.', '.kMmMkMmMkMmMkK.', '.KKKKKKKKKKKKKK.', '................', '................'],
  turret: ['................', '................', '................', '....kkkkkkkk....', '...kMMMMMMMMk...', '..kMggggggggMk..', '..kMgkkkkkkgMk..', '..kMgkMMMMkgMk..', '..kMgkMMMMkgMk..', '..kMgkkkkkkgMk..', '..kMggggggggMk..', '...kMMMMMMMMk...', '...kKk....kKk...', '...kkk....kkk...', '................', '................'],
  turretGun: ['kkkkkkkkkkk', 'kmmmmmmmmMk', 'kMMMMMMMMMk', 'kkkkkkkkkkk'],
  workbench: ['................', '................', '................', '..kkkkkkkkkkkk..', '..knnnnnnnnnnk..', '..knmMnnnnyynk..', '..knmMnnnnnnnk..', '..kkkkkkkkkkkk..', '..kbBkkkkkkBbk..', '..kbBk....kBbk..', '..kbBk....kBbk..', '..kbBk....kBbk..', '..kkkk....kkkk..', '................', '................', '................'],
  kitchen: ['................', '.......kk.......', '......kggk......', '...kkkkkkkkkk...', '...kMMMMMMMMk...', '...kMkkMMkkMk...', '..kkkkkkkkkkkk..', '..kKKKKKKKKKKk..', '..kKrrKKKKrrKk..', '..kKKKKKKKKKKk..', '..kKkkkkkkkkKk..', '..kKkyyyyyykKk..', '..kKkkkkkkkkKk..', '..kkkkkkkkkkkk..', '................', '................'],
  farm: ['kkkkkkkkkkkkkkkk', 'kbBbBbBbBbBbBbBk', 'kbzbbzbbzbbzbbBk', 'kBZBbZBbZBbZBbbk', 'kbBbBbBbBbBbBbBk', 'kbbzbbzbbzbbzbBk', 'kBbZBbZBbZBbZBbk', 'kbBbBbBbBbBbBbBk', 'kbzbbzbbzbbzbbBk', 'kBZBbZBbZBbZBbbk', 'kbBbBbBbBbBbBbBk', 'kbbzbbzbbzbbzbBk', 'kBbZBbZBbZBbZBbk', 'kbBbBbBbBbBbBbBk', 'kkkkkkkkkkkkkkkk', '................'],
  rat: ['................', '................', '................', '................', '................', '..........kk....', '.........kggk...', '..kk....kgggek..', '.knk...kgggggkk.', '..knkkkgggggggk.', '...kggggggGggk..', '...kgggggggggk..', '...kGgk.kGk.kk..', '....kk...kk.....', '................', '................'],
  moth: ['................', '................', '..kk........kk..', '.kyyk......kyyk.', '.kyeyk.kk.kyeyk.', '.kyyyykllkyyyyk.', '..kyyykllkyyyk..', '...kyykllkyyk...', '..kyyykllkyyyk..', '.kyeyk.kk.kyeyk.', '.kyyk......kyyk.', '..kk........kk..', '................', '................', '................', '................'],
  beetle: ['................', '................', '.....k....k.....', '......k..k......', '....kkkkkkkk....', '...kRRRRrRRRk...', '..kRrRRRRRRrRk..', '..kRRRRkkRRRRk..', '..kRRRRkkRRRRk..', '..kRrRRkkRRrRk..', '..kRRRRkkRRRRk..', '...kRRRkkRRRk...', '...kk.kkkk.kk...', '................', '................', '................'],
  guard: ['......kk........', '......kyk.......', '......kyyk......', '......kk........', '......k.........', '....kkkkkkkk....', '..kknnnnnnnnkk..', '.knnNnnnnnnNnnk.', '.knkkkkkkkkkknk.', 'knnk........knnk', 'knNk........kNnk', 'knnk........knnk', '.knkkkkkkkkkknk.', '.knnnNnnnnNnnnk.', '..kknnnnnnnnkk..', '....kkkkkkkk....'],
  mole: ['................', '................', '................', '................', '.....kkkkkk.....', '....kbbbbbbk....', '...kbbbbbbbbk...', '..kbbkbbbbkbbk..', '..kbbbbrrbbbbk..', '..kbbbbbbbbbbk..', '..kwkbbbbbbkwk..', '.kwwkbbbbbbkwwk.', '..kk.kkkkkk.kk..', '................', '................', '................'],
  bat: ['................', '................', '................', '.k............k.', '.kk....kk....kk.', '.kPk..kPPk..kPk.', '.kPPkkPePPkkPPk.', '.kPPPPPPPPPPPPk.', '..kPPkPPPPkPPk..', '...kk.kPPk.kk...', '.......kk.......', '................', '................', '................', '................', '................'],
  crawler: ['................', '................', '................', '................', '................', '................', '....kkkkkkkk....', '..kkzzzzzzzzkk..', '.kzZzrzzzzrzZzk.', 'kzzzzzzzzzzzzzzk', 'kZkzkZkzzkZkzkZk', '.k.k.k.kk.k.k.k.', '................', '................', '................', '................'],
  shrieker: ['......kkkk......', '.....kwwwwk.....', '....kwkwwkwk....', '....kwwwwwwk....', '....kwkkkkwk....', '....kwkrrkwk....', '.....kwwwwk.....', '......kppk......', '.....kpppPk.....', '....kpkppkpk....', '....kp.kk.pk....', '.....kpppPk.....', '.....kk..kk.....', '.....kZ..kZ.....', '.....kk..kk.....', '................'],
  mother: ['................', '.....kkkkkk.....', '...kkppppppkk...', '..kppprpprpppk..', '.kpprpppppprppk.', '.kppppprrpppppk.', 'kpprpppppppprppk', 'kppppplllllpppPk', 'kpPpplLLLLlppPpk', 'kppppplllllppppk', '.kpPppppppppPpk.', '.kppPppPPppPppk.', '..kkpppppppkkk..', '....kZk..kZk....', '....kkk..kkk....', '................'],
  storehouse: ['................', '.......kk.......', '.....kkRRkk.....', '...kkRRRRRRkk...', '.kkRRRRRRRRRRkk.', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk', '.kggggggggggggk.', '.kgGggkkkkgGggk.', '.kggggkyykggggk.', '.kgGggkyykgGggk.', '.kggggkyykggggk.', '.kkkkkkkkkkkkkk.', '................', '................', '................'],
};

export function pxTexture(scene, key, rows, s) {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const tex = scene.textures.createCanvas(key, w * s, h * s);
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PAL[row[x]];
      if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect(x * s, y * s, s, s);
    }
  });
  tex.refresh();
}

// big procedural sprite: draw(rect) works in 3px "pixels"
export function bigTexture(scene, key, n, draw) {
  if (scene.textures.exists(key)) return;
  const s = 3, t = scene.textures.createCanvas(key, n * s, n * s), c = t.getContext();
  draw((x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x * s, y * s, w * s, h * s); });
  t.refresh();
}

export function makeTextures(scene) {
  for (const k of ['hero', 'walker', 'runner', 'spitter', 'bloater', 'hound', 'crow', 'rat', 'moth', 'beetle', 'crate', 'rubble', 'cage',
    'wall', 'gate', 'wire', 'spikes', 'turret', 'guard', 'workbench', 'kitchen', 'farm', 'storehouse', 'salvage', 'lab', 'ram', 'toad', 'vent', 'mole', 'bat', 'crawler', 'shrieker']) pxTexture(scene, k, SPR[k], 3);
  pxTexture(scene, 'mother', SPR.mother, 5);
  // bandits are recoloured survivors: red bandana + khaki coat / dark hood
  if (!SPR.rifleman) {
    const swap = (rows, m) => rows.map(r => r.replace(/./g, ch => (m[ch] !== undefined ? m[ch] : ch)));
    SPR.rifleman = swap(SPR.hero, { t: 'N', T: 'B', b: 'r', B: 'R' });
    SPR.bruiser = swap(SPR.hero, { t: 'R', T: 'k', b: 'K', B: 'k', s: 'S' });
  }
  if (!SPR.rwall) SPR.rwall = SPR.wall.map(r => r.replace(/./g, ch => ({ g: 'm', G: 'M', b: 'g', B: 'K' })[ch] || ch));
  pxTexture(scene, 'rwall', SPR.rwall, 3);
  pxTexture(scene, 'mine', SPR.mine, 3);
  if (!SPR.patient) {
      const swap2 = (rows, m) => rows.map(r => r.replace(/./g, ch => (m[ch] !== undefined ? m[ch] : ch)));
      SPR.patient = swap2(SPR.walker, { p: 'w', P: 'm', K: 'C' });
      SPR.gasser = swap2(SPR.bloater, { l: 'z', L: 'Z', y: 'l' });
      SPR.zero = swap2(SPR.walker, { p: 'w', P: 'm', z: 'n', Z: 'S', K: 'R' });
    }
    pxTexture(scene, 'patient', SPR.patient, 3);
    pxTexture(scene, 'gasser', SPR.gasser, 3);
    pxTexture(scene, 'zero', SPR.zero, 5);
    pxTexture(scene, 'cross', SPR.cross, 3);
    pxTexture(scene, 'rifleman', SPR.rifleman, 3);
  if (!SPR.bdog) SPR.bdog = SPR.hound.map(r => r.replace(/./g, ch => ({ o: 'K', O: 'k', e: 'r' })[ch] || ch));
  pxTexture(scene, 'bdog', SPR.bdog, 3);
  pxTexture(scene, 'bruiser', SPR.bruiser, 4);
  pxTexture(scene, 'bbullet', SPR.bbullet, 3);
  pxTexture(scene, 'bturret', SPR.turret, 3);
  bigTexture(scene, 'radio', 32, (r) => {
    r(6, 22, 20, 9, PAL.k); r(7, 23, 18, 7, PAL.M); r(9, 25, 5, 3, PAL.k); r(10, 26, 3, 1, PAL.l); r(17, 25, 6, 1, PAL.g); r(17, 27, 6, 1, PAL.g);
    r(15, 2, 2, 21, PAL.k); r(12, 8, 8, 1, PAL.k); r(13, 13, 6, 1, PAL.k); r(11, 18, 10, 1, PAL.k);
    for (let y = 4; y < 22; y += 4) { r(13, y, 1, 3, PAL.g); r(18, y, 1, 3, PAL.g); }
    r(14, 0, 4, 3, PAL.k); r(15, 1, 2, 1, PAL.r);
  });
  bigTexture(scene, 'wartable', 32, (r) => {
    r(2, 8, 28, 16, PAL.k); r(3, 9, 26, 14, PAL.b); r(5, 10, 22, 11, PAL.n);
    r(7, 12, 6, 1, PAL.S); r(12, 13, 1, 5, PAL.S); r(14, 16, 8, 1, PAL.S); r(21, 11, 1, 6, PAL.S);
    r(9, 11, 2, 2, PAL.r); r(19, 14, 2, 2, PAL.r); r(15, 18, 2, 2, PAL.r); r(23, 17, 2, 2, PAL.k);
    r(4, 24, 3, 6, PAL.k); r(25, 24, 3, 6, PAL.k); r(5, 24, 1, 5, PAL.B); r(26, 24, 1, 5, PAL.B);
  });
  pxTexture(scene, 'brute', SPR.brute, 4);
  pxTexture(scene, 'scrap', SPR.scrap, 2);
  pxTexture(scene, 'mound', SPR.mound, 3);
  pxTexture(scene, 'food', SPR.food, 3);
  pxTexture(scene, 'part', SPR.part, 2);
  pxTexture(scene, 'ammo', SPR.ammo, 3);
  pxTexture(scene, 'lure', SPR.lure, 3);
  pxTexture(scene, 'medkit', SPR.medkit, 3);
  pxTexture(scene, 'treat', SPR.treat, 3);
  pxTexture(scene, 'cageIcon', SPR.cage, 1);
  pxTexture(scene, 'gun', SPR.gun, 3);
  pxTexture(scene, 'turretGun', SPR.turretGun, 3);
  pxTexture(scene, 'bullet', SPR.bullet, 3);
  pxTexture(scene, 'spit', SPR.spit, 4);
  pxTexture(scene, 'spark', SPR.spark, 3);
  pxTexture(scene, 'splat', SPR.splat, 4);
  if (!scene.textures.exists('dot')) { const t = scene.textures.createCanvas('dot', 6, 6); const c = t.getContext(); c.fillStyle = '#fff'; c.fillRect(0, 0, 6, 6); t.refresh(); }
  if (!scene.textures.exists('hatch')) {
    const n = 32, s = 3, t = scene.textures.createCanvas('hatch', n * s, n * s), c = t.getContext();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy);
      let col = null;
      if (d < 15.5 && d >= 14.5) col = PAL.k;
      else if (d < 14.5 && d >= 10.5) col = (Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 6)) % 2) ? PAL.y : PAL.k;
      else if (d < 10.5 && d >= 9.5) col = PAL.k;
      else if (d < 9.5) col = (Math.abs(dx) < 1.5 || Math.abs(dy) < 1.5) ? PAL.g : PAL.M;
      if (col) { c.fillStyle = col; c.fillRect(x * s, y * s, s, s); }
    }
    t.refresh();
  }
  bigTexture(scene, 'gen', 32, (r) => {
    r(2, 6, 28, 24, PAL.k); r(3, 7, 26, 22, PAL.M); r(4, 8, 24, 12, PAL.g);
    r(6, 10, 8, 8, PAL.k); r(7, 11, 6, 6, PAL.c); r(8, 12, 2, 2, PAL.w);
    r(18, 10, 8, 3, PAL.k); r(18, 14, 8, 3, PAL.k); r(19, 11, 6, 1, PAL.y); r(19, 15, 4, 1, PAL.l);
    for (let i = 0; i < 6; i++) r(3 + i * 5, 22, 3, 6, (i % 2) ? PAL.y : PAL.k);
    r(22, 1, 4, 6, PAL.k); r(23, 2, 2, 5, PAL.G);
    r(1, 28, 30, 2, PAL.K);
  });
  if (!scene.textures.exists('train')) { // subway car, 96x24 "pixels"
    const s3 = 3, t = scene.textures.createCanvas('train', 96 * s3, 24 * s3), c = t.getContext();
    const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x * s3, y * s3, w * s3, h * s3); };
    r(0, 1, 96, 22, PAL.k); r(1, 2, 94, 20, '#5b6570'); r(1, 13, 94, 3, PAL.y); r(1, 19, 94, 2, '#3a4048');
    for (let x = 5; x < 90; x += 12) { r(x, 5, 8, 6, PAL.k); r(x + 1, 6, 6, 4, '#e8e6a8'); }
    r(0, 4, 3, 16, PAL.r); r(93, 4, 3, 16, PAL.r);
    t.refresh();
  }
  bigTexture(scene, 'stairs', 32, (r) => {
    r(1, 4, 30, 27, PAL.k); r(2, 5, 28, 25, '#2b3036');
    for (let i = 0; i < 6; i++) { r(4 + i, 9 + i * 3, 24 - i * 2, 2, '#4a525a'); r(4 + i, 11 + i * 3, 24 - i * 2, 1, '#1b1e22'); }
    r(1, 0, 30, 5, PAL.k); r(2, 1, 28, 3, PAL.C); r(13, 1, 6, 3, PAL.w);
  });
  bigTexture(scene, 'boards', 32, (r) => {
    r(2, 8, 28, 4, PAL.k); r(3, 9, 26, 2, PAL.b); r(2, 16, 28, 4, PAL.k); r(3, 17, 26, 2, PAL.B); r(2, 24, 28, 4, PAL.k); r(3, 25, 26, 2, PAL.b);
  });
  bigTexture(scene, 'pen', 32, (r) => {
    r(1, 6, 30, 25, PAL.k); r(2, 7, 28, 23, '#3b4a22');
    for (let i = 0; i < 18; i++) r(3 + (i * 7) % 25, 9 + (i * 5) % 19, 3, 1, PAL.y);
    r(20, 21, 8, 5, PAL.k); r(21, 22, 6, 3, PAL.C);
    for (let x = 1; x < 31; x += 5) { r(x, 4, 2, 6, PAL.k); r(x, 5, 1, 4, PAL.b); r(x, 27, 2, 5, PAL.k); r(x, 28, 1, 3, PAL.b); }
    r(1, 6, 30, 2, PAL.B); r(1, 28, 30, 2, PAL.B); r(1, 6, 2, 24, PAL.B); r(29, 6, 2, 24, PAL.B);
    r(12, 28, 8, 3, '#3b4a22');
  });
  bigTexture(scene, 'hall', 32, (r) => {
    r(3, 12, 26, 18, PAL.k); r(4, 13, 24, 16, PAL.b);
    for (let y = 14; y < 28; y += 3) for (let x = 4 + (y % 2) * 2; x < 27; x += 5) r(x, y, 4, 2, PAL.B);
    r(1, 8, 30, 5, PAL.k); r(2, 9, 28, 3, PAL.R); r(5, 5, 22, 4, PAL.k); r(6, 6, 20, 2, PAL.r);
    r(13, 20, 6, 10, PAL.k); r(14, 21, 4, 9, PAL.B); r(17, 25, 1, 1, PAL.y);
    r(6, 16, 5, 4, PAL.k); r(7, 17, 3, 2, PAL.y); r(21, 16, 5, 4, PAL.k); r(22, 17, 3, 2, PAL.y);
    r(15, 0, 1, 6, PAL.k); r(16, 0, 6, 3, PAL.t); r(16, 1, 6, 1, PAL.T);
  });
}