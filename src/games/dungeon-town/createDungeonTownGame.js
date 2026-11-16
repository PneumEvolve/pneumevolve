import Phaser from 'phaser';

/**
 * DUNGEON TOWN — Step 3: "The Town"
 * Creates the game inside `parent` (a DOM element). Returns the Phaser.Game.
 * Call game.destroy(true) to clean up. All state lives in this function.
 * Works with Phaser 3.80+ and 4.x.
 */
export function createDungeonTownGame(parent, { onExit } = {}) {
  const V = Phaser.Math.Vector2;
  const TILE = 48;
  const COLS = 20, ROWS = 13, RW = COLS * TILE, RH = ROWS * TILE;      // dungeon room
  const TCOLS = 24, TROWS = 16, TW = TCOLS * TILE, TH = TROWS * TILE;  // town

  // ===================================================================
  //  TUNING
  // ===================================================================
  const T = {
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
    rooms: 5, extractRooms: [2, 4, 5],
    // town
    runsPerDay: 1,
    nightBase: 90, nightPerDay: 10, nightMax: 180,
    genLossPct: 0.25, storehouseProtects: 50, farmScrap: 5,
    respawnTime: 4,
  };
  const E = {
    walker:  { hp: 6, speed: 75, windupRange: 70, windup: 0.45, lunge: 430, lungeT: 0.18, recover: 0.55, dmg: 1, scrap: [1, 2] },
    runner:  { hp: 3, speed: 150, windupRange: 60, windup: 0.3, lunge: 520, lungeT: 0.14, recover: 0.4, dmg: 1, scrap: [1, 1] },
    spitter: { hp: 5, speed: 70, keep: 240, fireCd: 2.4, windup: 0.55, spitSpeed: 270, dmg: 1, scrap: [1, 3] },
    brute:   { hp: 18, speed: 48, windupRange: 95, windup: 0.8, slamRange: 108, slamArc: 1.0, recover: 1.1, turn: 1.8, dmg: 2, scrap: [4, 6] },
    bloater: { hp: 4, speed: 58, fuseRange: 45, fuse: 0.7, deathFuse: 0.35, boomR: 90, dmg: 2, scrap: [1, 2] },
  };
  const ROOM_WAVES = {
    1: [['walker', 'walker', 'walker'], ['walker', 'walker', 'runner', 'runner']],
    2: [['walker', 'walker', 'spitter', 'walker'], ['runner', 'runner', 'runner', 'bloater']],
    3: [['walker', 'spitter', 'spitter', 'bloater'], ['brute', 'runner', 'runner']],
    4: [['spitter', 'spitter', 'runner', 'runner', 'runner'], ['brute', 'bloater', 'bloater', 'walker', 'walker']],
    5: [['brute', 'walker', 'walker', 'walker'], ['brute', 'spitter', 'spitter', 'runner', 'runner', 'runner']],
  };

  // Town Hall levels: building points + scrap cost to reach
  const TL = [
    null,
    { mil: 10, civ: 10, cost: 0, gen: 30 },
    { mil: 16, civ: 14, cost: 100, gen: 40 },
    { mil: 24, civ: 18, cost: 250, gen: 50 },
    { mil: 32, civ: 22, cost: 500, gen: 60 },
    { mil: 42, civ: 26, cost: 900, gen: 70 },
  ];
  // Buildings. pathCost = how much zombies avoid it (they break through solid ones).
  const BLD = {
    wall:       { name: 'Wall', cat: 'mil', cost: 1, hp: 14, pathCost: 12, solid: true, desc: 'Zombies have to break it to get through.' },
    gate:       { name: 'Gate', cat: 'mil', cost: 2, hp: 14, pathCost: 12, solid: true, gate: true, desc: 'A wall you can walk through. Zombies can\'t.' },
    wire:       { name: 'Wire', cat: 'mil', cost: 1, pathCost: 3, desc: 'Barbed wire. Slows zombies walking through.' },
    spikes:     { name: 'Spikes', cat: 'mil', cost: 2, pathCost: 3, desc: 'Hurts zombies that walk over it.' },
    turret:     { name: 'Turret', cat: 'mil', cost: 4, upg: [4, 6, 9], hp: 12, pathCost: 30, solid: true, desc: 'Shoots the nearest zombie. Upgrade: 4 → 6 → 9 pts.' },
    workbench:  { name: 'Workbench', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, max: 2, desc: '+1 cage on every ruins run (max 2).' },
    kitchen:    { name: 'Kitchen', cat: 'civ', cost: 3, hp: 16, pathCost: 30, solid: true, max: 2, desc: '+1 max heart (max 2).' },
    farm:       { name: 'Farm', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: '+5 scrap every morning.' },
    storehouse: { name: 'Storehouse', cat: 'civ', cost: 2, hp: 16, pathCost: 30, solid: true, desc: 'Protects 50 scrap if the generator falls.' },
  };
  const TURRET = [null, { range: 230, dmg: 1, rate: 0.75 }, { range: 255, dmg: 2, rate: 0.6 }, { range: 285, dmg: 2, rate: 0.38 }];
  const MIL_ITEMS = ['wall', 'gate', 'wire', 'spikes', 'turret'];
  const CIV_ITEMS = ['workbench', 'kitchen', 'farm', 'storehouse'];

  // # wall · . floor · c crate · r rubble · s spawn · D door · P entry · H hatch
  const TEMPLATES = [
    ['#########DD#########', '#s................s#', '#..................#', '#...r..........r...#', '#......c....c......#', '#..................#', '#s.......HH.......s#', '#..................#', '#......c....c......#', '#...r..........r...#', '#..................#', '#s.......PP.......s#', '####################'],
    ['#########DD#########', '#s......#..#......s#', '#.......#..#.......#', '#..rr..........rr..#', '#..rr...c..c...rr..#', '#..................#', '#s.......HH.......s#', '#....##......##....#', '#....##..cc..##....#', '#..................#', '#..c............c..#', '#s.......PP.......s#', '####################'],
    ['#########DD#########', '#s................s#', '#....rrrr..rrrr....#', '#..................#', '#.c..............c.#', '#.....r......r.....#', '#s.......HH.......s#', '#.....r......r.....#', '#.c..............c.#', '#..................#', '#....rrrr..rrrr....#', '#........PP.......s#', '####################'],
  ];
  const FINAL_ROOM = ['####################', '#s................s#', '#..r............r..#', '#..................#', '#.....c......c.....#', '#..................#', '#s.......HH.......s#', '#..................#', '#.....c......c.....#', '#..................#', '#..r............r..#', '#s.......PP.......s#', '####################'];
  // Town: # rubble wall · r rubble · S zombie entrance · G generator · T town hall · R ruins hatch
  const TOWN_MAP = [
    '###########SS###########',
    '#......................#',
    '#..rr..............rr..#',
    '#..r................r..#',
    '#......................#',
    '#......................#',
    '#......................#',
    'S..........GG..........S',
    'S..........GG..........S',
    '#......................#',
    '#..........TT..........#',
    '#..........TT..........#',
    '#..r................r..#',
    '#..RR..............rr..#',
    '#..RR..................#',
    '########################',
  ];

  // ===================================================================
  //  SAVE (this browser only, for now)
  // ===================================================================
  const SAVE_KEY = 'dungeonTown.v1';
  const freshSave = () => ({ scrap: 0, creatures: { hound: 1 }, runs: 0, bestRoom: 0, townLevel: 1, day: 1, runsToday: 0, buildings: [], seenIntro: false });
  const SAVE = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s.scrap === 'number') {
        const out = Object.assign(freshSave(), s);
        out.creatures = Object.assign({ hound: 1 }, s.creatures);
        if (!Array.isArray(out.buildings)) out.buildings = [];
        return out;
      }
    } catch (e) {}
    return freshSave();
  })();
  const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };
  const countB = (t) => SAVE.buildings.filter(b => b.t === t).length;
  const maxHearts = () => T.heroHp + Math.min(2, countB('kitchen'));
  const bCost = (b) => { const d = BLD[b.t]; return d.upg ? d.upg[(b.lvl || 1) - 1] : d.cost; };
  const pointsUsed = (cat) => SAVE.buildings.reduce((s, b) => s + (BLD[b.t].cat === cat ? bCost(b) : 0), 0);

  // Shared state between scenes
  const Ctl = { move: { x: 0, y: 0 }, mode: 'brawl', queue: [], aim: null, aimAbility: null, twin: null, blocked: false };
  const HUD = { scene: 'town' };

  // Tint helpers for Phaser 3 (setTintFill) and Phaser 4 (tint modes)
  const V4 = !!(Phaser.TintModes && Phaser.TintModes.FILL !== undefined);
  const flash = (obj, color) => {
    if (V4 && typeof obj.setTintMode === 'function') obj.setTint(color).setTintMode(Phaser.TintModes.FILL);
    else if (typeof obj.setTintFill === 'function') obj.setTintFill(color);
    else obj.setTint(color);
  };
  const untint = (obj) => {
    obj.clearTint();
    if (V4 && typeof obj.setTintMode === 'function') obj.setTintMode(Phaser.TintModes.MULTIPLY);
    return obj;
  };
  const kids = (group) => group.getChildren().slice();
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const FONT = 'system-ui,-apple-system,"Segoe UI",sans-serif';

  // ===================================================================
  //  PIXEL ART — each letter is a colour
  // ===================================================================
  const PAL = {
    k: '#14161a', K: '#2b2f36', g: '#6b737c', G: '#4f565e', w: '#e8e6df',
    s: '#d9a066', S: '#a8743f', t: '#3fa7a0', T: '#23706b', b: '#6b4a2b', B: '#3f2a18',
    z: '#8fae4a', Z: '#56702a', r: '#d0392b', R: '#7a1f17', o: '#e08a3c', O: '#9c5520',
    y: '#f2d14b', p: '#7d5ba6', P: '#4b3566', c: '#5fd3ff', C: '#2a7fa8',
    m: '#9aa4ad', M: '#4a525a', e: '#fff2a8', l: '#b5c94f', L: '#6f7d2a', n: '#c9b28a',
  };
  const SPR = {
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
    storehouse: ['................', '.......kk.......', '.....kkRRkk.....', '...kkRRRRRRkk...', '.kkRRRRRRRRRRkk.', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk', '.kggggggggggggk.', '.kgGggkkkkgGggk.', '.kggggkyykggggk.', '.kgGggkyykgGggk.', '.kggggkyykggggk.', '.kkkkkkkkkkkkkk.', '................', '................', '................'],
  };

  function pxTexture(scene, key, rows, s) {
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
  function bigTexture(scene, key, n, draw) {
    if (scene.textures.exists(key)) return;
    const s = 3, t = scene.textures.createCanvas(key, n * s, n * s), c = t.getContext();
    draw((x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x * s, y * s, w * s, h * s); });
    t.refresh();
  }

  function makeTextures(scene) {
    for (const k of ['hero', 'walker', 'runner', 'spitter', 'bloater', 'hound', 'crow', 'crate', 'rubble', 'cage',
      'wall', 'gate', 'wire', 'spikes', 'turret', 'workbench', 'kitchen', 'farm', 'storehouse']) pxTexture(scene, k, SPR[k], 3);
    pxTexture(scene, 'brute', SPR.brute, 4);
    pxTexture(scene, 'scrap', SPR.scrap, 2);
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
    bigTexture(scene, 'hall', 32, (r) => {
      r(3, 12, 26, 18, PAL.k); r(4, 13, 24, 16, PAL.b);
      for (let y = 14; y < 28; y += 3) for (let x = 4 + (y % 2) * 2; x < 27; x += 5) r(x, y, 4, 2, PAL.B);
      r(1, 8, 30, 5, PAL.k); r(2, 9, 28, 3, PAL.R); r(5, 5, 22, 4, PAL.k); r(6, 6, 20, 2, PAL.r);
      r(13, 20, 6, 10, PAL.k); r(14, 21, 4, 9, PAL.B); r(17, 25, 1, 1, PAL.y);
      r(6, 16, 5, 4, PAL.k); r(7, 17, 3, 2, PAL.y); r(21, 16, 5, 4, PAL.k); r(22, 17, 3, 2, PAL.y);
      r(15, 0, 1, 6, PAL.k); r(16, 0, 6, 3, PAL.t); r(16, 1, 6, 1, PAL.T);
    });
  }

  // ===================================================================
  //  COMBAT BASE — hero, companions, enemies, shared by Town + Dungeon
  // ===================================================================
  class Combat extends Phaser.Scene {
    // hooks a scene can override
    targetFor(z) {
      const h = this.hero;
      if (this.cage && dist(z, this.cage) < Math.min(260, dist(z, h))) return { x: this.cage.x, y: this.cage.y, kind: 'cage', pad: 0 };
      return { x: h.x, y: h.y, kind: 'hero', pad: 0 };
    }
    hitTarget(tg, dmg, dx, dy) { if (tg.kind === 'cage') this.damageCage(dmg); else if (tg.kind === 'hero') this.hurtHero(dx, dy, dmg); }
    onEvent() {}
    sceneUpdate() {}
    drawSceneFx() {}
    inputFrozen() { return false; }
    collectScrap(n) {}
    slamExtra() {}
    explodeExtra() {}
    onSpitHitSolid(s) { this.splash(s); }
    heroDied() {}
    onAbandon() {}
    canSpawn() { return true; }

    setupCombat(x, y, worldW, worldH, zoomDiv) {
      const crowOwned = (SAVE.creatures.crow || 0) > 0;
      this.worldW = worldW; this.worldH = worldH; this.zoomDiv = zoomDiv;
      Object.assign(HUD, {
        ammo: T.ammoMax, reload: 0, dashCd: 0, cd1: 0, cd2: 0,
        cd1Max: T.pounceCd, cd2Max: crowOwned ? T.chainCd : T.howlCd,
        ab1Label: 'POUNCE', ab2Label: crowOwned ? 'ZAP' : 'HOWL',
        canCapture: false, dead: false,
      });
      Ctl.queue.length = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;

      this.hero = this.physics.add.image(x, y, 'hero');
      this.hero.body.setCircle(13, 11, 16);
      this.hero.setCollideWorldBounds(true);
      this.gun = this.add.image(0, 0, 'gun').setOrigin(0.1, 0.4);
      this.facing = new V(0, -1);
      this.dashT = 0; this.dashDir = new V(1, 0); this.inv = 0; this.gunCdT = 0; this.swordCdT = 0;
      this.kbT = 0; this.kb = new V(); this.gunKick = 0; this.faceLock = 0; this.ghostT = 0;

      this.hound = this.physics.add.image(x - 40, y + 20, 'hound');
      this.hound.body.setCircle(10, 15, 17);
      this.hound.setCollideWorldBounds(true);
      this.hound.mode = 'follow'; this.hound.biteT = 0;
      this.crow = crowOwned ? this.add.image(x + 40, y - 30, 'crow') : null;
      if (this.crow) this.crow.zapT = 1;

      if (!this.crates) this.crates = this.physics.add.staticGroup();
      if (!this.bulletBlockers) this.bulletBlockers = this.solids;
      this.enemies = this.physics.add.group();
      this.bullets = this.physics.add.group();
      this.spits = this.physics.add.group();
      this.physics.add.collider(this.hero, this.solids);
      this.physics.add.collider(this.hero, this.crates);
      this.physics.add.collider(this.hound, this.solids);
      this.physics.add.collider(this.hound, this.crates);
      this.physics.add.collider(this.enemies, this.solids);
      this.physics.add.collider(this.enemies, this.crates);
      this.physics.add.collider(this.enemies, this.enemies);
      this.physics.add.collider(this.bullets, this.bulletBlockers, (a, b) => { const bl = a.isBullet ? a : b; this.spark(bl.x, bl.y, 0xfff2a8, 3); bl.destroy(); });
      this.physics.add.collider(this.bullets, this.crates, (a, b) => { const bl = a.isBullet ? a : b, cr = a.isBullet ? b : a; bl.destroy(); this.hitCrate(cr, T.gunDmg); });
      this.physics.add.collider(this.spits, this.solids, (a, b) => { const s = a.isSpit ? a : b, o = a.isSpit ? b : a; this.onSpitHitSolid(s, o); });
      this.physics.add.collider(this.spits, this.crates, (a, b) => { const s = a.isSpit ? a : b; this.splash(s); });
      this.physics.add.overlap(this.bullets, this.enemies, (a, b) => { const bl = a.isBullet ? a : b, z = a.isBullet ? b : a; this.bulletHit(bl, z); });
      this.physics.add.overlap(this.spits, this.hero, (a, b) => {
        const s = a.isSpit ? a : b; if (!s.active) return;
        const d = new V(s.body.velocity.x, s.body.velocity.y).normalize();
        this.splash(s); this.hurtHero(d.x, d.y, 1);
      });

      this.fx = this.add.graphics().setDepth(900);
      this.pickups = []; this.cage = null; this.wild = null; this.pending = 0; this.magnetAll = false;

      const cam = this.cameras.main;
      cam.setBounds(0, 0, worldW, worldH);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setBackgroundColor('#0e1013');
      cam.fadeIn(250);
      this.fitZoom();
      this.scale.on('resize', this.fitZoom, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,F,B,N,R');
      this.hitstop = 0; this.blockedPause = false; this.leaving = false;
      if (!this.scene.isActive('ui')) this.scene.launch('ui');
    }

    fitZoom() {
      if (this.buildView) return;
      const z = Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / this.zoomDiv, 0.55, 2.4);
      this.cameras.main.setZoom(z);
    }

    drawGridFloor(grid, cols, rows, wallChars) {
      const W = cols * TILE, H = rows * TILE;
      if (this.floorKey && this.textures.exists(this.floorKey)) this.textures.remove(this.floorKey);
      this.floorKey = 'floor_' + this.sys.settings.key + '_' + Date.now();
      const tex = this.textures.createCanvas(this.floorKey, W, H), c = tex.getContext(), P = 3, R = Phaser.Math;
      const isWall = (r, cc) => r < 0 || r >= rows || cc < 0 || cc >= cols || wallChars.includes(grid[r][cc]);
      const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.floor(x / P) * P, Math.floor(y / P) * P, P, P); };
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        const x0 = cc * TILE, y0 = r * TILE;
        if (isWall(r, cc)) {
          c.fillStyle = '#353a42'; c.fillRect(x0, y0, TILE, TILE);
          for (let i = 0; i < 10; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, 30), Math.random() < 0.5 ? '#2c3037' : '#40464f');
          if (!isWall(r + 1, cc)) {
            c.fillStyle = '#22262c'; c.fillRect(x0, y0 + 30, TILE, 18);
            c.fillStyle = '#1a1d22';
            for (let yy = 0; yy < 18; yy += 9) { c.fillRect(x0, y0 + 30 + yy, TILE, P); for (let xx = (yy ? 12 : 0); xx < TILE; xx += 24) c.fillRect(x0 + xx, y0 + 30 + yy, P, 9); }
          }
        } else {
          const shade = ['#24272c', '#262a2f', '#222529'][(r * 7 + cc * 3) % 3];
          c.fillStyle = shade; c.fillRect(x0, y0, TILE, TILE);
          if ((r + cc) % 2 === 0) { c.fillStyle = '#1f2226'; c.fillRect(x0, y0, TILE, P); c.fillRect(x0, y0, P, TILE); }
          for (let i = 0; i < 7; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, TILE - 1), Math.random() < 0.6 ? '#1c1f23' : '#2e3238');
          if (isWall(r - 1, cc)) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x0, y0, TILE, 9); }
        }
      }
      for (let i = 0; i < 14; i++) {
        const sx = R.Between(TILE, W - TILE), sy = R.Between(TILE, H - TILE), green = Math.random() < 0.3;
        for (let j = 0; j < 22; j++) dot(sx + R.Between(-18, 18), sy + R.Between(-12, 12), green ? '#252d1f' : '#1b1d20');
      }
      for (let i = 0; i < 12; i++) {
        let x = R.Between(TILE, W - TILE), y = R.Between(TILE, H - TILE);
        for (let j = 0; j < 14; j++) { x += R.Between(-1, 1) * P; y += R.Between(-1, 1) * P; dot(x, y, '#141619'); }
      }
      tex.refresh();
      this.add.image(0, 0, this.floorKey).setOrigin(0).setDepth(0);
    }

    // build solid zones from a char grid (merging runs of wall tiles)
    buildSolidRuns(grid, cols, rows, solidChar) {
      for (let r = 0; r < rows; r++) {
        let run0 = -1;
        for (let c = 0; c <= cols; c++) {
          const solid = c < cols && grid[r][c] === solidChar;
          if (solid && run0 < 0) run0 = c;
          if (!solid && run0 >= 0) {
            const z = this.add.zone((run0 + c) / 2 * TILE, r * TILE + TILE / 2, (c - run0) * TILE, TILE);
            this.physics.add.existing(z, true); this.solids.add(z); run0 = -1;
          }
        }
      }
    }

    // ---------------------------------------------------------------- loop
    update(time, dms) {
      const dt = Math.min(dms / 1000, 0.05);
      if (Ctl.blocked) { if (!this.blockedPause) { this.physics.world.pause(); this.blockedPause = true; } return; }
      if (this.blockedPause) { this.blockedPause = false; this.physics.world.resume(); }
      if (this.leaving) return;
      if (this.hitstop > 0) { this.hitstop -= dt; if (this.hitstop <= 0) this.physics.world.resume(); return; }

      const hero = this.hero, k = this.keys, frozen = this.inputFrozen();
      const mv = new V(frozen ? 0 : Ctl.move.x, frozen ? 0 : Ctl.move.y);
      if (!frozen) {
        const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (kx || ky) mv.set(kx, ky).normalize();
      }
      if (mv.length() > 1) mv.normalize();
      const JD = Phaser.Input.Keyboard.JustDown;
      if (JD(k.SPACE)) Ctl.queue.push({ type: 'dash' });
      if (JD(k.Q)) Ctl.queue.push({ type: 'ab', i: 1, dir: null });
      if (JD(k.E)) Ctl.queue.push({ type: 'ab', i: 2, dir: null });
      if (JD(k.F)) Ctl.queue.push({ type: 'capture' });
      if (JD(k.B)) Ctl.queue.push({ type: 'build' });
      if (JD(k.N)) Ctl.queue.push({ type: 'endDay' });
      if (JD(k.R)) Ctl.queue.push({ type: 'prompt' });

      while (Ctl.queue.length) {
        const ev = Ctl.queue.shift();
        if (ev.type === 'abandon') { this.onAbandon(); return; }
        if (ev.type === 'attack' || ev.type === 'dash' || ev.type === 'ab' || ev.type === 'capture') {
          if (HUD.dead || this.inputFrozen()) continue;
          if (ev.type === 'attack') this.attack(ev.dir, false);
          else if (ev.type === 'dash') this.tryDash(mv);
          else if (ev.type === 'ab') this.ability(ev.i, ev.dir);
          else this.throwCage();
        } else this.onEvent(ev);
        if (this.leaving) return;
      }
      if (Ctl.mode === 'twin' && Ctl.twin && !HUD.dead && !frozen) this.attack(Ctl.twin.dir, true);

      this.inv = Math.max(0, this.inv - dt);
      this.gunCdT = Math.max(0, this.gunCdT - dt);
      this.swordCdT = Math.max(0, this.swordCdT - dt);
      this.faceLock = Math.max(0, this.faceLock - dt);
      HUD.dashCd = Math.max(0, HUD.dashCd - dt);
      HUD.cd1 = Math.max(0, HUD.cd1 - dt);
      HUD.cd2 = Math.max(0, HUD.cd2 - dt);
      if (HUD.ammo < T.ammoMax) { HUD.reload += dt; if (HUD.reload >= T.reloadTime) { HUD.ammo++; HUD.reload = 0; } } else HUD.reload = 0;

      if (HUD.dead || frozen) hero.setVelocity(0, 0);
      else if (this.kbT > 0) { this.kbT -= dt; hero.setVelocity(this.kb.x, this.kb.y); this.kb.scale(0.85); }
      else if (this.dashT > 0) {
        this.dashT -= dt;
        hero.setVelocity(this.dashDir.x * T.dashSpeed, this.dashDir.y * T.dashSpeed);
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.025;
          const gh = this.add.image(hero.x, hero.y, 'hero').setAlpha(0.45).setTint(0x3fd0c9).setFlipX(hero.flipX).setDepth(hero.depth - 0.01);
          this.tweens.add({ targets: gh, alpha: 0, duration: 200, onComplete: () => gh.destroy() });
        }
      } else hero.setVelocity(mv.x * T.heroSpeed, mv.y * T.heroSpeed);

      if (Ctl.aim && !frozen) this.facing.copy(Ctl.aim);
      else if (this.faceLock <= 0 && mv.length() > 0.2) this.facing.copy(mv).normalize();
      if (Math.abs(this.facing.x) > 0.05) hero.setFlipX(this.facing.x < 0);
      this.gunKick *= 0.8;
      const gd = 10 - this.gunKick;
      this.gun.setPosition(hero.x + this.facing.x * gd, hero.y + 6 + this.facing.y * gd).setRotation(this.facing.angle()).setFlipY(this.facing.x < 0);
      hero.setAlpha(this.inv > 0 && this.dashT <= 0 ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1);
      this.gun.setAlpha(hero.alpha).setVisible(!HUD.dead);

      this.updateHound(dt);
      this.updateCrow(dt, time);
      kids(this.enemies).forEach(z => z.active && this.updateEnemy(z, dt, time));
      this.updateWild(dt, time);
      this.updateCage(dt);
      kids(this.bullets).forEach(b => { if (b.active && Phaser.Math.Distance.Between(b.x, b.y, b.sx, b.sy) > (b.range || T.bulletRange)) b.destroy(); });
      kids(this.spits).forEach(s => {
        if (!s.active) return;
        s.life -= dt; if (s.life <= 0) { this.splash(s); return; }
        if (this.cage && dist(s, this.cage) < 26) { this.splash(s); this.damageCage(1); }
      });
      this.updatePickups(dt);
      this.sceneUpdate(dt, time);
      if (this.leaving) return;

      [hero, this.hound].concat(kids(this.enemies)).forEach(o => o.active && o.setDepth(10 + o.y / 1000));
      this.gun.setDepth(hero.depth + 0.001);
      if (this.crow) this.crow.setDepth(800);
      if (this.wild && this.wild.active) this.wild.setDepth(790);

      HUD.canCapture = !!(this.wild && this.wild.active && this.wild.weak > 0 && !this.wild.caged && this.run && this.run.cages > 0 && !this.cage && dist(hero, this.wild) < T.captureRange);
      this.drawFx(time);
    }

    // ---------------------------------------------------------------- enemies
    emerge(type, x, y) {
      this.pending++;
      const g = this.add.graphics().setDepth(2);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 600,
        onUpdate: tw => { const v = tw.getValue(); g.clear(); g.fillStyle(0x07080a, 0.7 * v); g.fillEllipse(x, y + 10, 40 * v, 18 * v); },
        onComplete: () => { g.destroy(); this.pending--; if (!this.leaving && this.sys.isActive() && this.canSpawn()) this.spawnEnemy(type, x, y); },
      });
    }

    spawnEnemy(type, x, y) {
      const def = E[type];
      const z = this.enemies.create(x, y, type);
      z.type = type; z.hp = def.hp; z.mode = 'chase'; z.t = 0; z.kbT = 0; z.stun = 0; z.aggro = 0; z.spikeT = 0;
      z.spd = z.baseSpd = def.speed * Phaser.Math.FloatBetween(0.88, 1.15);
      if (type === 'runner') z.body.setCircle(10, 14, 22);
      else if (type === 'brute') { z.body.setCircle(22, 10, 8); z.face = Math.atan2(this.hero.y - y, this.hero.x - x); }
      else if (type === 'bloater') z.body.setCircle(15, 9, 12);
      else z.body.setCircle(13, 11, 16);
      if (type === 'spitter') { z.fireT = Phaser.Math.FloatBetween(1, 2); z.strafe = Math.random() < 0.5 ? 1 : -1; }
      z.setScale(0.2);
      this.tweens.add({ targets: z, scale: 1, duration: 220, ease: 'Back.out' });
      return z;
    }

    updateEnemy(z, dt, time) {
      const def = E[z.type];
      z.aggro = Math.max(0, z.aggro - dt);
      if (z.kbT > 0) { z.kbT -= dt; z.setVelocity(z.kbx, z.kby); z.kbx *= 0.85; z.kby *= 0.85; return; }
      if (z.stun > 0) {
        z.stun -= dt; z.setVelocity(0, 0);
        z.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time * 0.015)));
        if (z.stun <= 0) { z.setAlpha(1); z.mode = 'chase'; }
        return;
      }
      const tg = this.targetFor(z);
      const dx = tg.x - z.x, dy = tg.y - z.y, d = Math.hypot(dx, dy) || 1;
      if (z.type !== 'brute' && Math.abs(dx) > 3) z.setFlipX(dx < 0);
      if (z.type === 'walker' || z.type === 'runner') this.updateLunger(z, def, tg, dx, dy, d, dt);
      else if (z.type === 'spitter') this.updateSpitter(z, def, tg, dx, dy, d, dt);
      else if (z.type === 'brute') this.updateBrute(z, def, tg, dx, dy, d, dt);
      else if (z.type === 'bloater') this.updateBloater(z, def, tg, dx, dy, d, dt, time);
    }

    updateLunger(z, def, tg, dx, dy, d, dt) {
      const dEdge = d - (tg.pad || 0);
      switch (z.mode) {
        case 'chase':
          z.setVelocity(dx / d * z.spd, dy / d * z.spd);
          if (tg.kind !== 'path' && dEdge < def.windupRange && !(HUD.dead && tg.kind === 'hero')) {
            z.mode = 'windup'; z.t = def.windup; z.setVelocity(0, 0); z.ldx = dx / d; z.ldy = dy / d; z.tg = tg;
            z.setTint(0xff6666);
            this.tweens.add({ targets: z, scale: 1.2, duration: def.windup * 1000, ease: 'Quad.in' });
          }
          break;
        case 'windup':
          z.t -= dt; z.setVelocity(0, 0);
          if (z.t > def.windup * 0.45) { z.ldx = dx / d; z.ldy = dy / d; z.tg = tg; }
          if (z.t <= 0) { z.mode = 'lunge'; z.t = def.lungeT; untint(z); this.tweens.killTweensOf(z); z.setScale(1); z.hitDone = false; }
          break;
        case 'lunge': {
          z.t -= dt; z.setVelocity(z.ldx * def.lunge, z.ldy * def.lunge);
          const lt = z.tg || tg;
          const ld = Math.hypot(lt.x - z.x, lt.y - z.y) - (lt.pad || 0);
          if (!z.hitDone && ld < 34 && lt.kind !== 'path') { z.hitDone = true; this.hitTarget(lt, def.dmg, z.ldx, z.ldy); }
          if (z.t <= 0) { z.mode = 'recover'; z.t = def.recover; }
          break;
        }
        case 'recover':
          z.t -= dt; z.setVelocity(dx / d * z.spd * 0.3, dy / d * z.spd * 0.3);
          if (z.t <= 0) z.mode = 'chase';
          break;
      }
    }

    updateSpitter(z, def, tg, dx, dy, d, dt) {
      z.fireT -= dt;
      if (z.mode === 'chase') {
        let vx, vy;
        if (tg.kind === 'path') { vx = dx / d; vy = dy / d; }
        else if (d > def.keep + 40) { vx = dx / d; vy = dy / d; }
        else if (d < def.keep - 40) { vx = -dx / d; vy = -dy / d; }
        else { vx = -dy / d * z.strafe; vy = dx / d * z.strafe; }
        z.setVelocity(vx * z.spd, vy * z.spd);
        if (tg.kind !== 'path' && z.fireT <= 0 && d < 430 && !(HUD.dead && tg.kind === 'hero')) { z.mode = 'windup'; z.t = def.windup; z.tg = tg; z.setTint(0xc8ff6a); z.setVelocity(0, 0); }
      } else if (z.mode === 'windup') {
        z.t -= dt; z.setVelocity(0, 0);
        if (z.t <= 0) {
          untint(z); this.spit(z, z.tg || tg, 'spit', def.spitSpeed);
          z.fireT = def.fireCd * Phaser.Math.FloatBetween(0.85, 1.15); z.mode = 'chase';
          if (Math.random() < 0.5) z.strafe *= -1;
        }
      } else z.mode = 'chase';
    }

    spit(from, tg, tex, speed) {
      const d = new V(tg.x - from.x, tg.y - from.y).normalize();
      const s = this.spits.create(from.x + d.x * 18, from.y + d.y * 18, tex);
      s.isSpit = true; s.life = 3; s.setDepth(850);
      s.body.setCircle(6, s.width / 2 - 6, s.height / 2 - 6);
      s.setVelocity(d.x * speed, d.y * speed);
    }

    splash(s) { if (!s.active) return; this.spark(s.x, s.y, s.texture.key === 'spark' ? 0x5fd3ff : 0xb5c94f, 5); s.destroy(); }

    updateBrute(z, def, tg, dx, dy, d, dt) {
      const want = Math.atan2(dy, dx);
      const turn = z.mode === 'chase' ? def.turn : (z.mode === 'recover' ? def.turn * 0.35 : 0);
      z.face = Phaser.Math.Angle.RotateTo(z.face, want, turn * dt);
      z.setFlipX(Math.cos(z.face) < 0);
      switch (z.mode) {
        case 'chase':
          z.setVelocity(Math.cos(z.face) * z.spd, Math.sin(z.face) * z.spd);
          if (tg.kind !== 'path' && d - (tg.pad || 0) < def.windupRange && Math.abs(Phaser.Math.Angle.Wrap(want - z.face)) < 0.6 && !(HUD.dead && tg.kind === 'hero')) {
            z.mode = 'windup'; z.t = def.windup; z.setVelocity(0, 0); z.setTint(0xff6666);
          }
          break;
        case 'windup':
          z.t -= dt; z.setVelocity(0, 0);
          if (z.t <= 0) { untint(z); this.slam(z, def); z.mode = 'recover'; z.t = def.recover; }
          break;
        default:
          z.t -= dt; z.setVelocity(0, 0);
          if (z.t <= 0) z.mode = 'chase';
      }
    }

    inArc(z, o, range, arc, pad = 0) {
      const d = dist(z, o) - pad; if (d > range + 14) return false;
      return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(o.y - z.y, o.x - z.x) - z.face)) < arc || d < 30;
    }

    slam(z, def) {
      const fx = Math.cos(z.face), fy = Math.sin(z.face);
      if (this.inArc(z, this.hero, def.slamRange, def.slamArc)) this.hurtHero(fx, fy, def.dmg);
      if (this.cage && this.inArc(z, this.cage, def.slamRange, def.slamArc)) this.damageCage(def.dmg);
      this.slamExtra(z, def);
      this.ring(z.x + fx * 50, z.y + fy * 50, 70, 0xc0c6cc);
      this.spark(z.x + fx * 60, z.y + fy * 60, 0x8a7a5a, 10);
      this.cameras.main.shake(140, 0.009);
    }

    updateBloater(z, def, tg, dx, dy, d, dt, time) {
      if (z.mode === 'fuse') {
        z.setVelocity(0, 0); z.t -= dt;
        if (Math.floor(time / 70) % 2) z.setTint(0xff5555); else untint(z);
        if (z.t <= 0) this.explode(z);
        return;
      }
      z.setVelocity(dx / d * z.spd, dy / d * z.spd);
      if (tg.kind !== 'path' && d - (tg.pad || 0) < def.fuseRange && !(HUD.dead && tg.kind === 'hero')) this.lightFuse(z, def.fuse);
    }

    lightFuse(z, t) {
      if (z.mode === 'fuse') { z.t = Math.min(z.t, t); return; }
      z.mode = 'fuse'; z.t = t; z.stun = 0; z.kbT = 0;
      this.tweens.killTweensOf(z);
      this.tweens.add({ targets: z, scale: 1.4, duration: t * 1000, ease: 'Quad.in' });
    }

    explode(z) {
      if (!z.active) return;
      const def = E.bloater, x = z.x, y = z.y;
      z.destroy();
      HUD.kills = (HUD.kills || 0) + 1;
      this.ring(x, y, def.boomR, 0xb5c94f); this.ring(x, y, def.boomR * 0.6, 0xff6a3d);
      this.spark(x, y, 0xb5c94f, 16); this.spark(x, y, 0xff6a3d, 8);
      this.decal(x, y); this.decal(x + 14, y - 8);
      this.cameras.main.shake(220, 0.014);
      this.freeze(0.07);
      if (dist(this.hero, { x, y }) < def.boomR) { const d = new V(this.hero.x - x, this.hero.y - y).normalize(); this.hurtHero(d.x, d.y, def.dmg); }
      if (this.cage && dist(this.cage, { x, y }) < def.boomR) this.damageCage(2);
      kids(this.enemies).forEach(o => {
        if (!o.active || dist(o, { x, y }) > def.boomR) return;
        const d = new V(o.x - x, o.y - y); if (d.lengthSq() < 1) d.set(1, 0); d.normalize();
        this.damage(o, 4, d, 420, true, true);
      });
      kids(this.crates).forEach(c => { if (c.active && dist(c, { x, y }) < def.boomR) this.hitCrate(c, 9); });
      this.explodeExtra(x, y, def.boomR);
      this.dropScrap(x, y, def.scrap);
    }

    cancelWindup(z) {
      this.tweens.killTweensOf(z); z.setScale(1); untint(z);
      if (z.type === 'spitter') { z.mode = 'chase'; z.fireT = 1.2; }
      else { z.mode = 'recover'; z.t = E[z.type].recover || 0.5; }
    }

    stunEnemy(z, s) {
      if (!z.active || z.dying || z.mode === 'fuse') return;
      z.stun = z.type === 'brute' ? s * 0.5 : s;
      if (z.mode === 'windup') this.cancelWindup(z);
    }

    hit(o, dmg, dir, kb, interrupt, ignoreArmor) {
      if (o.isWild) this.damageWild(o, dmg, dir, kb);
      else this.damage(o, dmg, dir, kb, interrupt, ignoreArmor);
    }

    damage(z, dmg, dir, kb, interrupt, ignoreArmor, fromTurret) {
      if (!z.active || z.dying) return;
      if (!fromTurret) z.aggro = 3;
      if (z.type === 'brute' && !ignoreArmor) {
        const fx = Math.cos(z.face), fy = Math.sin(z.face);
        if (dir.x * fx + dir.y * fy < -0.35) {
          this.floatText(z.x, z.y - 34, 'BLOCKED', '#c0c6cc', 14);
          this.spark(z.x + fx * 22, z.y + fy * 22, 0xdfe5ea, 5);
          return;
        }
      }
      const kbm = z.type === 'brute' ? 0.15 : 1;
      z.hp -= dmg;
      if (z.mode !== 'fuse' && kb > 0) { z.kbx = dir.x * kb * kbm; z.kby = dir.y * kb * kbm; z.kbT = 0.12; }
      if (interrupt && z.mode === 'windup' && z.type !== 'brute') this.cancelWindup(z);
      flash(z, 0xffffff);
      this.time.delayedCall(70, () => { if (z.active) { untint(z); if (z.mode === 'windup') z.setTint(z.type === 'spitter' ? 0xc8ff6a : 0xff6666); } });
      this.floatText(z.x, z.y - 24, String(dmg), dmg >= 3 ? '#ffd166' : '#ffffff', dmg >= 3 ? 22 : 17);
      if (z.hp <= 0) {
        if (z.type === 'bloater') { z.dying = true; this.lightFuse(z, E.bloater.deathFuse); }
        else this.killEnemy(z);
      }
    }

    killEnemy(z) {
      HUD.kills = (HUD.kills || 0) + 1;
      const big = z.type === 'brute';
      this.spark(z.x, z.y, 0x9acd32, big ? 20 : 12);
      this.decal(z.x, z.y); if (big) this.decal(z.x + 12, z.y + 6);
      this.cameras.main.shake(big ? 160 : 70, big ? 0.01 : 0.004);
      this.dropScrap(z.x, z.y, E[z.type].scrap);
      z.destroy();
    }

    decal(x, y) { this.add.image(x, y, 'splat').setDepth(1).setAlpha(0.8).setAngle(Phaser.Math.Between(0, 3) * 90); }

    // ---------------------------------------------------------------- loot
    dropScrap(x, y, range) {
      const n = Phaser.Math.Between(range[0], range[1]);
      for (let i = 0; i < n; i++) {
        const p = this.add.image(x, y, 'scrap').setDepth(4);
        const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(10, 34);
        p.ready = false;
        this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, duration: 260, ease: 'Quad.out', onComplete: () => { p.ready = true; } });
        this.pickups.push(p);
      }
    }

    updatePickups(dt) {
      const h = this.hero;
      this.pickups = this.pickups.filter(p => {
        if (!p.active) return false;
        if (!p.ready || (HUD.dead && !this.magnetAll)) return true;
        const d = dist(p, h);
        if (d < 22) { this.collectScrap(1); HUD.scrapPop = 0.25; p.destroy(); return false; }
        if (d < (this.magnetAll ? 5000 : 120)) { const sp = (this.magnetAll ? 620 : 420) * dt; p.x += (h.x - p.x) / d * sp; p.y += (h.y - p.y) / d * sp; }
        return true;
      });
    }

    hitCrate(cr, dmg) {
      if (!cr.active) return;
      cr.hp -= dmg;
      flash(cr, 0xffffff); this.time.delayedCall(60, () => cr.active && untint(cr));
      if (cr.hp <= 0) { this.spark(cr.x, cr.y, 0x6b4a2b, 10); this.dropScrap(cr.x, cr.y, [2, 4]); cr.destroy(); }
    }

    // ---------------------------------------------------------------- hero combat
    hittables(includeWild) {
      const list = kids(this.enemies).filter(z => z.active && !z.dying);
      if (includeWild && this.wild && this.wild.active && !this.wild.caged && !this.wild.fleeing) list.push(this.wild);
      return list;
    }

    nearestEnemy(x, y, range, includeWild) {
      let best = null, bd = range;
      this.hittables(includeWild).forEach(z => { const d = Phaser.Math.Distance.Between(x, y, z.x, z.y); if (d < bd) { bd = d; best = z; } });
      return best;
    }

    meleeTargets(dir) {
      const out = [], h = this.hero, a = dir.angle();
      this.hittables(true).forEach(z => {
        const d = Phaser.Math.Distance.Between(h.x, h.y, z.x, z.y);
        if (d > T.meleeRange + (z.type === 'brute' ? 26 : 16)) return;
        if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(z.y - h.y, z.x - h.x) - a)) < T.meleeHalfArc || d < 30) out.push(z);
      });
      return out;
    }

    attack(dir, fromTwin) {
      const h = this.hero;
      if (!dir) {
        const z = this.nearestEnemy(h.x, h.y, T.autoRange, true);
        dir = z ? new V(z.x - h.x, z.y - h.y).normalize() : this.facing.clone();
      } else dir = new V(dir.x, dir.y).normalize();
      const mt = this.meleeTargets(dir);
      if (mt.length) {
        if (this.swordCdT > 0) return false;
        this.swordCdT = T.swordCd; this.facing.copy(dir); this.faceLock = 0.3;
        this.swing(dir, mt);
        return true;
      }
      if (this.gunCdT > 0) return false;
      if (!fromTwin) { if (HUD.ammo < 1) { this.dryFire(); return false; } HUD.ammo--; }
      this.gunCdT = fromTwin ? T.twinFireRate : T.gunCd;
      this.facing.copy(dir); this.faceLock = 0.3;
      this.shoot(dir, fromTwin ? T.twinDmg : T.gunDmg);
      return true;
    }

    shoot(dir, dmg) {
      const h = this.hero;
      const b = this.bullets.create(h.x + dir.x * 26, h.y + 6 + dir.y * 26, 'bullet');
      b.isBullet = true; b.dmg = dmg;
      b.body.setCircle(5, 1, 1);
      b.setVelocity(dir.x * T.bulletSpeed, dir.y * T.bulletSpeed);
      b.sx = b.x; b.sy = b.y; b.setDepth(850);
      this.gunKick = 6;
      const fl = this.add.image(h.x + dir.x * 34, h.y + 6 + dir.y * 34, 'dot').setTint(0xffd166).setScale(2.2).setDepth(860);
      this.tweens.add({ targets: fl, alpha: 0, scale: 0.5, duration: 70, onComplete: () => fl.destroy() });
      this.cameras.main.shake(40, 0.0015);
    }

    dryFire() {
      if (this.dryT && this.time.now - this.dryT < 300) return;
      this.dryT = this.time.now;
      this.floatText(this.hero.x, this.hero.y - 40, 'RELOADING', '#ff8c42', 13);
    }

    swing(dir, targets) {
      const h = this.hero, a = dir.angle();
      const g = this.add.graphics().setDepth(870);
      g.fillStyle(0xffffff, 0.85);
      g.beginPath(); g.slice(h.x, h.y, T.meleeRange + 12, a - T.meleeHalfArc, a + T.meleeHalfArc, false); g.fillPath();
      g.fillStyle(0x24272c, 1);
      g.beginPath(); g.slice(h.x, h.y, T.meleeRange - 18, a - T.meleeHalfArc - 0.1, a + T.meleeHalfArc + 0.1, false); g.fillPath();
      this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
      targets.forEach(z => this.hit(z, T.swordDmg, new V(z.x - h.x, z.y - h.y).normalize(), T.swordKb, true, false));
      kids(this.crates).forEach(c => {
        if (!c.active || dist(c, h) > T.meleeRange + 24) return;
        if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(c.y - h.y, c.x - h.x) - a)) < T.meleeHalfArc) this.hitCrate(c, 3);
      });
      this.freeze(0.06);
      this.cameras.main.shake(90, 0.006);
    }

    bulletHit(b, z) {
      if (!b.active || !z.active || z.dying) return;
      const d = new V(b.body.velocity.x, b.body.velocity.y).normalize();
      this.spark(b.x, b.y, 0xfff2a8, 3);
      const dmg = b.dmg, turret = b.fromTurret; b.destroy();
      this.damage(z, dmg, d, turret ? 90 : T.gunKb, false, false, turret);
      if (!turret) this.freeze(0.025);
    }

    tryDash(mv) {
      if (HUD.dashCd > 0) return;
      HUD.dashCd = T.dashCd;
      this.dashDir.copy(mv.length() > 0.1 ? mv : this.facing).normalize();
      this.dashT = T.dashTime; this.inv = Math.max(this.inv, T.dashTime + 0.06); this.kbT = 0;
    }

    hurtHero(dx, dy, dmg = 1) {
      if (this.inv > 0 || this.dashT > 0 || HUD.dead || this.leaving) return;
      HUD.hp = Math.max(0, HUD.hp - dmg);
      this.inv = T.iframes;
      this.kb.set(dx * 520, dy * 520); this.kbT = 0.12;
      flash(this.hero, 0xff4444);
      this.time.delayedCall(110, () => this.hero.active && untint(this.hero));
      this.cameras.main.shake(200, 0.012);
      this.freeze(0.09);
      if (HUD.hp <= 0) {
        HUD.dead = true; Ctl.twin = null;
        this.spark(this.hero.x, this.hero.y, 0x3fd0c9, 20);
        this.hero.setTint(0x555555);
        this.heroDied();
      }
    }

    freeze(s) {
      if (this.hitstop <= 0) this.physics.world.pause();
      this.hitstop = Math.max(this.hitstop, s);
    }

    // ---------------------------------------------------------------- abilities
    ability(i, dir) {
      const h = this.hero;
      if (i === 1) {
        const hd = this.hound;
        if (HUD.cd1 > 0 || hd.mode === 'pounce') return;
        HUD.cd1 = T.pounceCd;
        let lx, ly;
        if (dir) { lx = h.x + dir.x * T.pounceDist; ly = h.y + dir.y * T.pounceDist; }
        else {
          const z = this.nearestEnemy(h.x, h.y, T.pounceAuto, false);
          if (z) { lx = z.x; ly = z.y; } else { lx = h.x + this.facing.x * T.pounceDist; ly = h.y + this.facing.y * T.pounceDist; }
        }
        lx = Phaser.Math.Clamp(lx, TILE * 1.2, this.worldW - TILE * 1.2); ly = Phaser.Math.Clamp(ly, TILE * 1.2, this.worldH - TILE * 1.2);
        const dur = 0.28;
        hd.mode = 'pounce'; hd.t = dur; hd.vx = (lx - hd.x) / dur; hd.vy = (ly - hd.y) / dur;
        hd.body.checkCollision.none = true;
        hd.setFlipX(hd.vx < 0);
        this.tweens.add({ targets: hd, scale: 1.8, duration: dur * 500, yoyo: true, ease: 'Sine.out' });
      }
      if (i === 2) {
        if (HUD.cd2 > 0) return;
        if (this.crow) {
          const first = this.nearestEnemy(this.crow.x, this.crow.y, 320, false);
          if (!first) { this.floatText(this.crow.x, this.crow.y - 24, 'NO TARGET', '#5fd3ff', 12); return; }
          HUD.cd2 = T.chainCd;
          const hitList = [first]; let cur = first;
          while (hitList.length < T.chainCount) {
            let nxt = null, bd = T.chainJump;
            this.hittables(false).forEach(z => { if (!hitList.includes(z)) { const d = dist(z, cur); if (d < bd) { bd = d; nxt = z; } } });
            if (!nxt) break; hitList.push(nxt); cur = nxt;
          }
          let prev = this.crow;
          hitList.forEach(z => {
            this.bolt(prev.x, prev.y, z.x, z.y); prev = z;
            this.damage(z, T.chainDmg, new V(z.x - this.crow.x, z.y - this.crow.y).normalize(), 120, true, true);
            this.stunEnemy(z, T.chainStun);
          });
          this.freeze(0.05); this.cameras.main.shake(120, 0.006);
        } else {
          HUD.cd2 = T.howlCd;
          this.ring(h.x, h.y, T.howlRadius, 0xe08a3c);
          this.ring(this.hound.x, this.hound.y, 60, 0xffd166);
          this.hittables(false).forEach(z => {
            if (dist(h, z) > T.howlRadius) return;
            this.damage(z, 1, new V(z.x - h.x, z.y - h.y).normalize(), T.howlKb, true, true);
            if (z.active) { this.stunEnemy(z, T.howlStun); z.kbT = 0.2; }
          });
          this.cameras.main.shake(160, 0.008); this.freeze(0.05);
        }
      }
    }

    pounceLand() {
      const hd = this.hound;
      hd.mode = 'follow'; hd.body.checkCollision.none = false; hd.setVelocity(0, 0);
      this.ring(hd.x, hd.y, T.pounceRadius, 0xe08a3c);
      this.spark(hd.x, hd.y, 0xe08a3c, 8);
      let hitAny = false;
      this.hittables(true).forEach(z => {
        if (dist(hd, z) > T.pounceRadius) return;
        hitAny = true;
        const d = new V(z.x - hd.x, z.y - hd.y); if (d.lengthSq() < 1) d.set(1, 0); d.normalize();
        this.hit(z, T.pounceDmg, d, 260, true, true);
        if (!z.isWild) this.stunEnemy(z, T.pounceStun);
      });
      this.cameras.main.shake(120, hitAny ? 0.008 : 0.003);
      if (hitAny) this.freeze(0.06);
    }

    updateHound(dt) {
      const hd = this.hound, h = this.hero;
      hd.biteT -= dt;
      if (hd.mode === 'pounce') { hd.t -= dt; hd.setVelocity(hd.vx, hd.vy); if (hd.t <= 0) this.pounceLand(); return; }
      if (dist(hd, h) > 520) hd.setPosition(h.x - 30, h.y + 30);
      const target = HUD.dead ? null : this.nearestEnemy(hd.x, hd.y, 230, false);
      if (target && dist(h, target) < 320) {
        const d = new V(target.x - hd.x, target.y - hd.y); const dd = d.length(); d.normalize();
        if (dd > T.houndBiteRange * 0.7) hd.setVelocity(d.x * 270, d.y * 270); else hd.setVelocity(0, 0);
        hd.setFlipX(d.x < 0);
        if (dd < T.houndBiteRange && hd.biteT <= 0) {
          hd.biteT = T.houndBiteCd;
          this.damage(target, T.houndBiteDmg, d, 140, false, false);
          this.tweens.add({ targets: hd, scale: 1.25, duration: 70, yoyo: true });
        }
      } else {
        const tx = h.x - this.facing.x * 46 + this.facing.y * 18, ty = h.y - this.facing.y * 46 - this.facing.x * 18;
        const d = new V(tx - hd.x, ty - hd.y); const dd = d.length();
        if (dd > 12) { d.normalize(); const sp = Math.min(330, dd * 5); hd.setVelocity(d.x * sp, d.y * sp); hd.setFlipX(d.x < 0); }
        else hd.setVelocity(0, 0);
      }
    }

    updateCrow(dt, time) {
      const c = this.crow; if (!c) return;
      const h = this.hero;
      const tx = h.x + this.facing.y * 34 + 10, ty = h.y - 44 + Math.sin(time * 0.006) * 5;
      c.x += (tx - c.x) * Math.min(1, dt * 6); c.y += (ty - c.y) * Math.min(1, dt * 6);
      c.setFlipX(this.facing.x < 0);
      c.zapT -= dt;
      if (c.zapT <= 0 && !HUD.dead) {
        const z = this.nearestEnemy(c.x, c.y, T.crowZapRange, false);
        if (z) {
          c.zapT = T.crowZapCd;
          this.bolt(c.x, c.y, z.x, z.y);
          this.damage(z, T.crowZapDmg, new V(z.x - c.x, z.y - c.y).normalize(), 60, false, true);
        } else c.zapT = 0.3;
      }
    }

    bolt(x1, y1, x2, y2) {
      const g = this.add.graphics().setDepth(880);
      const pts = [{ x: x1, y: y1 }];
      for (let i = 1; i < 5; i++) { const t = i / 5; pts.push({ x: x1 + (x2 - x1) * t + Phaser.Math.Between(-9, 9), y: y1 + (y2 - y1) * t + Phaser.Math.Between(-9, 9) }); }
      pts.push({ x: x2, y: y2 });
      g.lineStyle(5, 0x5fd3ff, 0.5); g.strokePoints(pts);
      g.lineStyle(2, 0xffffff, 1); g.strokePoints(pts);
      this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    }

    // ---------------------------------------------------------------- wild creature + cage (dungeon uses these)
    updateWild(dt, time) {
      const c = this.wild;
      if (!c || !c.active || c.caged) return;
      if (c.fleeing) {
        c.setVelocity(c.fvx, c.fvy); c.ft -= dt; c.setAlpha(Math.max(0, c.ft));
        if (c.ft <= 0) { c.destroy(); this.wild = null; }
        return;
      }
      if (c.kbT > 0) { c.kbT -= dt; c.setVelocity(c.kbx, c.kby); return; }
      const h = this.hero;
      if (c.weak > 0) { c.weak -= dt; if (c.weak <= 0) { c.hp = 6; this.floatText(c.x, c.y - 26, 'RECOVERED', '#5fd3ff', 13); } }
      if (c.mode === 'windup') {
        c.t -= dt; c.setVelocity(0, 0);
        if (c.t <= 0) { untint(c); this.spit(c, h, 'spark', 380); c.mode = 'wander'; c.zapT = Phaser.Math.FloatBetween(2.6, 3.6); }
        return;
      }
      c.wt -= dt;
      if (c.wt <= 0 || Phaser.Math.Distance.Between(c.x, c.y, c.tx, c.ty) < 12) {
        c.wt = Phaser.Math.FloatBetween(1, 2.2);
        c.tx = Phaser.Math.Clamp(c.x + Phaser.Math.Between(-220, 220), TILE * 1.5, this.worldW - TILE * 1.5);
        c.ty = Phaser.Math.Clamp(c.y + Phaser.Math.Between(-160, 160), TILE * 1.5, this.worldH - TILE * 1.5);
      }
      const sp = c.weak > 0 ? 45 : 125;
      const d = new V(c.tx - c.x, c.ty - c.y); const dd = d.length() || 1;
      c.setVelocity(d.x / dd * sp, d.y / dd * sp + Math.sin(time * 0.01) * 20);
      if (Math.abs(d.x) > 2) c.setFlipX(d.x < 0);
      if (c.weak <= 0 && !HUD.dead) {
        c.zapT -= dt;
        if (c.zapT <= 0 && dist(c, h) < 330) { c.mode = 'windup'; c.t = 0.6; c.setTint(0x5fd3ff); }
      }
    }

    damageWild(c, dmg, dir, kb) {
      if (!c.active || c.caged || c.fleeing) return;
      c.kbx = dir.x * kb; c.kby = dir.y * kb; c.kbT = 0.1;
      flash(c, 0xffffff); this.time.delayedCall(70, () => c.active && untint(c));
      if (c.weak > 0) { this.floatText(c.x, c.y - 26, 'WEAK!', '#f2d14b', 14); return; }
      c.hp = Math.max(1, c.hp - dmg);
      this.floatText(c.x, c.y - 24, String(dmg), '#ffffff', 16);
      if (c.hp <= 3) { c.weak = T.weakTime; c.mode = 'wander'; this.floatText(c.x, c.y - 40, 'WEAKENED — CAGE IT!', '#f2d14b', 15); }
    }

    throwCage() {
      const c = this.wild, h = this.hero;
      if (!HUD.canCapture || !c) return;
      this.run.cages--;
      c.caged = true; c.setVelocity(0, 0);
      const fly = this.add.image(h.x, h.y, 'cage').setDepth(870).setScale(0.6);
      this.tweens.add({
        targets: fly, x: c.x, y: c.y, scale: 1, angle: 360, duration: 260, ease: 'Quad.out',
        onComplete: () => {
          fly.destroy();
          if (!c.active) return;
          c.setVisible(false); c.body.enable = false;
          this.cage = this.add.image(c.x, c.y, 'cage').setDepth(15);
          this.cage.t = T.cageTime; this.cage.hp = T.cageHp; this.cage.baseX = c.x;
          this.spark(c.x, c.y, 0xc0c6cc, 8);
          this.cameras.main.shake(90, 0.004);
          HUD.banner = { text: 'PROTECT THE CAGE!', t: 1.4 };
        },
      });
    }

    damageCage(dmg) {
      const cg = this.cage; if (!cg) return;
      cg.hp -= dmg;
      flash(cg, 0xff6666); this.time.delayedCall(80, () => cg.active && untint(cg));
      this.floatText(cg.x, cg.y - 28, '-' + dmg, '#ff8c8c', 15);
      if (cg.hp <= 0) {
        const c = this.wild;
        this.spark(cg.x, cg.y, 0xc0c6cc, 14);
        cg.destroy(); this.cage = null;
        if (c && c.active) {
          c.setVisible(true); c.body.enable = true; c.caged = false; c.fleeing = true; c.ft = 1;
          const a = Math.random() * Math.PI * 2; c.fvx = Math.cos(a) * 260; c.fvy = Math.sin(a) * 260 - 120;
        }
        HUD.banner = { text: 'IT ESCAPED!', t: 1.4 };
      }
    }

    updateCage(dt) {
      const cg = this.cage; if (!cg) return;
      cg.t -= dt;
      cg.x = cg.baseX + Math.sin(this.time.now * 0.06) * 3;
      cg.setAngle(Math.sin(this.time.now * 0.04) * 8);
      if (cg.t <= 0) {
        const c = this.wild;
        this.run.captured.push(c ? c.species : 'crow');
        if (c) c.destroy(); this.wild = null;
        this.spark(cg.x, cg.y, 0xf2d14b, 18);
        this.ring(cg.x, cg.y, 70, 0xf2d14b);
        this.floatText(cg.x, cg.y - 34, 'CAUGHT!', '#f2d14b', 22);
        const done = cg; this.cage = null;
        this.tweens.add({ targets: done, y: done.y - 40, alpha: 0, duration: 500, onComplete: () => done.destroy() });
        HUD.banner = { text: 'CAUGHT A SPARK CROW!', sub: 'Extract to bring it home', t: 2.4 };
      }
    }

    // ---------------------------------------------------------------- visuals
    drawFx(time) {
      const g = this.fx, h = this.hero;
      g.clear();
      if (!HUD.dead && !this.inputFrozen()) { g.lineStyle(2, 0xffffff, 0.07); g.strokeCircle(h.x, h.y, T.meleeRange); }
      kids(this.enemies).forEach(z => {
        if (!z.active) return;
        if (z.mode === 'fuse') { g.lineStyle(2, 0xff6a3d, 0.6); g.strokeCircle(z.x, z.y, E.bloater.boomR); return; }
        if (z.mode !== 'windup') return;
        if (z.type === 'brute') {
          const p = 1 - z.t / E.brute.windup;
          g.fillStyle(0xff3b3b, 0.15 + 0.35 * p);
          g.beginPath(); g.slice(z.x, z.y, E.brute.slamRange, z.face - E.brute.slamArc, z.face + E.brute.slamArc, false); g.fillPath();
        } else if (z.type === 'spitter') {
          const tg = z.tg || this.targetFor(z);
          g.lineStyle(2, 0xb5c94f, 0.5); g.lineBetween(z.x, z.y, tg.x, tg.y);
        } else {
          const def = E[z.type], p = 1 - z.t / def.windup, L = def.lunge * def.lungeT, W = 15;
          const nx = -z.ldy, ny = z.ldx;
          g.fillStyle(0xff3b3b, 0.15 + 0.35 * p);
          g.fillPoints([
            { x: z.x + nx * W, y: z.y + ny * W }, { x: z.x + z.ldx * L + nx * W, y: z.y + z.ldy * L + ny * W },
            { x: z.x + z.ldx * L - nx * W, y: z.y + z.ldy * L - ny * W }, { x: z.x - nx * W, y: z.y - ny * W },
          ], true);
        }
      });
      const c = this.wild;
      if (c && c.active && !c.caged && !c.fleeing) {
        if (c.weak > 0) { g.lineStyle(3, 0xf2d14b, 0.5 + 0.4 * Math.sin(time * 0.012)); g.strokeCircle(c.x, c.y, 22); }
        if (c.mode === 'windup') { g.lineStyle(2, 0x5fd3ff, 0.5); g.lineBetween(c.x, c.y, h.x, h.y); }
      }
      if (this.cage) {
        const p = 1 - this.cage.t / T.cageTime;
        g.lineStyle(5, 0x000000, 0.5); g.strokeCircle(this.cage.baseX, this.cage.y, 30);
        g.lineStyle(4, 0xf2d14b, 1); g.beginPath(); g.arc(this.cage.baseX, this.cage.y, 30, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false); g.strokePath();
        for (let i = 0; i < T.cageHp; i++) { g.fillStyle(i < this.cage.hp ? 0xc0c6cc : 0x3a3f46, 1); g.fillRect(this.cage.baseX - 22 + i * 12, this.cage.y + 34, 9, 5); }
      }
      this.drawSceneFx(g, time);
      if (Ctl.aim && !HUD.dead && !this.inputFrozen()) {
        const d = Ctl.aim, a = d.angle();
        if (this.meleeTargets(d).length) {
          g.fillStyle(0xffffff, 0.22);
          g.beginPath(); g.slice(h.x, h.y, T.meleeRange + 12, a - T.meleeHalfArc, a + T.meleeHalfArc, false); g.fillPath();
        } else {
          g.lineStyle(8, 0xffffff, 0.16);
          g.lineBetween(h.x + d.x * 26, h.y + 6 + d.y * 26, h.x + d.x * T.bulletRange, h.y + 6 + d.y * T.bulletRange);
        }
      }
      if (Ctl.aimAbility && !HUD.dead) {
        const d = Ctl.aimAbility.dir, lx = h.x + d.x * T.pounceDist, ly = h.y + d.y * T.pounceDist;
        g.lineStyle(3, 0xe08a3c, 0.7); g.strokeCircle(lx, ly, T.pounceRadius);
        g.lineStyle(2, 0xe08a3c, 0.3); g.lineBetween(this.hound.x, this.hound.y, lx, ly);
      }
      if (Ctl.mode === 'brawl' && !HUD.dead && !this.inputFrozen()) {
        const w = 14, gap = 4, total = T.ammoMax * w + (T.ammoMax - 1) * gap, x0 = h.x - total / 2, y = h.y - 34;
        for (let i = 0; i < T.ammoMax; i++) {
          const x = x0 + i * (w + gap);
          g.fillStyle(0x000000, 0.6); g.fillRect(x - 1, y - 1, w + 2, 8);
          const f = i < HUD.ammo ? 1 : (i === HUD.ammo ? HUD.reload / T.reloadTime : 0);
          g.fillStyle(i < HUD.ammo ? 0xff8c42 : 0x7a4a2a, 1); g.fillRect(x, y, w * f, 6);
        }
      }
    }

    floatText(x, y, str, color, size) {
      const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(950);
      this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 600, ease: 'Quad.out', onComplete: () => t.destroy() });
    }

    spark(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const p = this.add.image(x, y, 'dot').setTint(color).setDepth(890).setScale(Phaser.Math.FloatBetween(0.6, 1.3));
        const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(16, 55);
        this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(220, 420), ease: 'Quad.out', onComplete: () => p.destroy() });
      }
    }

    ring(x, y, r, color) {
      const g = this.add.graphics().setDepth(880);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 320, ease: 'Quad.out',
        onUpdate: tw => { const v = tw.getValue(); g.clear(); g.lineStyle(8 * (1 - v) + 1, color, 1 - v); g.strokeCircle(x, y, r * v); },
        onComplete: () => g.destroy(),
      });
    }
  }

  // ===================================================================
  //  DUNGEON — a run through the ruins (5 rooms)
  // ===================================================================
  class DungeonScene extends Combat {
    constructor() { super('dungeon'); }
    init(data) { this.run = data.run; }

    create() {
      makeTextures(this);
      const run = this.run;
      this.crates = null; this.bulletBlockers = null;
      HUD.scene = 'dungeon';
      HUD.maxHp = run.maxHp; HUD.hp = run.hp; HUD.room = run.room; HUD.scrap = run.scrap; HUD.cages = run.cages;
      HUD.banner = { text: run.room === T.rooms ? 'FINAL ROOM' : 'ROOM ' + run.room, t: 1.4 };
      HUD.prompt = null; HUD.building = false; HUD.panel = null; HUD.night = null;

      this.isExtractRoom = T.extractRooms.includes(run.room);
      this.grid = (run.room === T.rooms ? FINAL_ROOM : Phaser.Utils.Array.GetRandom(TEMPLATES)).map(r => r.padEnd(COLS, '#').slice(0, COLS));
      this.physics.world.setBounds(0, 0, RW, RH);
      this.solids = this.physics.add.staticGroup();
      this.crates = this.physics.add.staticGroup();
      this.buildRoom();
      this.setupCombat(this.entry.x, this.entry.y - 20, RW, RH, 420);

      if (run.room >= 2 && run.room <= 4) {
        const chance = (!(SAVE.creatures.crow > 0) && run.room === 2) ? 1 : 0.4;
        if (Math.random() < chance) this.spawnWild();
      }
      this.waves = ROOM_WAVES[run.room].map(w => w.slice());
      this.waveIdx = -1; this.waveDelay = 1.0;
      this.roomClear = false; this.extractT = 0;
    }

    collectScrap(n) { this.run.scrap += n; HUD.scrap = this.run.scrap; }
    onAbandon() { this.endRun({ type: 'abandon' }); }

    buildRoom() {
      const grid = this.grid;
      this.spawns = []; this.doorZones = [];
      const px = [], hx = [], dx = [];
      this.buildSolidRuns(grid, COLS, ROWS, '#');
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const ch = grid[r][c], x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
        if (ch === 'c') { const cr = this.crates.create(x, y, 'crate'); cr.refreshBody(); cr.hp = 2; cr.setDepth(5 + y / 1000); }
        if (ch === 'r') { const rb = this.solids.create(x, y, 'rubble'); rb.refreshBody(); rb.setDepth(5 + y / 1000); }
        if (ch === 's') this.spawns.push({ x, y });
        if (ch === 'P') px.push({ x, y });
        if (ch === 'H') hx.push({ x, y });
        if (ch === 'D') { dx.push({ x, y }); const z = this.add.zone(x, y, TILE, TILE); this.physics.add.existing(z, true); this.solids.add(z); this.doorZones.push(z); }
      }
      const avg = (a) => a.length ? { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length } : null;
      this.entry = avg(px) || { x: RW / 2, y: RH - TILE * 1.5 };
      this.hatchPos = avg(hx) || { x: RW / 2, y: RH / 2 };
      this.doorPos = avg(dx);
      this.drawGridFloor(grid, COLS, ROWS, '#D');
      this.doorG = this.add.graphics().setDepth(3);
      this.drawDoor(false);
      this.hatch = this.add.image(this.hatchPos.x, this.hatchPos.y, 'hatch').setDepth(1.5).setVisible(false);
    }

    drawDoor(open) {
      if (!this.doorPos) return;
      const g = this.doorG, x = this.doorPos.x - TILE, y = 0, w = TILE * 2, h = TILE;
      g.clear();
      if (!open) {
        g.fillStyle(0x3a1d18, 1); g.fillRect(x, y, w, h);
        g.fillStyle(0x7a3b2e, 1); for (let i = 6; i < w; i += 15) g.fillRect(x + i, y, 6, h);
        g.fillStyle(0x14161a, 1); g.fillRect(x, y + h - 6, w, 6);
      } else {
        g.fillStyle(0x07080a, 1); g.fillRect(x, y, w, h);
        g.fillStyle(0x8ef0a0, 1);
        for (let k = 0; k < 2; k++) { const cy = 14 + k * 14; g.fillTriangle(x + w / 2 - 12, cy + 9, x + w / 2 + 12, cy + 9, x + w / 2, cy - 3); }
      }
    }

    sceneUpdate(dt) {
      HUD.cages = this.run.cages;
      this.updateWaves(dt);
      this.updateExits(dt);
    }

    updateWaves(dt) {
      if (HUD.dead || this.roomClear) return;
      if (this.enemies.countActive(true) > 0 || this.pending > 0) return;
      if (this.waveIdx < this.waves.length - 1) {
        this.waveDelay -= dt;
        if (this.waveDelay > 0) return;
        this.waveIdx++; this.waveDelay = 1.2;
        const list = this.waves[this.waveIdx];
        const far = this.spawns.slice().sort((a, b) => dist(b, this.hero) - dist(a, this.hero));
        list.forEach((type, i) => {
          const sp = far[i % Math.max(1, Math.min(far.length, 4))] || { x: RW / 2, y: TILE * 2 };
          this.pending++;
          this.time.delayedCall(i * 280, () => { this.pending--; this.emerge(type, sp.x + Phaser.Math.Between(-14, 14), sp.y + Phaser.Math.Between(-14, 14)); });
        });
      } else this.clearRoom();
    }

    clearRoom() {
      this.roomClear = true; this.magnetAll = true;
      if (HUD.hp < HUD.maxHp) { HUD.hp++; this.floatText(this.hero.x, this.hero.y - 40, '+1 ♥', '#ff8c9e', 18); }
      if (this.run.room < T.rooms) { this.doorZones.forEach(z => z.destroy()); this.drawDoor(true); }
      if (this.isExtractRoom) {
        this.hatch.setVisible(true).setScale(0);
        this.tweens.add({ targets: this.hatch, scale: 1, duration: 400, ease: 'Back.out' });
      }
      HUD.banner = { text: this.run.room === T.rooms ? 'CLEARED! EXTRACT' : 'ROOM CLEAR', sub: this.isExtractRoom && this.run.room < T.rooms ? 'Hatch = go home with your loot  ·  Door = go deeper' : '', t: 2.6 };
    }

    updateExits(dt) {
      if (!this.roomClear || HUD.dead) return;
      const h = this.hero;
      if (this.doorPos && this.run.room < T.rooms && h.y < TILE * 0.95 && Math.abs(h.x - this.doorPos.x) < TILE) {
        this.leaving = true; h.setVelocity(0, 0);
        this.cameras.main.fadeOut(220);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          const run = this.run; run.room++; run.hp = HUD.hp;
          this.scene.restart({ run });
        });
        return;
      }
      if (this.isExtractRoom && dist(h, this.hatchPos) < 40) {
        this.extractT += dt;
        if (this.extractT >= 1.0) this.extract();
      } else this.extractT = 0;
    }

    extract() {
      const run = this.run;
      this.leaving = true; this.hero.setVelocity(0, 0);
      SAVE.scrap += run.scrap;
      SAVE.runs++; SAVE.bestRoom = Math.max(SAVE.bestRoom, run.room);
      run.captured.forEach(sp => { SAVE.creatures[sp] = (SAVE.creatures[sp] || 0) + 1; });
      writeSave();
      this.tweens.add({ targets: [this.hero, this.gun], scale: 0, duration: 300 });
      this.time.delayedCall(450, () => this.endRun({ type: 'extract', scrap: run.scrap, caught: run.captured.length ? 'Spark Crow' : '' }));
    }

    heroDied() {
      const run = this.run;
      HUD.deadText = `YOU DIED\nLost ${run.scrap} scrap`;
      SAVE.runs++; SAVE.bestRoom = Math.max(SAVE.bestRoom, run.room - 1); writeSave();
      this.time.delayedCall(1900, () => this.endRun({ type: 'dead', room: run.room, scrap: run.scrap, caught: run.captured.length }));
    }

    endRun(result) {
      this.leaving = true;
      this.scene.start('town', { result });
    }

    drawSceneFx(g) {
      if (this.extractT > 0) {
        g.lineStyle(5, 0x8ef0a0, 1); g.beginPath();
        g.arc(this.hatchPos.x, this.hatchPos.y, 52, -Math.PI / 2, -Math.PI / 2 + this.extractT * Math.PI * 2, false); g.strokePath();
      }
    }

    spawnWild() {
      let x, y, tries = 0;
      do { x = Phaser.Math.Between(TILE * 2, RW - TILE * 2); y = Phaser.Math.Between(TILE * 2, RH / 2); tries++; }
      while ((this.grid[Math.floor(y / TILE)][Math.floor(x / TILE)] !== '.' || Phaser.Math.Distance.Between(x, y, this.entry.x, this.entry.y) < 300) && tries < 40);
      const c = this.physics.add.image(x, y, 'crow');
      c.body.setCircle(9, 15, 15);
      c.setCollideWorldBounds(true);
      Object.assign(c, { isWild: true, species: 'crow', hp: 8, weak: 0, mode: 'wander', zapT: 2.5, tx: x, ty: y, wt: 0, caged: false, fleeing: false, kbT: 0 });
      this.physics.add.overlap(this.bullets, c, (a, b) => {
        const bl = a.isBullet ? a : b; if (!bl.active || c.caged || c.fleeing) return;
        const d = new V(bl.body.velocity.x, bl.body.velocity.y).normalize();
        const dmg = bl.dmg; bl.destroy(); this.damageWild(c, dmg, d, 150);
      });
      this.wild = c;
      this.time.delayedCall(1500, () => { if (this.wild === c && c.active && !HUD.banner) HUD.banner = { text: 'A WILD SPARK CROW!', sub: 'Weaken it, then throw a cage', t: 2.4 }; });
    }
  }

  // ===================================================================
  //  TOWN — build by day, defend the generator by night
  // ===================================================================
  class TownScene extends Combat {
    constructor() { super('town'); }
    init(data) { this.result = data && data.result; }

    create() {
      makeTextures(this);
      this.crates = null; this.bulletBlockers = null; this.buildView = false; this.bSprites = []; this.dawnPending = null; this.spawnPlan = [];
      HUD.scene = 'town';
      this.phase = 'day';
      this.grid = TOWN_MAP.map(r => r.padEnd(TCOLS, '#').slice(0, TCOLS));
      this.physics.world.setBounds(0, 0, TW, TH);
      this.solids = this.physics.add.staticGroup();
      this.rubble = this.physics.add.staticGroup();
      this.gates = this.physics.add.staticGroup();
      this.bulletBlockers = this.rubble;
      this.buildTown();

      HUD.maxHp = maxHearts(); HUD.hp = HUD.maxHp;
      HUD.prompt = null; HUD.building = false; HUD.panel = null; HUD.night = null; HUD.buildTab = 'mil'; HUD.buildSel = 'wall'; HUD.buildMsg = '';
      this.setupCombat(this.hallPos.x, this.hallPos.y + 70, TW, TH, 420);
      this.physics.add.collider(this.enemies, this.gates);
      this.physics.add.collider(this.enemies, this.rubble);
      this.physics.add.collider(this.hero, this.rubble);
      this.physics.add.collider(this.hound, this.rubble);

      this.tBullets = this.physics.add.group();
      this.physics.add.overlap(this.tBullets, this.enemies, (a, b) => { const bl = a.isBullet ? a : b, z = a.isBullet ? b : a; this.bulletHit(bl, z); });
      this.shade = this.add.rectangle(0, 0, TW, TH, 0x070b22, 1).setOrigin(0).setDepth(700).setAlpha(0);
      this.renderBuildings();

      const r = this.result;
      if (r && r.type === 'extract') HUD.banner = { text: `HOME SAFE  +${r.scrap} ⚙`, sub: r.caught ? `You brought back a ${r.caught}!` : 'Spend it on the town, then end the day', t: 3.2 };
      else if (r && r.type === 'dead') HUD.banner = { text: 'DRAGGED HOME', sub: `You lost ${r.scrap} scrap in room ${r.room}`, t: 3.2 };
      else if (r && r.type === 'abandon') HUD.banner = { text: 'BACK IN TOWN', t: 2 };
      else if (!SAVE.seenIntro) {
        HUD.banner = { text: 'DUNGEON TOWN', sub: 'Scavenge the ruins by day. Defend the generator at night.', t: 4 };
        SAVE.seenIntro = true; writeSave();
      } else HUD.banner = { text: `DAY ${SAVE.day}`, t: 1.6 };
      this.syncHud();
    }

    // ---------------------------------------------------------------- map
    idx(c, r) { return r * TCOLS + c; }

    buildTown() {
      const g = this.grid, N = TCOLS * TROWS;
      this.baseBlocked = new Uint8Array(N); this.genCell = new Uint8Array(N); this.reserved = new Uint8Array(N);
      this.entrances = [];
      const gen = [], hall = [], ruins = [];
      for (let r = 0; r < TROWS; r++) {
        let run0 = -1;
        for (let c = 0; c <= TCOLS; c++) {
          const ch = c < TCOLS ? g[r][c] : '.';
          const solid = ch === '#';
          if (solid && run0 < 0) run0 = c;
          if (!solid && run0 >= 0) {
            const z = this.add.zone((run0 + c) / 2 * TILE, r * TILE + TILE / 2, (c - run0) * TILE, TILE);
            this.physics.add.existing(z, true); this.rubble.add(z); run0 = -1;
          }
          if (c >= TCOLS) continue;
          const k = this.idx(c, r), x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
          if (ch === '#') this.baseBlocked[k] = 1;
          if (ch === 'r') { this.baseBlocked[k] = 1; const rb = this.rubble.create(x, y, 'rubble'); rb.refreshBody(); rb.setDepth(5 + y / 1000); }
          if (ch === 'S') { this.entrances.push({ x, y }); this.reserved[k] = 1; }
          if (ch === 'G') { gen.push({ x, y }); this.genCell[k] = 1; this.reserved[k] = 1; }
          if (ch === 'T') { hall.push({ x, y }); this.baseBlocked[k] = 1; this.reserved[k] = 1; }
          if (ch === 'R') { ruins.push({ x, y }); this.reserved[k] = 1; }
        }
      }
      const avg = (a) => ({ x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length });
      this.genPos = avg(gen); this.hallPos = avg(hall); this.ruinsPos = avg(ruins);
      this.drawGridFloor(g, TCOLS, TROWS, '#');

      this.ruinsImg = this.add.image(this.ruinsPos.x, this.ruinsPos.y, 'hatch').setDepth(1.5);
      this.add.text(this.ruinsPos.x, this.ruinsPos.y - 62, 'RUINS', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f2d14b', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);

      const hallImg = this.rubble.create(this.hallPos.x, this.hallPos.y, 'hall');
      hallImg.refreshBody(); hallImg.body.setSize(84, 72); hallImg.setDepth(10 + this.hallPos.y / 1000);
      this.add.text(this.hallPos.x, this.hallPos.y - 58, 'TOWN HALL', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);

      this.genImg = this.solids.create(this.genPos.x, this.genPos.y, 'gen');
      this.genImg.refreshBody(); this.genImg.body.setSize(84, 78);
      this.genImg.isGen = true; this.genImg.setDepth(10 + this.genPos.y / 1000);
      this.genMax = TL[SAVE.townLevel].gen; this.genHp = this.genMax;
    }

    renderBuildings() {
      (this.bSprites || []).forEach(b => { if (b.gunImg) b.gunImg.destroy(); b.destroy(); });
      this.bSprites = [];
      this.occ = new Array(TCOLS * TROWS).fill(null);
      SAVE.buildings.forEach(rec => {
        const def = BLD[rec.t]; if (!def) return;
        const x = rec.c * TILE + TILE / 2, y = rec.r * TILE + TILE / 2;
        let s;
        if (def.gate) { s = this.gates.create(x, y, rec.t); s.refreshBody(); }
        else if (def.solid) { s = this.solids.create(x, y, rec.t); s.refreshBody(); }
        else s = this.add.image(x, y, rec.t);
        Object.assign(s, { bt: rec.t, def, lvl: rec.lvl || 1, c: rec.c, r: rec.r, rec, dead: false, isBld: true });
        s.maxHp = (def.hp || 0) + (rec.t === 'turret' ? (s.lvl - 1) * 4 : 0); s.hp = s.maxHp;
        s.setDepth(def.solid ? 10 + y / 1000 : 1.2);
        if (rec.t === 'turret') { s.gunImg = this.add.image(x, y - 4, 'turretGun').setOrigin(0.2, 0.5).setDepth(11 + y / 1000); s.cd = 0.5; }
        this.occ[this.idx(rec.c, rec.r)] = s;
        this.bSprites.push(s);
      });
      this.computeFlow();
      this.syncHud();
    }

    computeFlow() {
      const N = TCOLS * TROWS, dist = new Array(N).fill(Infinity), done = new Uint8Array(N);
      const cost = (k) => {
        if (this.baseBlocked[k]) return Infinity;
        const b = this.occ[k];
        return (b && !b.dead) ? b.def.pathCost : 1;
      };
      for (let k = 0; k < N; k++) if (this.genCell[k]) dist[k] = 0;
      for (;;) {
        let u = -1, best = Infinity;
        for (let k = 0; k < N; k++) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
        if (u < 0) break;
        done[u] = 1;
        const uc = u % TCOLS, ur = (u / TCOLS) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
          const nc = uc + dc, nr = ur + dr;
          if (nc < 0 || nr < 0 || nc >= TCOLS || nr >= TROWS) return;
          const v = this.idx(nc, nr); if (done[v] || this.genCell[v]) return;
          const nd = dist[u] + cost(v);
          if (nd < dist[v]) dist[v] = nd;
        });
      }
      this.flow = dist;
    }

    solidAt(c, r) { const b = this.occ[this.idx(c, r)]; return b && b.def.solid && !b.dead ? b : null; }

    nextStep(c, r) {
      if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return null;
      let best = null, bd = Infinity;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= TCOLS || nr >= TROWS) continue;
        const k = this.idx(nc, nr);
        if (this.genCell[k]) return { gen: true };
        if (dc && dr) { // diagonal only if both sides are open
          const a = this.idx(c + dc, r), b = this.idx(c, r + dr);
          if (this.baseBlocked[a] || this.baseBlocked[b] || this.solidAt(c + dc, r) || this.solidAt(c, r + dr) || this.solidAt(nc, nr)) continue;
        }
        if (this.flow[k] < bd) { bd = this.flow[k]; best = { c: nc, r: nr }; }
      }
      if (!best) return null;
      const b = this.solidAt(best.c, best.r);
      if (b) return { bld: b };
      return best;
    }

    targetFor(z) {
      const h = this.hero;
      if (!HUD.dead) {
        const dh = dist(z, h);
        if (dh < (z.type === 'runner' ? 230 : 170) || (z.aggro > 0 && dh < 420)) return { x: h.x, y: h.y, kind: 'hero', pad: 0 };
      }
      const step = this.nextStep(Math.floor(z.x / TILE), Math.floor(z.y / TILE));
      if (!step || step.gen) return { x: this.genPos.x, y: this.genPos.y, kind: 'gen', pad: 34 };
      if (step.bld) return { x: step.bld.x, y: step.bld.y, kind: 'bld', bld: step.bld, pad: 10 };
      return { x: step.c * TILE + TILE / 2, y: step.r * TILE + TILE / 2, kind: 'path', pad: 0 };
    }

    hitTarget(tg, dmg, dx, dy) {
      if (tg.kind === 'bld') this.damageBuilding(tg.bld, dmg);
      else if (tg.kind === 'gen') this.damageGen(dmg);
      else super.hitTarget(tg, dmg, dx, dy);
    }

    onSpitHitSolid(s, o) {
      if (o && o.isGen) this.damageGen(1);
      else if (o && o.isBld) this.damageBuilding(o, 1);
      this.splash(s);
    }

    slamExtra(z, def) {
      this.bSprites.forEach(b => { if (!b.dead && b.def.solid && this.inArc(z, b, def.slamRange, def.slamArc, 10)) this.damageBuilding(b, def.dmg * 2); });
      if (this.inArc(z, this.genImg, def.slamRange, def.slamArc, 34)) this.damageGen(def.dmg);
    }

    explodeExtra(x, y, r) {
      this.bSprites.forEach(b => { if (!b.dead && b.def.solid && dist(b, { x, y }) < r + 10) this.damageBuilding(b, 5); });
      if (dist(this.genImg, { x, y }) < r + 34) this.damageGen(3);
    }

    damageBuilding(b, dmg) {
      if (!b || b.dead || this.phase !== 'night') return;
      b.hp -= dmg;
      flash(b, 0xffffff); this.time.delayedCall(70, () => { if (b.active && !b.dead) untint(b); });
      this.spark(b.x, b.y, 0x8a7a5a, 4);
      if (b.hp <= 0) {
        b.dead = true;
        if (b.body) b.body.enable = false;
        b.setAlpha(0.3).setTint(0x555555);
        if (b.gunImg) b.gunImg.setVisible(false);
        this.spark(b.x, b.y, 0x6b737c, 14);
        this.cameras.main.shake(120, 0.006);
        this.floatText(b.x, b.y - 26, 'BROKEN', '#ff8c8c', 14);
        this.computeFlow();
      }
    }

    damageGen(dmg) {
      if (this.phase !== 'night' || this.genHp <= 0) return;
      this.genHp = Math.max(0, this.genHp - dmg);
      flash(this.genImg, 0xff6666); this.time.delayedCall(90, () => this.genImg.active && untint(this.genImg));
      this.cameras.main.shake(90, 0.004);
      if (this.genHp <= 0) this.dawnPending = 'fail';
    }

    collectScrap(n) { SAVE.scrap += n; HUD.scrap = SAVE.scrap; }
    onAbandon() { if (onExit) onExit(); }
    inputFrozen() { return HUD.building || !!HUD.panel; }
    canSpawn() { return this.phase === 'night'; }

    heroDied() {
      HUD.deadText = `KNOCKED OUT\nBack on your feet in ${T.respawnTime}s`;
      this.time.delayedCall(T.respawnTime * 1000, () => {
        if (!this.sys.isActive()) return;
        this.hero.setPosition(this.hallPos.x, this.hallPos.y + 70);
        untint(this.hero);
        HUD.hp = HUD.maxHp; HUD.dead = false; this.inv = 2;
      });
    }

    syncHud() {
      const lv = TL[SAVE.townLevel];
      HUD.scrap = SAVE.scrap; HUD.day = SAVE.day; HUD.townLevel = SAVE.townLevel;
      HUD.maxHp = maxHearts(); HUD.hp = Math.min(HUD.hp == null ? HUD.maxHp : HUD.hp, HUD.maxHp);
      HUD.points = { mil: pointsUsed('mil'), milMax: lv.mil, civ: pointsUsed('civ'), civMax: lv.civ };
      HUD.runsLeft = Math.max(0, T.runsPerDay - SAVE.runsToday);
      const next = TL[SAVE.townLevel + 1];
      HUD.hall = { level: SAVE.townLevel, next: next ? { cost: next.cost, mil: next.mil, civ: next.civ } : null, scrap: SAVE.scrap, mil: lv.mil, civ: lv.civ };
    }

    // ---------------------------------------------------------------- events
    onEvent(ev) {
      const day = this.phase === 'day';
      switch (ev.type) {
        case 'prompt': {
          const p = HUD.prompt; if (!p || !day || HUD.building) return;
          if (p.action === 'ruins') { if (HUD.runsLeft > 0) this.startRun(); else HUD.banner = { text: 'TOO LATE FOR THE RUINS', sub: 'End the day and go again tomorrow', t: 2 }; }
          if (p.action === 'hall') { HUD.hallMsg = ''; this.syncHud(); HUD.panel = 'hall'; }
          break;
        }
        case 'endDay':
          if (!day || HUD.building || HUD.panel) return;
          this.startNight();
          break;
        case 'build':
          if (!day) { HUD.banner = { text: 'NO BUILDING AT NIGHT', t: 1.4 }; return; }
          HUD.panel = null;
          this.setBuildView(!HUD.building);
          break;
        case 'tab': HUD.buildTab = ev.tab; HUD.buildSel = ev.tab === 'mil' ? 'wall' : 'workbench'; HUD.buildMsg = BLD[HUD.buildSel].desc; break;
        case 'select': HUD.buildSel = ev.item; HUD.buildMsg = BLD[ev.item] ? BLD[ev.item].desc : (ev.item === 'upgrade' ? 'Tap a turret to upgrade it.' : 'Tap a building to remove it (points come back).'); break;
        case 'tapTile': if (HUD.building) this.tapTile(ev.x, ev.y); break;
        case 'hallUpgrade': this.upgradeHall(); break;
        case 'closePanel': HUD.panel = null; break;
      }
    }

    setBuildView(on) {
      HUD.building = on;
      const cam = this.cameras.main;
      if (on) {
        this.buildView = true;
        cam.stopFollow(); cam.removeBounds();
        const w = this.scale.width, h = this.scale.height, u = Math.min(w, h);
        const barH = u * 0.24, topH = u * 0.14;
        const z = Math.min(w / (TW + 20), (h - barH - topH) / (TH + 20));
        cam.setZoom(z);
        cam.centerOn(TW / 2, TH / 2 + (barH - topH) / 2 / z);
        HUD.buildMsg = BLD[HUD.buildSel] ? BLD[HUD.buildSel].desc : '';
      } else {
        this.buildView = false;
        cam.setBounds(0, 0, TW, TH);
        cam.startFollow(this.hero, true, 0.12, 0.12);
        this.fitZoom();
      }
    }

    tapTile(wx, wy) {
      const c = Math.floor(wx / TILE), r = Math.floor(wy / TILE);
      const say = (m) => { HUD.buildMsg = m; };
      if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return;
      const k = this.idx(c, r), existing = this.occ[k], sel = HUD.buildSel;
      const lv = TL[SAVE.townLevel];
      const pop = (col) => { const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2; this.spark(x, y, col, 8); this.ring(x, y, 30, col); };
      if (sel === 'remove') {
        if (!existing) return say('Nothing to remove there.');
        SAVE.buildings = SAVE.buildings.filter(b => b !== existing.rec);
        writeSave(); pop(0xff8c8c); this.renderBuildings();
        return say(`Removed ${existing.def.name}. +${bCost(existing.rec)} pts back.`);
      }
      if (sel === 'upgrade') {
        if (!existing || existing.bt !== 'turret') return say('Only turrets can be upgraded (for now).');
        const lvl = existing.rec.lvl || 1;
        if (lvl >= 3) return say('That turret is maxed out.');
        const delta = BLD.turret.upg[lvl] - BLD.turret.upg[lvl - 1];
        if (pointsUsed('mil') + delta > lv.mil) return say(`Needs ${delta} more military pts. Upgrade the Town Hall.`);
        existing.rec.lvl = lvl + 1; writeSave(); pop(0xf2d14b); this.renderBuildings();
        return say(`Turret upgraded to level ${lvl + 1}.`);
      }
      const def = BLD[sel]; if (!def) return say('Pick something to build.');
      if (existing) return say('Something is already there.');
      if (this.baseBlocked[k] || this.reserved[k]) return say('You can\'t build there.');
      if (c === 0 || r === 0 || c === TCOLS - 1 || r === TROWS - 1) return say('Too close to the edge.');
      if (def.max && countB(sel) >= def.max) return say(`You can only have ${def.max} ${def.name}s.`);
      const cap = def.cat === 'mil' ? lv.mil : lv.civ;
      if (pointsUsed(def.cat) + def.cost > cap) return say(`Not enough ${def.cat === 'mil' ? 'military' : 'civic'} points. Upgrade the Town Hall.`);
      SAVE.buildings.push({ t: sel, c, r, lvl: 1 });
      writeSave(); pop(0x8ef0a0); this.renderBuildings();
      if (sel === 'kitchen') { HUD.maxHp = maxHearts(); HUD.hp = HUD.maxHp; }
      say(`${def.name} built.`);
    }

    upgradeHall() {
      const next = TL[SAVE.townLevel + 1];
      if (!next) return;
      if (SAVE.scrap < next.cost) { HUD.hallMsg = `You need ${next.cost - SAVE.scrap} more scrap.`; return; }
      SAVE.scrap -= next.cost; SAVE.townLevel++; writeSave();
      this.genMax = TL[SAVE.townLevel].gen; this.genHp = this.genMax;
      HUD.hallMsg = '';
      this.syncHud();
      this.ring(this.hallPos.x, this.hallPos.y, 120, 0xf2d14b); this.spark(this.hallPos.x, this.hallPos.y, 0xf2d14b, 20);
      HUD.panel = null;
      HUD.banner = { text: `TOWN HALL LEVEL ${SAVE.townLevel}`, sub: `Military ${TL[SAVE.townLevel].mil} pts · Civic ${TL[SAVE.townLevel].civ} pts`, t: 2.6 };
    }

    startRun() {
      SAVE.runsToday++; writeSave();
      const run = { room: 1, hp: maxHearts(), maxHp: maxHearts(), scrap: 0, cages: T.cagesPerRun + Math.min(2, countB('workbench')), captured: [] };
      this.leaving = true;
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('dungeon', { run }));
    }

    // ---------------------------------------------------------------- night
    startNight() {
      this.phase = 'night';
      this.renderBuildings();
      this.genMax = TL[SAVE.townLevel].gen; this.genHp = this.genMax;
      HUD.hp = HUD.maxHp;
      const day = SAVE.day;
      this.nightLen = Math.min(T.nightMax, T.nightBase + T.nightPerDay * (day - 1));
      this.nightT = 0;
      // zombies arrive in packs from one entrance at a time; packs grow each night
      const n = 8 + day * 4;
      const pool = ['walker', 'walker', 'walker'];
      if (day >= 2) pool.push('runner', 'runner');
      if (day >= 3) pool.push('spitter');
      if (day >= 4) pool.push('bloater');
      const types = [];
      for (let i = 0; i < n; i++) types.push(Phaser.Utils.Array.GetRandom(pool));
      for (let i = 0; i < Math.floor(day / 5); i++) types.splice(Phaser.Math.Between(Math.floor(n / 2), types.length), 0, 'brute');
      const packSize = 2 + Math.floor(day / 2);
      const packs = Math.ceil(types.length / packSize);
      const window = this.nightLen * 0.8;
      this.spawnPlan = [];
      for (let pk = 0; pk < packs; pk++) {
        const e = Phaser.Utils.Array.GetRandom(this.entrances);
        const at = 3 + (pk / packs) * window;
        types.slice(pk * packSize, pk * packSize + packSize).forEach((type, j) => this.spawnPlan.push({ type, at: at + j * 0.45, e }));
      }
      this.tweens.add({ targets: this.shade, alpha: 0.42, duration: 1200 });
      HUD.banner = { text: `NIGHT ${day}`, sub: 'Defend the generator!', t: 2.6 };
      this.kills0 = HUD.kills || 0;
    }

    dawn(survived) {
      if (this.phase !== 'night') return;
      this.phase = 'day';
      kids(this.enemies).forEach(z => { this.spark(z.x, z.y, 0xffd166, 6); z.destroy(); });
      kids(this.spits).forEach(s => s.destroy());
      kids(this.tBullets).forEach(s => s.destroy());
      this.spawnPlan = [];
      this.magnetAll = true;
      this.time.delayedCall(2500, () => { this.magnetAll = false; });
      let sub;
      if (survived) {
        const reward = 10 + SAVE.day * 3;
        SAVE.scrap += reward; sub = `Survived!  +${reward} ⚙`;
      } else {
        const protectedAmt = countB('storehouse') * T.storehouseProtects;
        const lost = Math.floor(Math.max(0, SAVE.scrap - protectedAmt) * T.genLossPct);
        SAVE.scrap -= lost; sub = `The generator fell.  Lost ${lost} ⚙${protectedAmt ? ` (storehouses saved ${Math.min(protectedAmt, SAVE.scrap)})` : ''}`;
      }
      const farms = countB('farm') * T.farmScrap;
      if (farms) { SAVE.scrap += farms; sub += `   ·   Farms +${farms} ⚙`; }
      SAVE.day++; SAVE.runsToday = 0; writeSave();
      this.tweens.add({ targets: this.shade, alpha: 0, duration: 1500 });
      this.renderBuildings();
      this.genHp = this.genMax;
      if (HUD.dead) { HUD.dead = false; untint(this.hero); this.hero.setPosition(this.hallPos.x, this.hallPos.y + 70); }
      HUD.hp = HUD.maxHp;
      HUD.banner = { text: survived ? `MORNING — DAY ${SAVE.day}` : 'THE LIGHTS WENT OUT', sub, t: 4 };
      this.syncHud();
    }

    // ---------------------------------------------------------------- per-frame
    sceneUpdate(dt) {
      const h = this.hero;
      // prompts
      HUD.prompt = null;
      if (this.phase === 'day' && !HUD.building && !HUD.panel) {
        if (dist(h, this.ruinsPos) < 70) HUD.prompt = { label: HUD.runsLeft > 0 ? 'ENTER THE RUINS' : 'RUINS: COME BACK TOMORROW', action: 'ruins' };
        else if (dist(h, this.hallPos) < 100) HUD.prompt = { label: 'TOWN HALL', action: 'hall' };
      }
      HUD.scrap = SAVE.scrap;

      if (this.phase === 'night') {
        this.nightT += dt;
        while (this.spawnPlan.length && this.spawnPlan[0].at <= this.nightT) {
          const s = this.spawnPlan.shift();
          const e = s.e || Phaser.Utils.Array.GetRandom(this.entrances);
          this.emerge(s.type, e.x + Phaser.Math.Between(-10, 10), e.y + Phaser.Math.Between(-10, 10));
        }
        // wire + spikes
        kids(this.enemies).forEach(z => {
          if (!z.active) return;
          const c = Math.floor(z.x / TILE), r = Math.floor(z.y / TILE);
          const b = (c >= 0 && r >= 0 && c < TCOLS && r < TROWS) ? this.occ[this.idx(c, r)] : null;
          z.spd = z.baseSpd * (b && b.bt === 'wire' && !b.dead ? 0.45 : 1);
          if (b && b.bt === 'spikes' && !b.dead) {
            z.spikeT -= dt;
            if (z.spikeT <= 0) { z.spikeT = 0.6; this.damage(z, 1, new V(0, -1), 0, false, true, true); }
          }
        });
        this.updateTurrets(dt);
        kids(this.tBullets).forEach(b => { if (b.active && Phaser.Math.Distance.Between(b.x, b.y, b.sx, b.sy) > b.range) b.destroy(); });
        HUD.night = { t: Math.max(0, this.nightLen - this.nightT), gen: this.genHp, genMax: this.genMax };
        if (this.dawnPending === 'fail') { this.dawnPending = null; this.dawn(false); }
        else if (this.nightT >= this.nightLen) this.dawn(true);
      } else HUD.night = null;
    }

    updateTurrets(dt) {
      this.bSprites.forEach(t => {
        if (t.bt !== 'turret' || t.dead) return;
        const st = TURRET[t.lvl];
        const z = this.nearestEnemy(t.x, t.y, st.range, false);
        t.cd -= dt;
        if (!z) return;
        const a = Math.atan2(z.y - t.y, z.x - t.x);
        t.gunImg.setRotation(a);
        if (t.cd <= 0) {
          t.cd = st.rate;
          const b = this.tBullets.create(t.x + Math.cos(a) * 26, t.y - 4 + Math.sin(a) * 26, 'bullet');
          b.isBullet = true; b.dmg = st.dmg; b.fromTurret = true; b.range = st.range + 40;
          b.body.setCircle(5, 1, 1);
          b.setVelocity(Math.cos(a) * 720, Math.sin(a) * 720);
          b.sx = b.x; b.sy = b.y; b.setDepth(850);
          const fl = this.add.image(t.x + Math.cos(a) * 30, t.y - 4 + Math.sin(a) * 30, 'dot').setTint(0xffd166).setScale(1.8).setDepth(860);
          this.tweens.add({ targets: fl, alpha: 0, duration: 60, onComplete: () => fl.destroy() });
        }
      });
    }

    drawSceneFx(g, time) {
      // turret level pips + damaged building bars
      this.bSprites.forEach(b => {
        if (b.bt === 'turret' && !b.dead) for (let i = 0; i < b.lvl; i++) { g.fillStyle(0xf2d14b, 1); g.fillRect(b.x - 10 + i * 8, b.y + 18, 5, 5); }
        if (this.phase === 'night' && !b.dead && b.maxHp && b.hp < b.maxHp) {
          g.fillStyle(0x000000, 0.7); g.fillRect(b.x - 18, b.y - 30, 36, 5);
          g.fillStyle(0xff8c42, 1); g.fillRect(b.x - 18, b.y - 30, 36 * b.hp / b.maxHp, 5);
        }
      });
      if (this.phase === 'night') {
        g.fillStyle(0x000000, 0.7); g.fillRect(this.genPos.x - 40, this.genPos.y - 62, 80, 8);
        g.fillStyle(this.genHp / this.genMax > 0.35 ? 0x5fd3ff : 0xff4d6d, 1); g.fillRect(this.genPos.x - 40, this.genPos.y - 62, 80 * this.genHp / this.genMax, 8);
      }
      if (HUD.building) {
        g.lineStyle(1, 0xffffff, 0.12);
        for (let c = 1; c < TCOLS; c++) g.lineBetween(c * TILE, TILE, c * TILE, TH - TILE);
        for (let r = 1; r < TROWS; r++) g.lineBetween(TILE, r * TILE, TW - TILE, r * TILE);
        if (HUD.buildSel === 'turret' || (HUD.buildSel === 'upgrade')) {
          this.bSprites.forEach(b => { if (b.bt === 'turret') { g.lineStyle(2, 0xf2d14b, 0.25); g.strokeCircle(b.x, b.y, TURRET[b.lvl].range); } });
        }
      }
      if (HUD.prompt && HUD.prompt.action === 'ruins') { g.lineStyle(3, 0xf2d14b, 0.4 + 0.3 * Math.sin(time * 0.008)); g.strokeCircle(this.ruinsPos.x, this.ruinsPos.y, 54); }
    }
  }

  // ===================================================================
  //  UI + TOUCH CONTROLS (on top, not zoomed)
  // ===================================================================
  class UIScene extends Phaser.Scene {
    constructor() { super('ui'); }

    create() {
      this.input.addPointer(4);
      if (this.input.mouse) this.input.mouse.disableContextMenu();
      this.g = this.add.graphics();
      this.ptr = {}; this.st = { atk: {}, a1: {}, a2: {}, dash: {}, cap: {} };
      this.moveBase = null;
      this.touchUI = !this.sys.game.device.os.desktop;
      this.mouseMode = !this.touchUI; this.mouseHeld = false; this.exitArmed = 0;

      const S = (size, extra = {}) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 3 }, extra);
      this.S = S;
      this.topText = this.add.text(0, 0, '', S(16)).setOrigin(0.5, 0);
      this.cageText = this.add.text(0, 0, '', S(12, { color: '#c0c6cc' })).setOrigin(0, 0.5);
      this.modeText = this.add.text(0, 0, '', S(13)).setOrigin(0.5);
      this.lbl = {
        atk: this.add.text(0, 0, 'ATTACK', S(12)).setOrigin(0.5),
        dash: this.add.text(0, 0, 'DASH', S(11)).setOrigin(0.5),
        a1: this.add.text(0, 0, 'POUNCE', S(10)).setOrigin(0.5),
        a2: this.add.text(0, 0, 'HOWL', S(10)).setOrigin(0.5),
        cap: this.add.text(0, 0, 'CAGE', S(12, { color: '#f2d14b' })).setOrigin(0.5),
      };
      // town buttons
      this.tBtn = {
        build: this.add.text(0, 0, '🔨 BUILD', S(13)).setOrigin(0.5),
        endDay: this.add.text(0, 0, 'END DAY ☾', S(13)).setOrigin(0.5),
        prompt: this.add.text(0, 0, '', S(15, { color: '#f2d14b' })).setOrigin(0.5),
        done: this.add.text(0, 0, 'DONE ✓', S(14, { color: '#8ef0a0' })).setOrigin(0.5),
        tabMil: this.add.text(0, 0, 'MILITARY', S(12)).setOrigin(0.5),
        tabCiv: this.add.text(0, 0, 'CIVIC', S(12)).setOrigin(0.5),
      };
      this.buildMsg = this.add.text(0, 0, '', S(12, { color: '#e8e6df', align: 'center' })).setOrigin(0.5, 1);
      this.cards = [];
      for (let i = 0; i < 7; i++) {
        this.cards.push({
          icon: this.add.image(0, 0, 'wall').setVisible(false),
          name: this.add.text(0, 0, '', S(10)).setOrigin(0.5, 0),
          cost: this.add.text(0, 0, '', S(10, { color: '#f2d14b' })).setOrigin(0.5, 0),
        });
      }
      // town hall panel
      this.panelTitle = this.add.text(0, 0, '', S(22, { color: '#f2d14b' })).setOrigin(0.5);
      this.panelBody = this.add.text(0, 0, '', S(13, { align: 'center', color: '#e8e6df', lineSpacing: 4 })).setOrigin(0.5);
      this.panelUp = this.add.text(0, 0, '', S(14)).setOrigin(0.5);
      this.panelClose = this.add.text(0, 0, 'CLOSE', S(14)).setOrigin(0.5);

      this.banner = this.add.text(0, 0, '', S(40, { strokeThickness: 6, align: 'center' })).setOrigin(0.5).setAlpha(0);
      this.bannerSub = this.add.text(0, 0, '', S(16, { color: '#c9d1d9', align: 'center' })).setOrigin(0.5).setAlpha(0);
      this.over = this.add.text(0, 0, '', S(26, { align: 'center', strokeThickness: 5 })).setOrigin(0.5).setVisible(false);
      this.rotateText = this.add.text(0, 0, 'Turn your phone sideways ↻', S(22, { align: 'center' })).setOrigin(0.5).setVisible(false);
      this.deskHelp = this.add.text(0, 0, '', S(12, { color: '#c9d1d9' })).setOrigin(0.5, 1).setAlpha(0.8);

      this.layout();
      this.scale.on('resize', this.layout, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
      this.input.on('pointerdown', this.down, this);
      this.input.on('pointermove', this.move, this);
      this.input.on('pointerup', this.up, this);
      this.input.on('pointerupoutside', this.up, this);
    }

    layout() {
      const w = this.scale.width, h = this.scale.height, u = Math.min(w, h);
      this.u = u;
      this.B = {
        atk:  { x: w - u * 0.24, y: h - u * 0.26, r: u * 0.13 },
        dash: { x: w - u * 0.53, y: h - u * 0.13, r: u * 0.075 },
        a1:   { x: w - u * 0.51, y: h - u * 0.42, r: u * 0.07 },
        a2:   { x: w - u * 0.26, y: h - u * 0.59, r: u * 0.07 },
        cap:  { x: w - u * 0.80, y: h - u * 0.28, r: u * 0.08 },
        mode: { x: w - u * 0.27, y: u * 0.075, w: u * 0.46, h: u * 0.085 },
        exit: { x: u * 0.07, y: u * 0.075, r: u * 0.045 },
        fs:   { x: u * 0.18, y: u * 0.075, r: u * 0.045 },
        build:  { x: u * 0.2, y: u * 0.2, w: u * 0.3, h: u * 0.085 },
        endDay: { x: w / 2, y: u * 0.16, w: u * 0.32, h: u * 0.085 },
        prompt: { x: w / 2, y: h - u * 0.1, w: Math.min(w * 0.42, u * 0.75), h: u * 0.1 },
        done:   { x: w - u * 0.17, y: u * 0.075, w: u * 0.26, h: u * 0.085 },
        tabMil: { x: u * 0.17, y: h - u * 0.165, w: u * 0.28, h: u * 0.085 },
        tabCiv: { x: u * 0.17, y: h - u * 0.065, w: u * 0.28, h: u * 0.085 },
        bar:    { x0: u * 0.34, x1: w - u * 0.02, y: h - u * 0.115, h: u * 0.2 },
        panel:  { x: w / 2, y: h / 2, w: Math.min(w * 0.9, u * 1.25), h: u * 0.78 },
      };
      const P = this.B.panel;
      this.B.pUp = { x: w / 2 - u * 0.2, y: P.y + P.h / 2 - u * 0.11, w: u * 0.36, h: u * 0.1 };
      this.B.pClose = { x: w / 2 + u * 0.2, y: P.y + P.h / 2 - u * 0.11, w: u * 0.3, h: u * 0.1 };
      const fs = n => Math.max(10, Math.round(u * n)) + 'px';
      this.topText.setPosition(w / 2, u * 0.035).setFontSize(fs(0.042));
      this.cageText.setPosition(u * 0.265, u * 0.14).setFontSize(fs(0.028));
      this.modeText.setPosition(this.B.mode.x, this.B.mode.y).setFontSize(fs(0.032));
      for (const k of ['atk', 'dash', 'a1', 'a2', 'cap']) this.lbl[k].setPosition(this.B[k].x, this.B[k].y + this.B[k].r + u * 0.025).setFontSize(fs(k === 'atk' || k === 'cap' ? 0.03 : 0.026));
      for (const k of ['build', 'endDay', 'prompt', 'done', 'tabMil', 'tabCiv']) this.tBtn[k].setPosition(this.B[k].x, this.B[k].y).setFontSize(fs(k === 'prompt' ? 0.036 : 0.032));
      this.buildMsg.setPosition(w / 2 + u * 0.16, this.B.bar.y - this.B.bar.h / 2 - u * 0.015).setFontSize(fs(0.03));
      this.cards.forEach(c => { c.name.setFontSize(fs(0.026)); c.cost.setFontSize(fs(0.026)); });
      this.panelTitle.setPosition(w / 2, P.y - P.h / 2 + u * 0.08).setFontSize(fs(0.055));
      this.panelBody.setPosition(w / 2, P.y - u * 0.04).setFontSize(fs(0.033));
      this.panelUp.setPosition(this.B.pUp.x, this.B.pUp.y).setFontSize(fs(0.033));
      this.panelClose.setPosition(this.B.pClose.x, this.B.pClose.y).setFontSize(fs(0.033));
      this.banner.setPosition(w / 2, h * 0.3).setFontSize(fs(0.08));
      this.bannerSub.setPosition(w / 2, h * 0.3 + u * 0.075).setFontSize(fs(0.035));
      this.over.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.rotateText.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.deskHelp.setPosition(w / 2, h - 10).setFontSize(fs(0.024));
    }

    inRect(x, y, r) { return Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2; }
    near(x, y, b, mult) { return Math.hypot(x - b.x, y - b.y) < b.r * mult; }
    gs() { const s = this.scene.get(HUD.scene); return s && s.sys.isActive() ? s : null; }
    town() { return HUD.scene === 'town'; }
    cardItems() { return (HUD.buildTab === 'civ' ? CIV_ITEMS : MIL_ITEMS).concat(['upgrade', 'remove']); }
    cardRect(i, n) {
      const bar = this.B.bar, gap = this.u * 0.012;
      const cw = Math.min(this.u * 0.2, (bar.x1 - bar.x0 - gap * (n - 1)) / n);
      return { x: bar.x0 + cw / 2 + i * (cw + gap), y: bar.y, w: cw, h: bar.h };
    }
    townButtonsVisible() { return this.town() && !HUD.building && !HUD.panel && !HUD.night && !HUD.dead; }

    mouseDir() {
      const gs = this.gs();
      if (!gs || !gs.hero || !gs.hero.active) return null;
      const p = this.input.activePointer;
      const wp = gs.cameras.main.getWorldPoint(p.x, p.y);
      const v = new V(wp.x - gs.hero.x, wp.y - gs.hero.y - 6);
      return v.lengthSq() > 4 ? v.normalize() : null;
    }

    down(p) {
      if (p.wasTouch) { this.touchUI = true; this.mouseMode = false; } else if (!this.touchUI) this.mouseMode = true;
      if (Ctl.blocked) return;
      const B = this.B;
      if (this.near(p.x, p.y, B.fs, 1.4) || this.near(p.x, p.y, B.exit, 1.4)) return;
      if (HUD.panel || HUD.building) return; // handled on release
      if (!this.town() || !HUD.building) { if (this.inRect(p.x, p.y, B.mode)) return; }
      if (this.townButtonsVisible() && (this.inRect(p.x, p.y, B.build) || this.inRect(p.x, p.y, B.endDay))) return;
      if (this.town() && HUD.prompt && this.inRect(p.x, p.y, B.prompt)) return;
      if (HUD.dead) return;
      if (!p.wasTouch && this.mouseMode) {
        if (p.rightButtonDown()) { Ctl.queue.push({ type: 'dash' }); return; }
        this.mouseHeld = true;
        if (Ctl.mode === 'brawl') Ctl.queue.push({ type: 'attack', dir: this.mouseDir() });
        else Ctl.twin = { dir: this.mouseDir() };
        return;
      }
      if (HUD.canCapture && !this.ptr.cap && this.near(p.x, p.y, B.cap, 1.3)) { this.ptr.cap = p.id; Ctl.queue.push({ type: 'capture' }); return; }
      for (const k of ['atk', 'dash', 'a1', 'a2']) {
        if (!this.ptr[k] && this.near(p.x, p.y, B[k], 1.35)) {
          this.ptr[k] = p.id;
          this.st[k] = { drag: false, dir: null, sx: p.x, sy: p.y };
          if (k === 'dash') Ctl.queue.push({ type: 'dash' });
          if (k === 'atk' && Ctl.mode === 'twin') Ctl.twin = { dir: null };
          return;
        }
      }
      if (p.x < this.scale.width * 0.5 && !this.ptr.move) { this.ptr.move = p.id; this.moveBase = { x: p.x, y: p.y }; }
    }

    move(p) {
      if (p.id === this.ptr.move && this.moveBase) {
        const R = this.u * 0.12, b = this.moveBase;
        let dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        if (d > R) { b.x = p.x - dx / d * R; b.y = p.y - dy / d * R; dx = p.x - b.x; dy = p.y - b.y; d = R; }
        const mag = d < R * 0.12 ? 0 : d / R;
        Ctl.move.x = d ? dx / d * mag : 0; Ctl.move.y = d ? dy / d * mag : 0;
      }
      for (const k of ['atk', 'a1', 'a2']) {
        if (p.id !== this.ptr[k]) continue;
        const s = this.st[k];
        const dx = p.x - s.sx, dy = p.y - s.sy, d = Math.hypot(dx, dy), dead = this.u * 0.04;
        if (d > dead) { s.drag = true; s.dir = new V(dx / d, dy / d); }
        else if (s.drag) s.dir = null;
        if (k === 'atk') {
          Ctl.aim = s.dir ? s.dir.clone() : null;
          if (Ctl.mode === 'twin') Ctl.twin = { dir: s.dir ? s.dir.clone() : null };
        } else if (k === 'a1') Ctl.aimAbility = s.dir ? { i: 1, dir: s.dir.clone() } : null;
      }
    }

    releaseAll() {
      this.ptr = {}; this.moveBase = null;
      Ctl.move.x = 0; Ctl.move.y = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;
    }

    up(p) {
      const B = this.B;
      const tapIn = (r) => this.inRect(p.downX, p.downY, r) && this.inRect(p.x, p.y, r);
      if (this.near(p.downX, p.downY, B.exit, 1.4) && this.near(p.x, p.y, B.exit, 1.4)) {
        if (this.exitArmed > 0) { Ctl.queue.push({ type: 'abandon' }); this.exitArmed = 0; }
        else {
          this.exitArmed = 2.5;
          HUD.banner = this.town()
            ? { text: 'LEAVE DUNGEON TOWN?', sub: 'Tap ✕ again to exit (your town is saved)', t: 2.5 }
            : { text: 'LEAVE THE RUN?', sub: 'Tap ✕ again to abandon (you lose this run\'s loot)', t: 2.5 };
        }
        return;
      }
      if (this.near(p.downX, p.downY, B.fs, 1.4) && this.near(p.x, p.y, B.fs, 1.4)) {
        try { this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(); } catch (e) {}
        return;
      }
      // Town Hall panel
      if (HUD.panel) {
        if (tapIn(B.pUp)) Ctl.queue.push({ type: 'hallUpgrade' });
        else if (tapIn(B.pClose) || !this.inRect(p.x, p.y, B.panel)) Ctl.queue.push({ type: 'closePanel' });
        return;
      }
      // build mode
      if (HUD.building) {
        if (tapIn(B.done)) { Ctl.queue.push({ type: 'build' }); return; }
        if (tapIn(B.tabMil)) { Ctl.queue.push({ type: 'tab', tab: 'mil' }); return; }
        if (tapIn(B.tabCiv)) { Ctl.queue.push({ type: 'tab', tab: 'civ' }); return; }
        const items = this.cardItems();
        for (let i = 0; i < items.length; i++) if (tapIn(this.cardRect(i, items.length))) { Ctl.queue.push({ type: 'select', item: items[i] }); return; }
        if (p.y > B.bar.y - B.bar.h / 2) return;
        if (Math.hypot(p.x - p.downX, p.y - p.downY) < 16) {
          const gs = this.gs(); if (!gs) return;
          const wp = gs.cameras.main.getWorldPoint(p.x, p.y);
          Ctl.queue.push({ type: 'tapTile', x: wp.x, y: wp.y });
        }
        return;
      }
      if (!HUD.building && tapIn(B.mode) && !(this.town() && HUD.building)) { Ctl.mode = Ctl.mode === 'brawl' ? 'twin' : 'brawl'; Ctl.twin = null; return; }
      if (this.townButtonsVisible()) {
        if (tapIn(B.build)) { this.releaseAll(); Ctl.queue.push({ type: 'build' }); return; }
        if (tapIn(B.endDay)) { Ctl.queue.push({ type: 'endDay' }); return; }
      }
      if (this.town() && HUD.prompt && tapIn(B.prompt)) { this.releaseAll(); Ctl.queue.push({ type: 'prompt' }); return; }

      if (!p.wasTouch && this.mouseHeld) { this.mouseHeld = false; Ctl.twin = null; }
      if (p.id === this.ptr.move) { this.ptr.move = null; this.moveBase = null; Ctl.move.x = 0; Ctl.move.y = 0; }
      if (p.id === this.ptr.cap) this.ptr.cap = null;
      if (p.id === this.ptr.atk) {
        const s = this.st.atk;
        if (Ctl.mode === 'brawl') {
          if (!s.drag) Ctl.queue.push({ type: 'attack', dir: null });
          else if (s.dir) Ctl.queue.push({ type: 'attack', dir: s.dir });
        }
        Ctl.twin = null; Ctl.aim = null; this.ptr.atk = null;
      }
      if (p.id === this.ptr.a1) {
        const s = this.st.a1;
        if (!s.drag) Ctl.queue.push({ type: 'ab', i: 1, dir: null });
        else if (s.dir) Ctl.queue.push({ type: 'ab', i: 1, dir: s.dir });
        Ctl.aimAbility = null; this.ptr.a1 = null;
      }
      if (p.id === this.ptr.a2) {
        const s = this.st.a2;
        if (!s.drag || s.dir) Ctl.queue.push({ type: 'ab', i: 2, dir: null });
        this.ptr.a2 = null;
      }
      if (p.id === this.ptr.dash) this.ptr.dash = null;
    }

    pill(r, color, alpha, on) {
      const g = this.g;
      g.fillStyle(on ? color : 0x000000, on ? 0.35 : alpha); g.fillRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, r.h / 2);
      g.lineStyle(2, color, 0.7); g.strokeRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, r.h / 2);
    }

    drawBtn(key, color, cdFrac) {
      const b = this.B[key], g = this.g, held = this.ptr[key] != null, s = this.st[key] || {};
      g.fillStyle(color, held ? 0.32 : 0.16); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(3, color, held ? 0.95 : 0.55); g.strokeCircle(b.x, b.y, b.r);
      if (held && s.drag && s.dir) { g.fillStyle(color, 0.8); g.fillCircle(b.x + s.dir.x * b.r * 0.55, b.y + s.dir.y * b.r * 0.55, b.r * 0.38); }
      else if (held && s.drag && !s.dir) {
        const q = b.r * 0.35; g.lineStyle(4, 0xff4444, 0.9);
        g.lineBetween(b.x - q, b.y - q, b.x + q, b.y + q); g.lineBetween(b.x + q, b.y - q, b.x - q, b.y + q);
      } else { g.fillStyle(color, held ? 0.7 : 0.4); g.fillCircle(b.x, b.y, b.r * 0.3); }
      if (cdFrac > 0) {
        g.fillStyle(0x000000, 0.6);
        g.beginPath(); g.moveTo(b.x, b.y);
        g.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdFrac, false);
        g.closePath(); g.fillPath();
      }
    }

    update(time, dms) {
      const dt = dms / 1000, g = this.g, w = this.scale.width, h = this.scale.height, u = this.u, B = this.B;
      g.clear();
      this.exitArmed = Math.max(0, this.exitArmed - dt);
      const portrait = this.touchUI && h > w;
      Ctl.blocked = portrait;
      this.rotateText.setVisible(portrait);
      if (portrait) { g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, w, h); }
      const town = this.town(), building = town && HUD.building, panel = town && HUD.panel;

      if (this.mouseMode && !this.touchUI && !HUD.dead && !building && !panel) {
        const dir = this.mouseDir();
        Ctl.aim = dir;
        if (this.mouseHeld && Ctl.mode === 'twin') Ctl.twin = { dir };
      }

      // top-left: exit, fullscreen, hearts
      const ex = B.exit, q = ex.r * 0.5;
      g.lineStyle(3, 0xffffff, 0.6);
      g.lineBetween(ex.x - q, ex.y - q, ex.x + q, ex.y + q); g.lineBetween(ex.x + q, ex.y - q, ex.x - q, ex.y + q);
      const f = B.fs; g.lineStyle(2, 0xffffff, 0.6); g.strokeRect(f.x - f.r * 0.6, f.y - f.r * 0.6, f.r * 1.2, f.r * 1.2);
      const maxHp = HUD.maxHp || T.heroHp;
      for (let i = 0; i < maxHp; i++) {
        const x = u * 0.28 + i * u * 0.05, y = u * 0.075, r = u * 0.019;
        if (i < HUD.hp) { g.fillStyle(0xff4d6d, 1); g.fillRect(x - r, y - r, r * 2, r * 2); }
        g.lineStyle(2, 0x000000, 0.8); g.strokeRect(x - r, y - r, r * 2, r * 2);
      }
      this.cageText.setVisible(!town).setText(`CAGES ×${HUD.cages ?? 0}`);
      HUD.scrapPop = Math.max(0, (HUD.scrapPop || 0) - dt);

      // top text
      let top;
      if (!town) top = `ROOM ${HUD.room}/${T.rooms}   ·   ⚙ ${HUD.scrap ?? 0}`;
      else if (building) top = `MILITARY ${HUD.points.mil}/${HUD.points.milMax}   ·   CIVIC ${HUD.points.civ}/${HUD.points.civMax}`;
      else if (HUD.night) { const s = Math.ceil(HUD.night.t); top = `NIGHT ${HUD.day}   ·   ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}   ·   ⚙ ${HUD.scrap}`; }
      else top = `DAY ${HUD.day}   ·   ⚙ ${HUD.scrap}   ·   HALL LV ${HUD.townLevel}`;
      this.topText.setText(top).setScale(1 + (HUD.scrapPop || 0) * 0.6);
      if (town && HUD.night) {
        const bw = u * 0.5, bx = w / 2 - bw / 2, by = u * 0.1;
        g.fillStyle(0x000000, 0.6); g.fillRect(bx - 2, by - 2, bw + 4, u * 0.025 + 4);
        g.fillStyle(HUD.night.gen / HUD.night.genMax > 0.35 ? 0x5fd3ff : 0xff4d6d, 1); g.fillRect(bx, by, bw * HUD.night.gen / HUD.night.genMax, u * 0.025);
      }

      // mode toggle (hidden in build mode)
      this.modeText.setVisible(!building);
      if (!building) {
        this.pill(B.mode, 0xffffff, 0.5, false);
        this.modeText.setText(Ctl.mode === 'brawl' ? 'MODE: TAP / DRAG  ⇄' : 'MODE: TWIN-STICK  ⇄');
      }

      // town buttons
      const showTown = this.townButtonsVisible() && !portrait;
      this.tBtn.build.setVisible(showTown); this.tBtn.endDay.setVisible(showTown);
      if (showTown) { this.pill(B.build, 0xf2d14b, 0.55, false); this.pill(B.endDay, 0x9a8cff, 0.55, false); }
      const showPrompt = town && HUD.prompt && !building && !panel && !portrait;
      this.tBtn.prompt.setVisible(!!showPrompt);
      if (showPrompt) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
        g.fillStyle(0xf2d14b, 0.15 + 0.15 * pulse); g.fillRoundedRect(B.prompt.x - B.prompt.w / 2, B.prompt.y - B.prompt.h / 2, B.prompt.w, B.prompt.h, B.prompt.h / 2);
        g.lineStyle(3, 0xf2d14b, 0.9); g.strokeRoundedRect(B.prompt.x - B.prompt.w / 2, B.prompt.y - B.prompt.h / 2, B.prompt.w, B.prompt.h, B.prompt.h / 2);
        this.tBtn.prompt.setText(HUD.prompt.label);
      }

      // build mode UI
      this.tBtn.done.setVisible(building); this.tBtn.tabMil.setVisible(building); this.tBtn.tabCiv.setVisible(building);
      this.buildMsg.setVisible(building);
      const items = building ? this.cardItems() : [];
      this.cards.forEach((c, i) => {
        const vis = i < items.length;
        c.icon.setVisible(vis); c.name.setVisible(vis); c.cost.setVisible(vis);
        if (!vis) return;
        const it = items[i], r = this.cardRect(i, items.length), sel = HUD.buildSel === it;
        g.fillStyle(sel ? 0xf2d14b : 0x000000, sel ? 0.3 : 0.6); g.fillRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 8);
        g.lineStyle(sel ? 3 : 2, sel ? 0xf2d14b : 0xffffff, sel ? 1 : 0.3); g.strokeRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 8);
        const def = BLD[it];
        if (def) { c.icon.setTexture(it).setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 70).setAlpha(1); c.name.setText(def.name); c.cost.setText(`${def.upg ? def.upg[0] : def.cost} pt${(def.upg ? def.upg[0] : def.cost) > 1 ? 's' : ''}`); }
        else if (it === 'upgrade') { c.icon.setTexture('turret').setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 70).setAlpha(0.6); c.name.setText('UPGRADE'); c.cost.setText('▲'); }
        else { c.icon.setTexture('rubble').setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 70).setAlpha(0.6); c.name.setText('REMOVE'); c.cost.setText('refund'); }
        c.name.setPosition(r.x, r.y + r.h * 0.12); c.cost.setPosition(r.x, r.y + r.h * 0.28);
      });
      if (building) {
        g.fillStyle(0x000000, 0.55); g.fillRect(0, B.bar.y - B.bar.h / 2 - u * 0.01, w, B.bar.h + u * 0.02);
        this.pill(B.done, 0x8ef0a0, 0.6, false);
        this.pill(B.tabMil, 0xff8c42, 0.6, HUD.buildTab === 'mil');
        this.pill(B.tabCiv, 0x5fd3ff, 0.6, HUD.buildTab === 'civ');
        this.buildMsg.setText(HUD.buildMsg || '');
      }

      // Town Hall panel
      const showPanel = panel === 'hall';
      [this.panelTitle, this.panelBody, this.panelUp, this.panelClose].forEach(t => t.setVisible(showPanel));
      if (showPanel) {
        const P = B.panel, H = HUD.hall;
        g.fillStyle(0x000000, 0.5); g.fillRect(0, 0, w, h);
        g.fillStyle(0x14161a, 0.97); g.fillRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
        g.lineStyle(3, 0xf2d14b, 0.8); g.strokeRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
        this.panelTitle.setText(`TOWN HALL — LEVEL ${H.level}`);
        const now = `Now: ${H.mil} military pts · ${H.civ} civic pts`;
        const nxt = H.next ? `Level ${H.level + 1}: ${H.next.mil} military · ${H.next.civ} civic · stronger generator` : 'Max level (for now)';
        const msg = HUD.hallMsg ? `\n\n${HUD.hallMsg}` : '';
        this.panelBody.setText(`${now}\n${nxt}\n\nYou have ⚙ ${HUD.scrap} scrap${msg}`);
        const can = H.next && HUD.scrap >= H.next.cost;
        this.pill(B.pUp, can ? 0x8ef0a0 : 0x6b737c, 0.6, can);
        this.panelUp.setText(H.next ? `UPGRADE  ⚙ ${H.next.cost}` : 'MAXED').setColor(can ? '#ffffff' : '#9aa4ad');
        this.pill(B.pClose, 0xffffff, 0.6, false);
      }

      // combat controls
      const showTouch = this.touchUI && !portrait && !building && !panel;
      for (const k in this.lbl) this.lbl[k].setVisible(showTouch);
      this.lbl.a1.setText(HUD.ab1Label || 'POUNCE');
      this.lbl.a2.setText(HUD.ab2Label || 'HOWL');
      this.deskHelp.setVisible(!this.touchUI && !building && !panel);
      this.deskHelp.setText(town
        ? 'WASD move · mouse aim · click attack · Space dash · Q/E abilities · B build · N end day · R use'
        : 'WASD move · mouse aim · click attack · Space / right-click dash · Q pounce · E ability 2 · F cage');
      if (showTouch) {
        const R = u * 0.12;
        if (this.moveBase) {
          g.fillStyle(0xffffff, 0.08); g.fillCircle(this.moveBase.x, this.moveBase.y, R);
          g.lineStyle(2, 0xffffff, 0.3); g.strokeCircle(this.moveBase.x, this.moveBase.y, R);
          g.fillStyle(0xffffff, 0.4); g.fillCircle(this.moveBase.x + Ctl.move.x * R, this.moveBase.y + Ctl.move.y * R, R * 0.45);
        } else {
          g.lineStyle(2, 0xffffff, 0.1); g.strokeCircle(u * 0.26, h - u * 0.26, R);
          g.fillStyle(0xffffff, 0.06); g.fillCircle(u * 0.26, h - u * 0.26, R * 0.45);
        }
        this.drawBtn('atk', 0xff8c42, 0);
        this.drawBtn('dash', 0x3fd0c9, HUD.dashCd / T.dashCd);
        this.drawBtn('a1', 0xe08a3c, HUD.cd1 / (HUD.cd1Max || 1));
        this.drawBtn('a2', HUD.ab2Label === 'ZAP' ? 0x5fd3ff : 0xffd166, HUD.cd2 / (HUD.cd2Max || 1));
        if (Ctl.mode === 'brawl') {
          const b = B.atk;
          for (let i = 0; i < T.ammoMax; i++) {
            const a0 = -Math.PI * 0.95 + i * 0.36;
            g.lineStyle(5, i < HUD.ammo ? 0xff8c42 : 0x3a2a1e, 0.95);
            g.beginPath(); g.arc(b.x, b.y, b.r + 9, a0, a0 + 0.3, false); g.strokePath();
          }
        }
        this.lbl.cap.setVisible(!!HUD.canCapture);
        if (HUD.canCapture) {
          const b = B.cap, pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
          g.fillStyle(0xf2d14b, 0.2 + 0.25 * pulse); g.fillCircle(b.x, b.y, b.r);
          g.lineStyle(3, 0xf2d14b, 1); g.strokeCircle(b.x, b.y, b.r + pulse * 4);
          g.fillStyle(0xc0c6cc, 1); g.fillRect(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.7, b.r * 0.7);
          g.fillStyle(0x4a525a, 1); for (let i = 0; i < 3; i++) g.fillRect(b.x - b.r * 0.25 + i * b.r * 0.22, b.y - b.r * 0.3, b.r * 0.08, b.r * 0.6);
        }
      }

      // banners
      if (HUD.banner) {
        HUD.banner.t -= dt;
        const a = Math.max(0, Math.min(1, HUD.banner.t * 2));
        this.banner.setText(HUD.banner.text).setAlpha(a);
        this.bannerSub.setText(HUD.banner.sub || (HUD.canCapture && !this.touchUI ? 'Press F to throw a cage' : '')).setAlpha(a);
        if (HUD.banner.t <= 0) HUD.banner = null;
      } else {
        this.banner.setAlpha(0);
        if (HUD.canCapture && !this.touchUI) this.bannerSub.setText('Press F to throw a cage').setAlpha(1); else this.bannerSub.setAlpha(0);
      }
      if (panel || building) { this.banner.setAlpha(0); this.bannerSub.setAlpha(0); }

      if (HUD.dead) {
        g.fillStyle(0x000000, 0.5); g.fillRect(0, 0, w, h);
        this.over.setVisible(true).setText(HUD.deadText || 'DOWN');
      } else this.over.setVisible(false);
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0e1013',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 5 },
    scene: [TownScene, DungeonScene, UIScene],
  });
}