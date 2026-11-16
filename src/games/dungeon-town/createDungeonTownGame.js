import Phaser from 'phaser';

/**
 * DUNGEON TOWN — Step 2: "The Ruins"
 * Creates the game inside `parent` (a DOM element). Returns the Phaser.Game.
 * Call game.destroy(true) to clean up. All state lives in this function.
 * Works with Phaser 3.80+ and 4.x.
 */
export function createDungeonTownGame(parent, { onExit } = {}) {
  const V = Phaser.Math.Vector2;
  const TILE = 48, COLS = 20, ROWS = 13, RW = COLS * TILE, RH = ROWS * TILE;

  // ===================================================================
  //  TUNING — every number you'll want to tweak
  // ===================================================================
  const T = {
    heroSpeed: 235, heroHp: 5, iframes: 0.8,
    dashSpeed: 780, dashTime: 0.15, dashCd: 0.9,
    // gun
    ammoMax: 3, reloadTime: 0.7, gunCd: 0.16, bulletSpeed: 950, bulletRange: 560, gunDmg: 2, gunKb: 200,
    twinFireRate: 0.24, twinDmg: 1,
    // sword (auto when an enemy is close in the attack direction)
    meleeRange: 78, meleeHalfArc: 0.95, swordDmg: 3, swordCd: 0.5, swordKb: 480,
    autoRange: 560,
    // Scrap Hound
    houndBiteCd: 1.1, houndBiteRange: 50, houndBiteDmg: 1,
    pounceCd: 6, pounceDist: 240, pounceAuto: 420, pounceRadius: 75, pounceDmg: 3, pounceStun: 1.3,
    howlCd: 8, howlRadius: 190, howlKb: 650, howlStun: 0.7,
    // Spark Crow (companion once caught + extracted)
    crowZapCd: 1.6, crowZapRange: 250, crowZapDmg: 1,
    chainCd: 7, chainCount: 4, chainJump: 170, chainDmg: 2, chainStun: 1.0,
    // capture
    cagesPerRun: 2, cageTime: 3, cageHp: 4, captureRange: 320, weakTime: 8,
    // run
    rooms: 5, extractRooms: [2, 4, 5],
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

  // # wall · . floor · c crate · r rubble · s spawn · D door · P entry · H hatch
  const TEMPLATES = [
    [
      '#########DD#########',
      '#s................s#',
      '#..................#',
      '#...r..........r...#',
      '#......c....c......#',
      '#..................#',
      '#s.......HH.......s#',
      '#..................#',
      '#......c....c......#',
      '#...r..........r...#',
      '#..................#',
      '#s.......PP.......s#',
      '####################',
    ],
    [
      '#########DD#########',
      '#s......#..#......s#',
      '#.......#..#.......#',
      '#..rr..........rr..#',
      '#..rr...c..c...rr..#',
      '#..................#',
      '#s.......HH.......s#',
      '#....##......##....#',
      '#....##..cc..##....#',
      '#..................#',
      '#..c............c..#',
      '#s.......PP.......s#',
      '####################',
    ],
    [
      '#########DD#########',
      '#s................s#',
      '#....rrrr..rrrr....#',
      '#..................#',
      '#.c..............c.#',
      '#.....r......r.....#',
      '#s.......HH.......s#',
      '#.....r......r.....#',
      '#.c..............c.#',
      '#..................#',
      '#....rrrr..rrrr....#',
      '#........PP.......s#',
      '####################',
    ],
  ];
  const FINAL_ROOM = [
    '####################',
    '#s................s#',
    '#..r............r..#',
    '#..................#',
    '#.....c......c.....#',
    '#..................#',
    '#s.......HH.......s#',
    '#..................#',
    '#.....c......c.....#',
    '#..................#',
    '#..r............r..#',
    '#s.......PP.......s#',
    '####################',
  ];

  // ===================================================================
  //  SAVE (this browser only, for now)
  // ===================================================================
  const SAVE_KEY = 'dungeonTown.v1';
  const freshSave = () => ({ scrap: 0, creatures: { hound: 1 }, runs: 0, bestRoom: 0 });
  const SAVE = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s.scrap === 'number') return Object.assign(freshSave(), s, { creatures: Object.assign({ hound: 1 }, s.creatures) });
    } catch (e) {}
    return freshSave();
  })();
  const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

  // Shared state between scenes
  const Ctl = { move: { x: 0, y: 0 }, mode: 'brawl', queue: [], aim: null, aimAbility: null, twin: null, blocked: false };
  const HUD = {};

  // Tint helpers that work on Phaser 3 (setTintFill) and Phaser 4 (tint modes)
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
  //  PIXEL ART — drawn from text maps. Each letter is a colour.
  // ===================================================================
  const PAL = {
    k: '#14161a', K: '#2b2f36', g: '#6b737c', G: '#4f565e', w: '#e8e6df',
    s: '#d9a066', S: '#a8743f', t: '#3fa7a0', T: '#23706b', b: '#6b4a2b', B: '#3f2a18',
    z: '#8fae4a', Z: '#56702a', r: '#d0392b', R: '#7a1f17', o: '#e08a3c', O: '#9c5520',
    y: '#f2d14b', p: '#7d5ba6', P: '#4b3566', c: '#5fd3ff', C: '#2a7fa8',
    m: '#9aa4ad', M: '#4a525a', e: '#fff2a8', l: '#b5c94f', L: '#6f7d2a', n: '#c9b28a',
  };
  const SPR = {
    hero: [
      '................',
      '.....kkkkk......',
      '....kBbbbbk.....',
      '....kbbbbbbk....',
      '....kbsssSk.....',
      '....kskskSk.....',
      '....kssssSk.....',
      '...kkttttTkk....',
      '..ktttTtttTtk...',
      '..ksTttttttsk...',
      '..kskTtttTksk...',
      '...kkKKKKKkk....',
      '....kKKkKKk.....',
      '....kKk.kKk.....',
      '....kBk.kBk.....',
      '....kkk.kkk.....',
    ],
    walker: [
      '................',
      '.....kkkkk......',
      '....kzzzzzk.....',
      '....kzzrzrk.....',
      '....kzzzzZk.....',
      '.....kZZZk......',
      '....kpppppkkkkk.',
      '...kpPpppPzzzzk.',
      '...kpppppppkkkk.',
      '...kpPpppPk.....',
      '....kKKKKKk.....',
      '....kKk.kKk.....',
      '....kZk.kZk.....',
      '....kkk.kkk.....',
      '................',
      '................',
    ],
    runner: [
      '................',
      '................',
      '................',
      '......kkkk......',
      '.....kzzzzk.....',
      '.....kzrzrk.....',
      '.....kzzzZk.....',
      '....kkRRRRkkk...',
      '...kzRrRRrRzzk..',
      '...kkRRRRRkkkk..',
      '.....kKKKk......',
      '....kKk.kKk.....',
      '....kZk..kZk....',
      '....kk....kk....',
      '................',
      '................',
    ],
    spitter: [
      '................',
      '.....kkkkkk.....',
      '....kppppppk....',
      '...kpPppppPpk...',
      '...kpprpprppk...',
      '...kpppppppPk...',
      '....kplllllk....',
      '.....kPPPPk.....',
      '....kzzzzzzk....',
      '...kzZzzzzZzk...',
      '...kzkzzzzkzk...',
      '....kKKKKKk.....',
      '....kKk.kKk.....',
      '....kkk.kkk.....',
      '................',
      '................',
    ],
    brute: [
      '...kkkkkkkkk....',
      '..kzzzzzzzzzk...',
      '..kzzrzzzrzzk...',
      '..kZzzzzzzzZk...',
      '.kkkMMMMMMMkkk..',
      'kzzkMmmmmmmMkzzk',
      'kzzkMmMmmMmMkzzk',
      'kZzkMmmmmmmMkzZk',
      'kZZkMMMMMMMMkZZk',
      '.kkkKKKKKKKKkkk.',
      '...kKKKkkKKKk...',
      '...kKKk..kKKk...',
      '...kZZk..kZZk...',
      '...kkkk..kkkk...',
      '................',
      '................',
    ],
    bloater: [
      '................',
      '......kkkk......',
      '.....kzzzzk.....',
      '.....kzrrzk.....',
      '....kkkzzkkk....',
      '...kllllllllk...',
      '..kllLllllLllk..',
      '..klllllllllLk..',
      '..kLlllyylllLk..',
      '..klllllllllLk..',
      '...kLllllllLk...',
      '....kkLLLLkk....',
      '.....kZkkZk.....',
      '.....kkk.kkk....',
      '................',
      '................',
    ],
    hound: [
      '................',
      '................',
      '................',
      '................',
      '...........kk...',
      '..........kook..',
      '..k......kooek..',
      '.kok.....koooOk.',
      '..kokkkkkkooook.',
      '...koooooooookk.',
      '...kooOooooook..',
      '...kooooooook...',
      '...kOk.kOk.kOk..',
      '...kk..kk..kk...',
      '................',
      '................',
    ],
    crow: [
      '................',
      '................',
      '................',
      '.........kkk....',
      '........kPPPk...',
      '...kk..kPPePyk..',
      '..kcck.kPPPPkk..',
      '..kcPPkPPPPk....',
      '...kPPPPPPPk....',
      '....kPPPPPPk....',
      '.....kPcPPk.....',
      '......kkyk......',
      '.......kyk......',
      '................',
      '................',
      '................',
    ],
    crate: [
      'kkkkkkkkkkkkkkkk',
      'kbbbbbbbbbbbbbbk',
      'kbBbbbbbbbbbbBbk',
      'kbbBbbbbbbbbBbbk',
      'kbbbBbbbbbbBbbbk',
      'kbbbbBbbbbBbbbbk',
      'kbbbbbBbbBbbbbbk',
      'kbbbbbbBBbbbbbbk',
      'kbbbbbbBBbbbbbbk',
      'kbbbbbBbbBbbbbbk',
      'kbbbbBbbbbBbbbbk',
      'kbbbBbbbbbbBbbbk',
      'kbbBbbbbbbbbBbbk',
      'kbBbbbbbbbbbbBbk',
      'kbbbbbbbbbbbbbbk',
      'kkkkkkkkkkkkkkkk',
    ],
    rubble: [
      '................',
      '...kkkkkk.......',
      '..kgggggGkk.....',
      '.kggGgggggGkkk..',
      '.kgggggkgggGggk.',
      'kgGggggkkgggggk.',
      'kggggGgggggGggkk',
      'kgggggggGggggGgk',
      'kGggggggggggggGk',
      'kgggGgggGggggggk',
      '.kgggggggGgggGk.',
      '.kkGggggggggGkk.',
      '...kkkgggGkkk...',
      '.....kkkkkk.....',
      '................',
      '................',
    ],
    cage: [
      '................',
      '..kkkkkkkkkkkk..',
      '..kmmmmmmmmmmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmkMkMkMkMmk..',
      '..kmmmmmmmmmmk..',
      '..kkkkkkkkkkkk..',
      '................',
    ],
    scrap: ['..kkk...', '.kmmMk..', 'kmMmmMk.', 'kMmmmyk.', '.kMmMk..', '..kkk...'],
    gun: ['kkkkkkkkkk', 'kmmmmmmmMk', 'kkkMkkkkkk', '..kk......'],
    bullet: ['.ee.', 'eyye', 'eyye', '.ee.'],
    spit: ['.kk.', 'klLk', 'kllk', '.kk.'],
    spark: ['.cc.', 'cwwc', 'cwwc', '.cc.'],
    splat: ['..LL.L', '.LZZL.', 'LZZZZL', '.LZZL.', 'L.LL..'],
    heart: ['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
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

  function makeTextures(scene) {
    for (const k of ['hero', 'walker', 'runner', 'spitter', 'bloater', 'hound', 'crow', 'crate', 'rubble', 'cage']) pxTexture(scene, k, SPR[k], 3);
    pxTexture(scene, 'brute', SPR.brute, 4);
    pxTexture(scene, 'scrap', SPR.scrap, 2);
    pxTexture(scene, 'gun', SPR.gun, 3);
    pxTexture(scene, 'bullet', SPR.bullet, 3);
    pxTexture(scene, 'spit', SPR.spit, 4);
    pxTexture(scene, 'spark', SPR.spark, 3);
    pxTexture(scene, 'splat', SPR.splat, 4);
    pxTexture(scene, 'heart', SPR.heart, 3);
    if (!scene.textures.exists('dot')) {
      const t = scene.textures.createCanvas('dot', 6, 6); const c = t.getContext(); c.fillStyle = '#fff'; c.fillRect(0, 0, 6, 6); t.refresh();
    }
    if (!scene.textures.exists('hatch')) { // hazard-striped hatch, drawn per pixel
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
  }

  // ===================================================================
  //  MENU / CAMP SCENE
  // ===================================================================
  class MenuScene extends Phaser.Scene {
    constructor() { super('menu'); }
    init(data) { this.result = data && data.result; }
    create() {
      makeTextures(this);
      this.cameras.main.setBackgroundColor('#0e1013');
      this.g = this.add.graphics();
      const S = (size, extra = {}) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 4, align: 'center' }, extra);
      this.title = this.add.text(0, 0, 'DUNGEON TOWN', S(48, { color: '#f2d14b', strokeThickness: 8 })).setOrigin(0.5);
      this.sub = this.add.text(0, 0, 'THE RUINS', S(16, { color: '#9aa4ad' })).setOrigin(0.5);
      this.stats = this.add.text(0, 0, '', S(18)).setOrigin(0.5);
      this.res = this.add.text(0, 0, '', S(18)).setOrigin(0.5);
      this.startTxt = this.add.text(0, 0, 'ENTER THE RUINS', S(22)).setOrigin(0.5);
      this.modeTxt = this.add.text(0, 0, '', S(13)).setOrigin(0.5);
      this.hint = this.add.text(0, 0, 'Extract to keep your scrap. Die and you lose the run.\nThe Town is coming next. Your scrap will build it.', S(12, { color: '#9aa4ad', strokeThickness: 3 })).setOrigin(0.5);
      this.icons = [];
      this.layout();
      this.scale.on('resize', this.layout, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
      this.input.on('pointerup', this.tap, this);
    }
    layout() {
      const w = this.scale.width, h = this.scale.height, u = Math.min(w, h);
      this.u = u;
      const fs = n => Math.max(11, Math.round(u * n)) + 'px';
      this.title.setPosition(w / 2, h * 0.14).setFontSize(fs(0.11));
      this.sub.setPosition(w / 2, h * 0.14 + u * 0.08).setFontSize(fs(0.035));
      this.stats.setPosition(w / 2, h * 0.38).setFontSize(fs(0.04));
      this.res.setPosition(w / 2, h * 0.52).setFontSize(fs(0.04));
      this.btn = { x: w / 2, y: h * 0.71, w: u * 0.62, h: u * 0.13 };
      this.startTxt.setPosition(this.btn.x, this.btn.y).setFontSize(fs(0.05));
      this.modeBtn = { x: w - u * 0.27, y: u * 0.075, w: u * 0.46, h: u * 0.085 };
      this.modeTxt.setPosition(this.modeBtn.x, this.modeBtn.y).setFontSize(fs(0.032));
      this.exitBtn = { x: u * 0.07, y: u * 0.075, r: u * 0.045 };
      this.hint.setPosition(w / 2, h * 0.88).setFontSize(fs(0.028));
      this.refresh();
    }
    refresh() {
      const owned = SAVE.creatures;
      this.stats.setText(`⚙ ${SAVE.scrap} scrap banked     Best: room ${SAVE.bestRoom}/${T.rooms}\nCreatures:  Scrap Hound${owned.crow ? `   ·   Spark Crow${owned.crow > 1 ? ' ×' + owned.crow : ''}` : ''}`);
      const r = this.result;
      let txt = '', col = '#ffffff';
      if (r && r.type === 'extract') { txt = `EXTRACTED!  +${r.scrap} scrap${r.caught ? `   ·   Caught: ${r.caught}` : ''}`; col = '#8ef0a0'; }
      else if (r && r.type === 'dead') { txt = `You died in room ${r.room}.  Lost ${r.scrap} scrap${r.caught ? ' and your catch' : ''}.`; col = '#ff8c8c'; }
      else if (r && r.type === 'abandon') { txt = 'Run abandoned.'; col = '#c9d1d9'; }
      this.res.setText(txt).setColor(col);
      this.modeTxt.setText(Ctl.mode === 'brawl' ? 'MODE: TAP / DRAG  ⇄' : 'MODE: TWIN-STICK  ⇄');
      this.icons.forEach(i => i.destroy()); this.icons = [];
      const w = this.scale.width, u = this.u, y = this.scale.height * 0.38 - u * 0.11;
      const list = ['hound'].concat(owned.crow ? ['crow'] : []);
      list.forEach((k, i) => this.icons.push(this.add.image(w / 2 + (i - (list.length - 1) / 2) * u * 0.14, y, k).setScale(u / 400)));
    }
    update(time) {
      const g = this.g, b = this.btn, m = this.modeBtn, e = this.exitBtn, pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
      g.clear();
      g.fillStyle(0xf2d14b, 0.18 + 0.1 * pulse); g.fillRoundedRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 12);
      g.lineStyle(3, 0xf2d14b, 0.9); g.strokeRoundedRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 12);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      g.lineStyle(2, 0xffffff, 0.35); g.strokeRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      const q = e.r * 0.5; g.lineStyle(3, 0xffffff, 0.6);
      g.lineBetween(e.x - q, e.y - q, e.x + q, e.y + q); g.lineBetween(e.x + q, e.y - q, e.x - q, e.y + q);
    }
    tap(p) {
      const inR = (r) => Math.abs(p.x - r.x) < r.w / 2 && Math.abs(p.y - r.y) < r.h / 2;
      if (Math.hypot(p.x - this.exitBtn.x, p.y - this.exitBtn.y) < this.exitBtn.r * 1.5) { if (onExit) onExit(); return; }
      if (inR(this.modeBtn)) { Ctl.mode = Ctl.mode === 'brawl' ? 'twin' : 'brawl'; this.refresh(); return; }
      if (inR(this.btn)) {
        this.scene.start('game', { run: { room: 1, hp: T.heroHp, scrap: 0, cages: T.cagesPerRun, captured: [] } });
      }
    }
  }

  // ===================================================================
  //  GAME SCENE — one room of the ruins
  // ===================================================================
  let floorKey = null, floorCount = 0;

  class GameScene extends Phaser.Scene {
    constructor() { super('game'); }
    init(data) { this.run = data.run; }

    create() {
      makeTextures(this);
      const run = this.run;
      const crowOwned = (SAVE.creatures.crow || 0) > 0;
      Object.assign(HUD, {
        hp: run.hp, ammo: T.ammoMax, reload: 0, dashCd: 0, cd1: 0, cd2: 0,
        cd1Max: T.pounceCd, cd2Max: crowOwned ? T.chainCd : T.howlCd,
        ab1Label: 'POUNCE', ab2Label: crowOwned ? 'ZAP' : 'HOWL',
        room: run.room, scrap: run.scrap, cages: run.cages, canCapture: false,
        dead: false, banner: { text: run.room === T.rooms ? 'FINAL ROOM' : 'ROOM ' + run.room, t: 1.4 },
      });
      Ctl.queue.length = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;

      this.isExtractRoom = T.extractRooms.includes(run.room);
      this.grid = (run.room === T.rooms ? FINAL_ROOM : Phaser.Utils.Array.GetRandom(TEMPLATES)).map(r => r.padEnd(COLS, '#').slice(0, COLS));
      this.physics.world.setBounds(0, 0, RW, RH);
      this.buildRoom();

      // hero
      this.hero = this.physics.add.image(this.entry.x, this.entry.y - 20, 'hero');
      this.hero.body.setCircle(13, 11, 16);
      this.hero.setCollideWorldBounds(true);
      this.gun = this.add.image(0, 0, 'gun').setOrigin(0.1, 0.4);
      this.facing = new V(0, -1);
      this.dashT = 0; this.dashDir = new V(1, 0); this.inv = 0; this.gunCdT = 0; this.swordCdT = 0;
      this.kbT = 0; this.kb = new V(); this.gunKick = 0; this.faceLock = 0; this.ghostT = 0;

      // companions
      this.hound = this.physics.add.image(this.hero.x - 40, this.hero.y + 20, 'hound');
      this.hound.body.setCircle(10, 15, 17);
      this.hound.setCollideWorldBounds(true);
      this.hound.mode = 'follow'; this.hound.biteT = 0;
      this.crow = crowOwned ? this.add.image(this.hero.x + 40, this.hero.y - 30, 'crow') : null;
      if (this.crow) { this.crow.zapT = 1; this.crow.bob = 0; }

      // groups
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
      this.physics.add.collider(this.bullets, this.solids, (a, b) => { const bl = a.isBullet ? a : b; this.spark(bl.x, bl.y, 0xfff2a8, 3); bl.destroy(); });
      this.physics.add.collider(this.bullets, this.crates, (a, b) => { const bl = a.isBullet ? a : b, cr = a.isBullet ? b : a; bl.destroy(); this.hitCrate(cr, T.gunDmg); });
      this.physics.add.collider(this.spits, this.solids, (a, b) => { const s = a.isSpit ? a : b; this.splash(s); });
      this.physics.add.collider(this.spits, this.crates, (a, b) => { const s = a.isSpit ? a : b; this.splash(s); });
      this.physics.add.overlap(this.bullets, this.enemies, (a, b) => { const bl = a.isBullet ? a : b, z = a.isBullet ? b : a; this.bulletHit(bl, z); });
      this.physics.add.overlap(this.spits, this.hero, (a, b) => {
        const s = a.isSpit ? a : b; if (!s.active) return;
        const d = new V(s.body.velocity.x, s.body.velocity.y).normalize();
        this.splash(s); this.hurtHero(d.x, d.y, 1);
      });

      this.fx = this.add.graphics().setDepth(900);
      this.pickups = [];
      this.cage = null; this.wild = null;

      // wild Spark Crow (rooms 2–4). Guaranteed in room 2 until you own one.
      if (run.room >= 2 && run.room <= 4) {
        const chance = (!crowOwned && run.room === 2) ? 1 : 0.4;
        if (Math.random() < chance) this.spawnWild();
      }

      // waves
      this.waves = ROOM_WAVES[run.room].map(w => w.slice());
      this.waveIdx = -1; this.waveDelay = 1.0; this.pending = 0;
      this.roomClear = false; this.leaving = false; this.extractT = 0;

      const cam = this.cameras.main;
      cam.setBounds(0, 0, RW, RH);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setBackgroundColor('#0e1013');
      cam.fadeIn(250);
      this.fitZoom();
      this.scale.on('resize', this.fitZoom, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,F');
      this.hitstop = 0; this.blockedPause = false;

      if (!this.scene.isActive('ui')) this.scene.launch('ui');
      else this.scene.bringToTop('ui');
    }

    fitZoom() {
      const z = Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / 420, 0.55, 2.4);
      this.cameras.main.setZoom(z);
    }

    // ---------------------------------------------------------------- room
    buildRoom() {
      const grid = this.grid;
      this.solids = this.physics.add.staticGroup();
      this.crates = this.physics.add.staticGroup();
      this.spawns = []; this.doorZones = [];
      let px = [], hx = [], dx = [];
      for (let r = 0; r < ROWS; r++) {
        let run0 = -1;
        for (let c = 0; c <= COLS; c++) {
          const ch = c < COLS ? grid[r][c] : '.';
          const solid = ch === '#';
          if (solid && run0 < 0) run0 = c;
          if (!solid && run0 >= 0) { // merge wall runs into one body
            const z = this.add.zone((run0 + c) / 2 * TILE, r * TILE + TILE / 2, (c - run0) * TILE, TILE);
            this.physics.add.existing(z, true); this.solids.add(z); run0 = -1;
          }
          if (c >= COLS) continue;
          const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
          if (ch === 'c') { const cr = this.crates.create(x, y, 'crate'); cr.refreshBody(); cr.hp = 2; cr.setDepth(5 + y / 1000); }
          if (ch === 'r') { const rb = this.solids.create(x, y, 'rubble'); rb.refreshBody(); rb.setDepth(5 + y / 1000); }
          if (ch === 's') this.spawns.push({ x, y });
          if (ch === 'P') px.push({ x, y });
          if (ch === 'H') hx.push({ x, y });
          if (ch === 'D') { dx.push({ x, y }); const z = this.add.zone(x, y, TILE, TILE); this.physics.add.existing(z, true); this.solids.add(z); this.doorZones.push(z); }
        }
      }
      const avg = (a) => a.length ? { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length } : null;
      this.entry = avg(px) || { x: RW / 2, y: RH - TILE * 1.5 };
      this.hatchPos = avg(hx) || { x: RW / 2, y: RH / 2 };
      this.doorPos = avg(dx);
      this.drawFloor();
      this.doorG = this.add.graphics().setDepth(3);
      this.drawDoor(false);
      this.hatch = this.add.image(this.hatchPos.x, this.hatchPos.y, 'hatch').setDepth(1.5).setVisible(false);
    }

    drawFloor() {
      if (floorKey && this.textures.exists(floorKey)) this.textures.remove(floorKey);
      floorKey = 'floor' + (++floorCount);
      const tex = this.textures.createCanvas(floorKey, RW, RH), c = tex.getContext(), P = 3, R = Phaser.Math;
      const isWall = (r, cc) => r < 0 || r >= ROWS || cc < 0 || cc >= COLS || this.grid[r][cc] === '#' || this.grid[r][cc] === 'D';
      const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.floor(x / P) * P, Math.floor(y / P) * P, P, P); };
      for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
        const x0 = cc * TILE, y0 = r * TILE;
        if (isWall(r, cc)) {
          c.fillStyle = '#353a42'; c.fillRect(x0, y0, TILE, TILE);
          for (let i = 0; i < 10; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, 30), Math.random() < 0.5 ? '#2c3037' : '#40464f');
          if (!isWall(r + 1, cc)) { // front face of the wall
            c.fillStyle = '#22262c'; c.fillRect(x0, y0 + 30, TILE, 18);
            c.fillStyle = '#1a1d22';
            for (let yy = 0; yy < 18; yy += 9) { c.fillRect(x0, y0 + 30 + yy, TILE, P); for (let xx = (yy ? 12 : 0); xx < TILE; xx += 24) c.fillRect(x0 + xx, y0 + 30 + yy, P, 9); }
          }
        } else {
          const shade = ['#24272c', '#262a2f', '#222529'][(r * 7 + cc * 3) % 3];
          c.fillStyle = shade; c.fillRect(x0, y0, TILE, TILE);
          if ((r + cc) % 2 === 0) { c.fillStyle = '#1f2226'; c.fillRect(x0, y0, TILE, P); c.fillRect(x0, y0, P, TILE); }
          for (let i = 0; i < 7; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, TILE - 1), Math.random() < 0.6 ? '#1c1f23' : '#2e3238');
          if (isWall(r - 1, cc)) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x0, y0, TILE, 9); } // wall shadow
        }
      }
      // stains + cracks
      for (let i = 0; i < 14; i++) {
        const sx = R.Between(TILE, RW - TILE), sy = R.Between(TILE, RH - TILE), green = Math.random() < 0.3;
        for (let j = 0; j < 22; j++) dot(sx + R.Between(-18, 18), sy + R.Between(-12, 12), green ? '#252d1f' : '#1b1d20');
      }
      for (let i = 0; i < 12; i++) {
        let x = R.Between(TILE, RW - TILE), y = R.Between(TILE, RH - TILE);
        for (let j = 0; j < 14; j++) { x += R.Between(-1, 1) * P; y += R.Between(-1, 1) * P; dot(x, y, '#141619'); }
      }
      tex.refresh();
      this.add.image(0, 0, floorKey).setOrigin(0).setDepth(0);
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

    // ---------------------------------------------------------------- loop
    update(time, dms) {
      const dt = Math.min(dms / 1000, 0.05);
      if (Ctl.blocked) { if (!this.blockedPause) { this.physics.world.pause(); this.blockedPause = true; } return; }
      if (this.blockedPause) { this.blockedPause = false; this.physics.world.resume(); }
      if (this.leaving) return;
      if (this.hitstop > 0) { this.hitstop -= dt; if (this.hitstop <= 0) this.physics.world.resume(); return; }

      const hero = this.hero, k = this.keys;
      const mv = new V(Ctl.move.x, Ctl.move.y);
      const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      if (kx || ky) mv.set(kx, ky).normalize();
      if (mv.length() > 1) mv.normalize();
      if (Phaser.Input.Keyboard.JustDown(k.SPACE)) Ctl.queue.push({ type: 'dash' });
      if (Phaser.Input.Keyboard.JustDown(k.Q)) Ctl.queue.push({ type: 'ab', i: 1, dir: null });
      if (Phaser.Input.Keyboard.JustDown(k.E)) Ctl.queue.push({ type: 'ab', i: 2, dir: null });
      if (Phaser.Input.Keyboard.JustDown(k.F)) Ctl.queue.push({ type: 'capture' });

      while (Ctl.queue.length) {
        const ev = Ctl.queue.shift();
        if (ev.type === 'abandon') { this.endRun({ type: 'abandon' }); return; }
        if (HUD.dead) continue;
        if (ev.type === 'attack') this.attack(ev.dir, false);
        else if (ev.type === 'dash') this.tryDash(mv);
        else if (ev.type === 'ab') this.ability(ev.i, ev.dir);
        else if (ev.type === 'capture') this.throwCage();
      }
      if (Ctl.mode === 'twin' && Ctl.twin && !HUD.dead) this.attack(Ctl.twin.dir, true);

      // timers
      this.inv = Math.max(0, this.inv - dt);
      this.gunCdT = Math.max(0, this.gunCdT - dt);
      this.swordCdT = Math.max(0, this.swordCdT - dt);
      this.faceLock = Math.max(0, this.faceLock - dt);
      HUD.dashCd = Math.max(0, HUD.dashCd - dt);
      HUD.cd1 = Math.max(0, HUD.cd1 - dt);
      HUD.cd2 = Math.max(0, HUD.cd2 - dt);
      if (HUD.ammo < T.ammoMax) { HUD.reload += dt; if (HUD.reload >= T.reloadTime) { HUD.ammo++; HUD.reload = 0; } } else HUD.reload = 0;

      // hero motion
      if (HUD.dead) hero.setVelocity(0, 0);
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

      if (Ctl.aim) this.facing.copy(Ctl.aim);
      else if (this.faceLock <= 0 && mv.length() > 0.2) this.facing.copy(mv).normalize();
      if (Math.abs(this.facing.x) > 0.05) hero.setFlipX(this.facing.x < 0);
      this.gunKick *= 0.8;
      const gd = 10 - this.gunKick;
      this.gun.setPosition(hero.x + this.facing.x * gd, hero.y + 6 + this.facing.y * gd).setRotation(this.facing.angle()).setFlipY(this.facing.x < 0);
      hero.setAlpha(this.inv > 0 && this.dashT <= 0 ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1);
      this.gun.setAlpha(hero.alpha);

      this.updateHound(dt);
      this.updateCrow(dt, time);
      kids(this.enemies).forEach(z => z.active && this.updateEnemy(z, dt, time));
      this.updateWild(dt, time);
      this.updateCage(dt);
      kids(this.bullets).forEach(b => { if (b.active && Phaser.Math.Distance.Between(b.x, b.y, b.sx, b.sy) > T.bulletRange) b.destroy(); });
      kids(this.spits).forEach(s => {
        if (!s.active) return;
        s.life -= dt; if (s.life <= 0) { this.splash(s); return; }
        if (this.cage && dist(s, this.cage) < 26) { this.splash(s); this.damageCage(1); }
      });
      this.updatePickups(dt);
      this.updateWaves(dt);
      this.updateExits(dt);

      // depth-sort actors by y
      [hero, this.hound].concat(kids(this.enemies)).forEach(o => o.active && o.setDepth(10 + o.y / 1000));
      this.gun.setDepth(hero.depth + 0.001);
      if (this.crow) this.crow.setDepth(800);
      if (this.wild && this.wild.active) this.wild.setDepth(790);

      HUD.canCapture = !!(this.wild && this.wild.active && this.wild.weak > 0 && !this.wild.caged && this.run.cages > 0 && !this.cage && dist(hero, this.wild) < T.captureRange);
      HUD.cages = this.run.cages; HUD.scrap = this.run.scrap;
      this.drawFx(time);
    }

    // ---------------------------------------------------------------- waves & exits
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
          this.time.delayedCall(i * 280, () => this.emerge(type, sp.x + Phaser.Math.Between(-14, 14), sp.y + Phaser.Math.Between(-14, 14)));
        });
      } else this.clearRoom();
    }

    clearRoom() {
      this.roomClear = true;
      if (HUD.hp < T.heroHp) { HUD.hp++; this.floatText(this.hero.x, this.hero.y - 40, '+1 ♥', '#ff8c9e', 18); }
      if (this.run.room < T.rooms) { this.doorZones.forEach(z => z.destroy()); this.drawDoor(true); }
      if (this.isExtractRoom) {
        this.hatch.setVisible(true).setScale(0);
        this.tweens.add({ targets: this.hatch, scale: 1, duration: 400, ease: 'Back.out' });
      }
      const msg = this.run.room === T.rooms ? 'CLEARED! EXTRACT' : (this.isExtractRoom ? 'ROOM CLEAR' : 'ROOM CLEAR');
      HUD.banner = { text: msg, sub: this.isExtractRoom && this.run.room < T.rooms ? 'Hatch = extract and keep loot  ·  Door = go deeper' : '', t: 2.6 };
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

    endRun(result) {
      this.leaving = true;
      this.scene.stop('ui');
      this.scene.start('menu', { result });
    }

    // ---------------------------------------------------------------- enemies
    emerge(type, x, y) {
      if (!this.sys.isActive()) return;
      const g = this.add.graphics().setDepth(2);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 600,
        onUpdate: tw => { const v = tw.getValue(); g.clear(); g.fillStyle(0x07080a, 0.7 * v); g.fillEllipse(x, y + 10, 40 * v, 18 * v); },
        onComplete: () => { g.destroy(); this.pending--; this.spawnEnemy(type, x, y); },
      });
    }

    spawnEnemy(type, x, y) {
      const def = E[type];
      const z = this.enemies.create(x, y, type);
      z.type = type; z.hp = def.hp; z.mode = 'chase'; z.t = 0; z.kbT = 0; z.stun = 0;
      z.spd = def.speed * Phaser.Math.FloatBetween(0.88, 1.15);
      if (type === 'runner') z.body.setCircle(10, 14, 22);
      else if (type === 'brute') { z.body.setCircle(22, 10, 8); z.face = Math.atan2(this.hero.y - y, this.hero.x - x); }
      else if (type === 'bloater') z.body.setCircle(15, 9, 12);
      else z.body.setCircle(13, 11, 16);
      if (type === 'spitter') { z.fireT = Phaser.Math.FloatBetween(1, 2); z.strafe = Math.random() < 0.5 ? 1 : -1; }
      z.setScale(0.2);
      this.tweens.add({ targets: z, scale: 1, duration: 220, ease: 'Back.out' });
      return z;
    }

    targetFor(z) {
      const h = this.hero;
      if (this.cage && dist(z, this.cage) < Math.min(260, dist(z, h))) return { x: this.cage.x, y: this.cage.y, isCage: true };
      return { x: h.x, y: h.y, isCage: false };
    }

    hitTarget(tg, dmg, dx, dy) { if (tg.isCage) this.damageCage(dmg); else this.hurtHero(dx, dy, dmg); }

    updateEnemy(z, dt, time) {
      const def = E[z.type];
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
      else if (z.type === 'bloater') this.updateBloater(z, def, dx, dy, d, dt, time);
    }

    updateLunger(z, def, tg, dx, dy, d, dt) {
      switch (z.mode) {
        case 'chase':
          z.setVelocity(dx / d * z.spd, dy / d * z.spd);
          if (d < def.windupRange && !HUD.dead) {
            z.mode = 'windup'; z.t = def.windup; z.setVelocity(0, 0); z.ldx = dx / d; z.ldy = dy / d;
            z.setTint(0xff6666);
            this.tweens.add({ targets: z, scale: 1.2, duration: def.windup * 1000, ease: 'Quad.in' });
          }
          break;
        case 'windup':
          z.t -= dt; z.setVelocity(0, 0);
          if (z.t > def.windup * 0.45) { z.ldx = dx / d; z.ldy = dy / d; }
          if (z.t <= 0) { z.mode = 'lunge'; z.t = def.lungeT; untint(z); this.tweens.killTweensOf(z); z.setScale(1); z.hitDone = false; }
          break;
        case 'lunge':
          z.t -= dt; z.setVelocity(z.ldx * def.lunge, z.ldy * def.lunge);
          if (!z.hitDone && d < 34) { z.hitDone = true; this.hitTarget(tg, def.dmg, z.ldx, z.ldy); }
          if (z.t <= 0) { z.mode = 'recover'; z.t = def.recover; }
          break;
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
        if (d > def.keep + 40) { vx = dx / d; vy = dy / d; }
        else if (d < def.keep - 40) { vx = -dx / d; vy = -dy / d; }
        else { vx = -dy / d * z.strafe; vy = dx / d * z.strafe; }
        z.setVelocity(vx * z.spd, vy * z.spd);
        if (z.fireT <= 0 && d < 430 && !HUD.dead) { z.mode = 'windup'; z.t = def.windup; z.setTint(0xc8ff6a); z.setVelocity(0, 0); }
      } else if (z.mode === 'windup') {
        z.t -= dt; z.setVelocity(0, 0);
        if (z.t <= 0) {
          untint(z); this.spit(z, tg, 'spit', def.spitSpeed);
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
          if (d < def.windupRange && Math.abs(Phaser.Math.Angle.Wrap(want - z.face)) < 0.6 && !HUD.dead) {
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

    slam(z, def) {
      const fx = Math.cos(z.face), fy = Math.sin(z.face);
      const inArc = (o) => {
        const d = dist(z, o); if (d > def.slamRange + 14) return false;
        return Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(o.y - z.y, o.x - z.x) - z.face)) < def.slamArc || d < 30;
      };
      if (inArc(this.hero)) this.hurtHero(fx, fy, def.dmg);
      if (this.cage && inArc(this.cage)) this.damageCage(def.dmg);
      this.ring(z.x + fx * 50, z.y + fy * 50, 70, 0xc0c6cc);
      this.spark(z.x + fx * 60, z.y + fy * 60, 0x8a7a5a, 10);
      this.cameras.main.shake(140, 0.009);
    }

    updateBloater(z, def, dx, dy, d, dt, time) {
      if (z.mode === 'fuse') {
        z.setVelocity(0, 0); z.t -= dt;
        if (Math.floor(time / 70) % 2) z.setTint(0xff5555); else untint(z);
        if (z.t <= 0) this.explode(z);
        return;
      }
      z.setVelocity(dx / d * z.spd, dy / d * z.spd);
      if (d < def.fuseRange && !HUD.dead) this.lightFuse(z, def.fuse);
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
      z.active && z.destroy();
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

    // dmg dispatcher for anything hittable (enemies + the wild creature)
    hit(o, dmg, dir, kb, interrupt, ignoreArmor) {
      if (o.isWild) this.damageWild(o, dmg, dir, kb);
      else this.damage(o, dmg, dir, kb, interrupt, ignoreArmor);
    }

    damage(z, dmg, dir, kb, interrupt, ignoreArmor) {
      if (!z.active || z.dying) return;
      if (z.type === 'brute' && !ignoreArmor) {
        const fx = Math.cos(z.face), fy = Math.sin(z.face);
        if (dir.x * fx + dir.y * fy < -0.35) { // hit landed on its armoured front
          this.floatText(z.x, z.y - 34, 'BLOCKED', '#c0c6cc', 14);
          this.spark(z.x + fx * 22, z.y + fy * 22, 0xdfe5ea, 5);
          return;
        }
      }
      const kbm = z.type === 'brute' ? 0.15 : 1;
      z.hp -= dmg;
      if (z.mode !== 'fuse') { z.kbx = dir.x * kb * kbm; z.kby = dir.y * kb * kbm; z.kbT = 0.12; }
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
      if (HUD.dead) return;
      const h = this.hero;
      this.pickups = this.pickups.filter(p => {
        if (!p.active) return false;
        if (!p.ready) return true;
        const d = dist(p, h);
        const range = this.roomClear ? 2000 : 120;
        if (d < 22) {
          this.run.scrap++; HUD.scrapPop = 0.25; p.destroy(); return false;
        }
        if (d < range) { const sp = (this.roomClear ? 520 : 420) * dt; p.x += (h.x - p.x) / d * sp; p.y += (h.y - p.y) / d * sp; }
        return true;
      });
    }

    hitCrate(cr, dmg) {
      if (!cr.active) return;
      cr.hp -= dmg;
      flash(cr, 0xffffff); this.time.delayedCall(60, () => cr.active && untint(cr));
      if (cr.hp <= 0) {
        this.spark(cr.x, cr.y, 0x6b4a2b, 10);
        this.dropScrap(cr.x, cr.y, [2, 4]);
        cr.destroy();
      }
    }

    // ---------------------------------------------------------------- hero combat
    nearestEnemy(x, y, range, includeWild) {
      let best = null, bd = range;
      const list = kids(this.enemies).filter(z => z.active && !z.dying);
      if (includeWild && this.wild && this.wild.active && !this.wild.caged && !this.wild.fleeing) list.push(this.wild);
      list.forEach(z => { const d = Phaser.Math.Distance.Between(x, y, z.x, z.y); if (d < bd) { bd = d; best = z; } });
      return best;
    }

    meleeTargets(dir) {
      const out = [], h = this.hero, a = dir.angle();
      const list = kids(this.enemies).filter(z => z.active && !z.dying);
      if (this.wild && this.wild.active && !this.wild.caged && !this.wild.fleeing) list.push(this.wild);
      list.forEach(z => {
        const d = Phaser.Math.Distance.Between(h.x, h.y, z.x, z.y);
        const reach = T.meleeRange + (z.type === 'brute' ? 26 : 16);
        if (d > reach) return;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(z.y - h.y, z.x - h.x) - a));
        if (diff < T.meleeHalfArc || d < 30) out.push(z);
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
      const dmg = b.dmg; b.destroy();
      this.damage(z, dmg, d, T.gunKb, false, false);
      this.freeze(0.025);
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
      if (HUD.hp <= 0) this.die();
    }

    die() {
      HUD.dead = true; Ctl.twin = null;
      this.spark(this.hero.x, this.hero.y, 0x3fd0c9, 20);
      this.hero.setTint(0x555555); this.gun.setVisible(false);
      const run = this.run;
      HUD.lost = run.scrap;
      SAVE.runs++; SAVE.bestRoom = Math.max(SAVE.bestRoom, run.room - 1); writeSave();
      this.time.delayedCall(1900, () => this.endRun({ type: 'dead', room: run.room, scrap: run.scrap, caught: run.captured.length }));
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
        lx = Phaser.Math.Clamp(lx, TILE * 1.2, RW - TILE * 1.2); ly = Phaser.Math.Clamp(ly, TILE * 1.2, RH - TILE * 1.2);
        const dur = 0.28;
        hd.mode = 'pounce'; hd.t = dur; hd.vx = (lx - hd.x) / dur; hd.vy = (ly - hd.y) / dur;
        hd.body.checkCollision.none = true;
        hd.setFlipX(hd.vx < 0);
        this.tweens.add({ targets: hd, scale: 1.8, duration: dur * 500, yoyo: true, ease: 'Sine.out' });
      }
      if (i === 2) {
        if (HUD.cd2 > 0) return;
        if (this.crow) { // Spark Crow: chain lightning
          const first = this.nearestEnemy(this.crow.x, this.crow.y, 320, false);
          if (!first) { this.floatText(this.crow.x, this.crow.y - 24, 'NO TARGET', '#5fd3ff', 12); return; }
          HUD.cd2 = T.chainCd;
          const hitList = [first]; let cur = first;
          while (hitList.length < T.chainCount) {
            let nxt = null, bd = T.chainJump;
            kids(this.enemies).forEach(z => { if (z.active && !z.dying && !hitList.includes(z)) { const d = dist(z, cur); if (d < bd) { bd = d; nxt = z; } } });
            if (!nxt) break; hitList.push(nxt); cur = nxt;
          }
          let prev = this.crow;
          hitList.forEach(z => {
            this.bolt(prev.x, prev.y, z.x, z.y); prev = z;
            const d = new V(z.x - this.crow.x, z.y - this.crow.y).normalize();
            this.damage(z, T.chainDmg, d, 120, true, true);
            this.stunEnemy(z, T.chainStun);
          });
          this.freeze(0.05); this.cameras.main.shake(120, 0.006);
        } else { // Scrap Hound: howl
          HUD.cd2 = T.howlCd;
          this.ring(h.x, h.y, T.howlRadius, 0xe08a3c);
          this.ring(this.hound.x, this.hound.y, 60, 0xffd166);
          kids(this.enemies).forEach(z => {
            if (!z.active || z.dying || dist(h, z) > T.howlRadius) return;
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
      const list = kids(this.enemies).filter(z => z.active && !z.dying);
      if (this.wild && this.wild.active && !this.wild.caged && !this.wild.fleeing) list.push(this.wild);
      list.forEach(z => {
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

    // ---------------------------------------------------------------- wild creature + capture
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

    damageWild(c, dmg, dir, kb) {
      if (!c.active || c.caged || c.fleeing) return;
      c.kbx = dir.x * kb; c.kby = dir.y * kb; c.kbT = 0.1;
      flash(c, 0xffffff); this.time.delayedCall(70, () => c.active && untint(c));
      if (c.weak > 0) { this.floatText(c.x, c.y - 26, 'WEAK!', '#f2d14b', 14); return; }
      c.hp = Math.max(1, c.hp - dmg);
      this.floatText(c.x, c.y - 24, String(dmg), '#ffffff', 16);
      if (c.hp <= 3) {
        c.weak = T.weakTime; c.mode = 'wander';
        this.floatText(c.x, c.y - 40, 'WEAKENED — CAGE IT!', '#f2d14b', 15);
      }
    }

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
      if (c.weak > 0) {
        c.weak -= dt;
        if (c.weak <= 0) { c.hp = 6; this.floatText(c.x, c.y - 26, 'RECOVERED', '#5fd3ff', 13); }
      }
      if (c.mode === 'windup') {
        c.t -= dt; c.setVelocity(0, 0);
        if (c.t <= 0) { untint(c); this.spit(c, h, 'spark', 380); c.mode = 'wander'; c.zapT = Phaser.Math.FloatBetween(2.6, 3.6); }
        return;
      }
      c.wt -= dt;
      if (c.wt <= 0 || Phaser.Math.Distance.Between(c.x, c.y, c.tx, c.ty) < 12) {
        c.wt = Phaser.Math.FloatBetween(1, 2.2);
        c.tx = Phaser.Math.Clamp(c.x + Phaser.Math.Between(-220, 220), TILE * 1.5, RW - TILE * 1.5);
        c.ty = Phaser.Math.Clamp(c.y + Phaser.Math.Between(-160, 160), TILE * 1.5, RH - TILE * 1.5);
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
      if (!HUD.dead) { g.lineStyle(2, 0xffffff, 0.07); g.strokeCircle(h.x, h.y, T.meleeRange); }

      kids(this.enemies).forEach(z => {
        if (!z.active || z.mode !== 'windup') return;
        if (z.type === 'brute') {
          const p = 1 - z.t / E.brute.windup;
          g.fillStyle(0xff3b3b, 0.15 + 0.35 * p);
          g.beginPath(); g.slice(z.x, z.y, E.brute.slamRange, z.face - E.brute.slamArc, z.face + E.brute.slamArc, false); g.fillPath();
        } else if (z.type === 'spitter') {
          const tg = this.targetFor(z);
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
      kids(this.enemies).forEach(z => {
        if (z.active && z.mode === 'fuse') { g.lineStyle(2, 0xff6a3d, 0.6); g.strokeCircle(z.x, z.y, E.bloater.boomR); }
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
      if (this.extractT > 0) {
        g.lineStyle(5, 0x8ef0a0, 1); g.beginPath();
        g.arc(this.hatchPos.x, this.hatchPos.y, 52, -Math.PI / 2, -Math.PI / 2 + this.extractT * Math.PI * 2, false); g.strokePath();
      }

      if (Ctl.aim && !HUD.dead) {
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
      if (Ctl.mode === 'brawl' && !HUD.dead) {
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
  //  UI + TOUCH CONTROLS (on top of the game, not zoomed)
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
      this.mouseMode = !this.touchUI; this.mouseHeld = false;

      const S = (size, extra = {}) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 3 }, extra);
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
      this.banner = this.add.text(0, 0, '', S(40, { strokeThickness: 6, align: 'center' })).setOrigin(0.5).setAlpha(0);
      this.bannerSub = this.add.text(0, 0, '', S(16, { color: '#c9d1d9', align: 'center' })).setOrigin(0.5).setAlpha(0);
      this.over = this.add.text(0, 0, '', S(26, { align: 'center', strokeThickness: 5 })).setOrigin(0.5).setVisible(false);
      this.rotateText = this.add.text(0, 0, 'Turn your phone sideways ↻', S(22, { align: 'center' })).setOrigin(0.5).setVisible(false);
      this.deskHelp = this.add.text(0, 0, 'WASD move · mouse aim · click attack · Space / right-click dash · Q pounce · E ability 2 · F cage', S(12, { color: '#c9d1d9' })).setOrigin(0.5, 1).setAlpha(0.8);

      this.layout();
      this.scale.on('resize', this.layout, this);
      this.events.once('shutdown', () => {
        this.scale.off('resize', this.layout, this);
        Ctl.move.x = 0; Ctl.move.y = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;
      });
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
      };
      const fs = n => Math.max(10, Math.round(u * n)) + 'px';
      this.topText.setPosition(w / 2, u * 0.035).setFontSize(fs(0.042));
      this.cageText.setPosition(u * 0.265, u * 0.14).setFontSize(fs(0.028));
      this.modeText.setPosition(this.B.mode.x, this.B.mode.y).setFontSize(fs(0.032));
      for (const k of ['atk', 'dash', 'a1', 'a2', 'cap']) this.lbl[k].setPosition(this.B[k].x, this.B[k].y + this.B[k].r + u * 0.025).setFontSize(fs(k === 'atk' || k === 'cap' ? 0.03 : 0.026));
      this.banner.setPosition(w / 2, h * 0.28).setFontSize(fs(0.085));
      this.bannerSub.setPosition(w / 2, h * 0.28 + u * 0.08).setFontSize(fs(0.035));
      this.over.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.rotateText.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.deskHelp.setPosition(w / 2, h - 10).setFontSize(fs(0.024));
    }

    inRect(x, y, r) { return Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2; }
    near(x, y, b, mult) { return Math.hypot(x - b.x, y - b.y) < b.r * mult; }

    mouseDir() {
      const gs = this.scene.get('game');
      if (!gs || !gs.hero || !gs.hero.active || !gs.cameras || !gs.cameras.main) return null;
      const p = this.input.activePointer;
      const wp = gs.cameras.main.getWorldPoint(p.x, p.y);
      const v = new V(wp.x - gs.hero.x, wp.y - gs.hero.y - 6);
      return v.lengthSq() > 4 ? v.normalize() : null;
    }

    down(p) {
      if (p.wasTouch) { this.touchUI = true; this.mouseMode = false; } else if (!this.touchUI) this.mouseMode = true;
      if (HUD.dead || Ctl.blocked) return;
      const B = this.B;
      if (this.inRect(p.x, p.y, B.mode) || this.near(p.x, p.y, B.fs, 1.4) || this.near(p.x, p.y, B.exit, 1.4)) return;
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

    up(p) {
      const B = this.B;
      if (this.inRect(p.downX, p.downY, B.mode) && this.inRect(p.x, p.y, B.mode)) { Ctl.mode = Ctl.mode === 'brawl' ? 'twin' : 'brawl'; Ctl.twin = null; return; }
      if (this.near(p.downX, p.downY, B.exit, 1.4) && this.near(p.x, p.y, B.exit, 1.4)) {
        // two taps to leave, so a stray tap doesn't throw away the run
        if (this.exitArmed > 0) Ctl.queue.push({ type: 'abandon' });
        else { this.exitArmed = 2.5; HUD.banner = { text: 'LEAVE THE RUN?', sub: 'Tap ✕ again to abandon (you lose this run\'s loot)', t: 2.5 }; }
        return;
      }
      if (this.near(p.downX, p.downY, B.fs, 1.4) && this.near(p.x, p.y, B.fs, 1.4)) {
        try { this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(); } catch (e) {}
        return;
      }
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
      this.exitArmed = Math.max(0, (this.exitArmed || 0) - dt);
      const portrait = this.touchUI && h > w;
      Ctl.blocked = portrait;
      this.rotateText.setVisible(portrait);
      if (portrait) { g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, w, h); }

      if (this.mouseMode && !this.touchUI && !HUD.dead) {
        const dir = this.mouseDir();
        Ctl.aim = dir;
        if (this.mouseHeld && Ctl.mode === 'twin') Ctl.twin = { dir };
      }

      // top bar: exit, fullscreen, hearts, cages
      const ex = B.exit, q = ex.r * 0.5;
      g.lineStyle(3, 0xffffff, 0.6);
      g.lineBetween(ex.x - q, ex.y - q, ex.x + q, ex.y + q); g.lineBetween(ex.x + q, ex.y - q, ex.x - q, ex.y + q);
      const f = B.fs; g.lineStyle(2, 0xffffff, 0.6); g.strokeRect(f.x - f.r * 0.6, f.y - f.r * 0.6, f.r * 1.2, f.r * 1.2);
      for (let i = 0; i < T.heroHp; i++) {
        const x = u * 0.28 + i * u * 0.06, y = u * 0.075, r = u * 0.022;
        if (i < HUD.hp) { g.fillStyle(0xff4d6d, 1); g.fillCircle(x, y, r); }
        g.lineStyle(2, 0x000000, 0.8); g.strokeCircle(x, y, r);
      }
      this.cageText.setText(`CAGES ×${HUD.cages ?? 0}`);
      HUD.scrapPop = Math.max(0, (HUD.scrapPop || 0) - dt);
      this.topText.setText(`ROOM ${HUD.room}/${T.rooms}   ·   ⚙ ${HUD.scrap ?? 0}`).setScale(1 + (HUD.scrapPop || 0) * 0.6);

      const m = B.mode;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      g.lineStyle(2, 0xffffff, 0.35); g.strokeRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      this.modeText.setText(Ctl.mode === 'brawl' ? 'MODE: TAP / DRAG  ⇄' : 'MODE: TWIN-STICK  ⇄');

      const showTouch = this.touchUI && !portrait;
      for (const k in this.lbl) this.lbl[k].setVisible(showTouch);
      this.lbl.a1.setText(HUD.ab1Label || 'POUNCE');
      this.lbl.a2.setText(HUD.ab2Label || 'HOWL');
      this.deskHelp.setVisible(!this.touchUI);
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
      } else if (HUD.canCapture && !this.touchUI) {
        HUD.deskCapHint = true;
      }

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

      if (HUD.dead) {
        g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, w, h);
        this.over.setVisible(true).setText(`YOU DIED\nLost ${HUD.lost || 0} scrap`);
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
    scene: [MenuScene, GameScene, UIScene],
  });
}