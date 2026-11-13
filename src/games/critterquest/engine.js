// Critter Quest — game engine.
// startGame(rootElement, { dev }) boots the game inside the markup from CritterQuest.jsx
// and returns a cleanup function (safe with React StrictMode double-mounting).

import { buildArt, hash, T } from './art.js';
import {
  SPECIES, MOVES, STARTERS, ENCOUNTERS, TYPE_COLORS, GATE_LEVEL, TEAM_MAX, LEVEL_CAP,
  FAMILY, SHINY, SHINY_ORDER, SHINY_TRADE_COST, SHINY_ATTACK_BONUS, XP_SHARE, SNACK_HEAL, GYMS, AREAS, TOWNS,
  LEGENDS, CANDY, MEGA_POD, TRAINERS, RIVAL, effectiveness, moveSub, xpNeed, applyStats, makeCritter, grownForm, evolveTarget,
} from './data.js';

const SAVE_KEY = 'critterquest.save.v1';
const AW = 32, AH = 24, TH = 16;                       // area width, area height, town height (tiles)
const VW = 15, VH = 10, MW = AREAS.length * AW, MH = AH + TH, STEP = 170;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ME_POS = { x: 66, y: 103 }, FOE_POS = { x: 184, y: 61 };
const CHOOSE_X = [48, 120, 192];
const STAGE_CAP = { atk: 3, def: 3, eva: 2 };
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const rand = n => Math.floor(Math.random() * n);
const nm = c => SPECIES[c.sp].name;
const shinyCfg = c => (c.shiny && FAMILY[c.sp] ? SHINY[FAMILY[c.sp]] : null);

export function startGame(root, { dev = false } = {}) {
  let dead = false;
  const q = n => root.querySelector(`[data-cq="${n}"]`);
  const cv = q('canvas'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const screenEl = root.querySelector('.cq-screen');
  const textbox = q('textbox'), msgEl = q('msg'), menuEl = q('menu'), moreEl = q('more');
  const enemyBox = q('enemyBox'), playerBox = q('playerBox'), banner = q('banner');
  const panel = q('panel'), panelGrid = q('panelGrid'), panelTitle = q('panelTitle');
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { KID, sprites, TILES, HOUSES, GYM_IMG, LEADERS, LEGEND_VOLCANO, LEGEND_SPOTS, BG, spriteURL } = buildArt(SPECIES, GYMS);

  /* ============ timing helpers (they freeze once the game is torn down) ============ */
  const wait = ms => new Promise(r => setTimeout(() => { if (!dead) r(); }, ms));
  function tween(ms, fn, ease = t => t) {
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (dead) return;
        const t = Math.min(1, (now - t0) / ms);
        fn(ease(t));
        t < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }

  /* ============ map ============ */
  // Areas run left to right (AREAS in data.js), each AW tiles wide and AH tall.
  // A town, if the area has one, sits right below it (TH tall). Everything below the meadow is woods.
  const SIGNS = {}, DOORS = {}, GATES = {}, BUILDINGS = [], TOWN_AT = {}, BUS = {}, NPCS = {};
  const map = [];
  (function buildMap() {
    for (let y = 0; y < MH; y++) map.push(Array(MW).fill('.'));
    const set = (x, y, ch) => { if (x >= 0 && y >= 0 && x < MW && y < MH) map[y][x] = ch; };
    const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
    const sign = (x, y, lines) => { SIGNS[x + ',' + y] = lines; };
    // altImg: drawn instead once that spot's legendary is caught (the raven leaves its tree)
    const building = (x, y, img, door, altImg) => {
      BUILDINGS.push({ x, y, img, altImg, legend: door?.legend });
      rect(x, y, x + img.width / T - 1, y + img.height / T - 1, 'h');
      if (door) DOORS[door.x + ',' + door.y] = door;
    };
    const WALL = { meadow: 'T', mountains: 'M', forest: 'Y', volcano: 'X', prehistoric: 'Z' };
// Each town is built from its biome: its ground, its trees, and its little decorations.
const TOWN_LOOK = {
  meadow:      { ground: '.', tree: 'T', deco: '*' },
  mountains:   { ground: 'r', tree: 'M', deco: 'P' },
  forest:      { ground: 'F', tree: 'Y', deco: 'o' },
  volcano:     { ground: 'K', tree: 'X', deco: 'L' },
  prehistoric: { ground: 'j', tree: 'Z', deco: 'b' },
};

    AREAS.forEach((area, i) => {
      const ox = i * AW, L = (x, y, ch) => set(ox + x, y, ch), R = (x0, y0, x1, y1, ch) => rect(ox + x0, y0, ox + x1, y1, ch);
      if (area.kind === 'meadow') {
        [[9,2],[13,6],[3,8],[10,7],[24,10],[18,11],[6,11],[13,18],[20,15],[8,21],[22,22],[2,4]].forEach(([x, y]) => L(x, y, '*'));
        R(20, 2, 29, 7, ',');            // North Meadow
        R(3, 13, 10, 19, ',');           // Fox Hollow
        for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++)
          if (((x - 25) / 3.6) ** 2 + ((y - 16) / 2.6) ** 2 <= 1) L(x, y, '~');
        R(5, 6, 5, 9, '='); R(5, 9, 30, 9, '='); R(15, 9, 15, 21, '='); R(11, 16, 14, 16, '=');
        [[11,3],[12,3],[11,4],[2,10],[9,11],[12,12],[16,14],[17,14],[16,15],[19,18],[21,20],[22,20],[28,11],[26,21],[27,21],[2,21],[29,20],[17,3]]
          .forEach(([x, y]) => L(x, y, 'T'));
        building(ox + 3, 2, HOUSES.red, { x: ox + 5, y: 5, type: 'home' });
        building(ox + 2, 20, LEGEND_SPOTS.treeWithRaven, { x: ox + 2, y: 21, type: 'legend', legend: 'psyraven' }, LEGEND_SPOTS.tree);
        sign(ox + 7, 7, ['MAPLE HILL', 'Home of brave kids and their critter partners.']);
        sign(ox + 13, 7, ['TYPE TIPS', 'WATER beats FIRE. FIRE beats GRASS.', 'GRASS beats WATER. ELECTRIC beats FLYING.', 'FLYING beats GRASS. FIGHTING smashes ROCK and STEEL!']);
        sign(ox + 19, 8, ['NORTH MEADOW', 'Rabbits and bluebirds live here. All below Lv 10.']);
        sign(ox + 11, 15, ['FOX HOLLOW', 'Watch out! Foxes like the grass over here.']);
      } else if (area.kind === 'mountains') {
        R(0, 0, AW - 1, AH - 1, 'r');
        R(3, 2, 10, 6, ';'); R(16, 2, 21, 7, ';'); R(17, 11, 23, 16, ';'); R(3, 14, 11, 20, ';'); R(24, 3, 29, 7, ';'); R(23, 18, 29, 21, ';');
        R(0, 9, AW - 1, 9, '='); R(15, 9, 15, AH - 1, '=');
        [[2,7],[7,11],[18,8],[12,18],[2,21],[21,20],[9,8],[12,5],[26,11],[28,15]].forEach(([x, y]) => L(x, y, 'M'));
        [[1,2],[1,3],[5,10],[10,12],[20,10],[3,12],[17,19],[8,22],[6,1],[22,2],[1,16],[27,8],[25,13]].forEach(([x, y]) => L(x, y, 'P'));
        sign(ox + 2, 10, ['ROCKALOCK sightings reported!', 'Giant boulders with arms and legs. Rare, and tough to catch.']);
      } else if (area.kind === 'forest') {
        R(0, 0, AW - 1, AH - 1, 'F');
        R(2, 2, 10, 7, 'u'); R(19, 2, 28, 7, 'u'); R(2, 12, 12, 20, 'u'); R(18, 12, 28, 20, 'u');
        R(0, 9, AW - 1, 9, '='); R(15, 9, 15, AH - 1, '=');
        [[13,3],[14,4],[17,11],[13,14],[17,18],[6,10],[24,10],[11,2],[30,14],[1,22],[29,22],[22,22],[8,22],[13,21],[18,4]].forEach(([x, y]) => L(x, y, 'Y'));
        [[16,6],[12,11],[20,10],[4,22],[26,23 - 1]].forEach(([x, y]) => L(x, y, 'o'));
        sign(ox + 16, 10, [area.name, 'Critters here are Lv 20 to 30. KOMODOS, SNAPLINGS... and a rare HAMMERFOX!']);
        building(ox + 22, 16, LEGEND_SPOTS.shrine, { x: ox + 22, y: 17, type: 'legend', legend: 'saberstag' });
      } else if (area.kind === 'volcano') {
        R(0, 0, AW - 1, AH - 1, 'K');
        R(10, 2, 14, 6, 'e'); R(20, 2, 28, 6, 'e'); R(2, 11, 8, 15, 'e'); R(21, 11, 28, 14, 'e'); R(9, 17, 13, 21, 'e');
        const pool = (cx, cy, rx, ry) => { for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) L(x, y, 'L'); };
        pool(6, 4, 3, 2); pool(26, 18, 3.5, 2.5); pool(4, 19, 2.5, 2);
        R(0, 9, AW - 1, 9, '='); R(15, 9, 15, AH - 1, '=');
        [[3,7],[12,11],[24,8],[29,10],[8,22],[20,21],[2,2],[18,18],[22,16]].forEach(([x, y]) => L(x, y, 'X'));
        // the legendary's volcano sits in the middle; its glowing cave is the way in
        building(ox + 17, 12, LEGEND_VOLCANO, { x: ox + 18, y: 14, type: 'legend', legend: 'pyrolion' });
        sign(ox + 16, 10, [area.name, 'Critters here are Lv 40 to 49.', `Legend says a giant flaming lion sleeps in the big volcano...`]);
      } else if (area.kind === 'prehistoric') {
        R(0, 0, AW - 1, AH - 1, 'j');
        R(2, 2, 9, 7, 'n'); R(19, 2, 28, 7, 'n'); R(2, 11, 10, 15, 'n'); R(23, 11, 29, 15, 'n'); R(4, 18, 12, 21, 'n'); R(19, 18, 27, 21, 'n');
        const tar = (cx, cy, rx, ry) => { for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) L(x, y, 'w'); };
        tar(13, 4, 2, 1.4); tar(28, 18, 1.6, 1.6);
        R(0, 9, AW - 1, 9, '='); R(15, 9, 15, AH - 1, '=');
        [[11,2],[17,3],[1,9 - 1],[12,12],[22,13],[16,20],[3,22],[29,8],[13,21],[25,22],[30,12]].forEach(([x, y]) => L(x, y, 'Z'));
        [[11,7],[21,10],[6,17],[27,16]].forEach(([x, y]) => L(x, y, 'b'));
        // the T-rex bones lie in the middle; IRONREX waits there
        building(ox + 17, 12, LEGEND_SPOTS.bones, { x: ox + 18, y: 13, type: 'legend', legend: 'ironrex' }, LEGEND_SPOTS.bonesQuiet);
        sign(ox + 16, 10, [area.name, 'Dinosaur critters, Lv 52 to 62.', 'Legend says a T-REX OF STEEL guards the giant bones...']);
        sign(ox + 14, 10, ['ICE TIPS', 'ICE beats GRASS and FLYING.', 'But FIRE melts ICE!']);
      }
      // edges: walls all round, with openings for the path in, the gate out, and the trail down to the town
      const wall = WALL[area.kind];
      for (let x = 0; x < AW; x++) { L(x, 0, wall); L(x, AH - 1, wall); }
      for (let y = 0; y < AH; y++) { L(0, y, wall); L(AW - 1, y, wall); }
      if (i > 0) L(0, 9, '=');
      const next = AREAS[i + 1];
      if (next) {
        L(AW - 1, 9, 'G'); GATES[(ox + AW - 1) + ',9'] = i + 1;
        sign(ox + AW - 2, 8, next.gateSign);
      }
      if (area.town) { L(15, AH - 1, '='); buildTown(ox, TOWNS[area.town], area.town, area.kind); }
    });

    function buildTown(ox, town, id, kind) {
      const oy = AH, L = (x, y, ch) => set(ox + x, oy + y, ch), R = (x0, y0, x1, y1, ch) => rect(ox + x0, oy + y0, ox + x1, oy + y1, ch);
      const look = TOWN_LOOK[kind] || TOWN_LOOK.meadow;
      R(0, 0, AW - 1, TH - 1, look.ground);
      R(15, 0, 15, 7, '='); R(3, 7, 28, 7, '=');          // trail in, main road
      R(9, 7, 9, 13, '='); R(9, 13, 15, 13, '=');         // path round to the gym door
      [[10,4],[11,5],[19,4],[20,5],[6,9],[25,9],[13,14],[18,14],[27,13],[3,13]].forEach(([x, y]) => L(x, y, look.deco));
      [[2,1],[2,2],[29,1],[29,2],[12,1],[19,1],[27,10],[28,10],[4,11],[5,12],[22,12],[24,11],[29,14]].forEach(([x, y]) => L(x, y, look.tree));
      building(ox + 3, oy + 3, HOUSES.blue, { x: ox + 5, y: oy + 6, type: 'trader', town: id });
      building(ox + 22, oy + 3, HOUSES[town.restRoof] || HOUSES.green, { x: ox + 24, y: oy + 6, type: 'rest', town: id });
      if (town.gym) building(ox + 11, oy + 8, GYM_IMG[town.gymStyle] || GYM_IMG.stone, { x: ox + 15, y: oy + 12, type: 'gym', town: id });
      else [[12,10],[14,9],[17,10],[19,9]].forEach(([x, y]) => L(x, y, 'b'));   // just bones where the gym will go
      sign(ox + 16, oy + 1, [town.name, town.tagline]);
      L(14, 1, 'U'); BUS[(ox + 14) + ',' + (oy + 1)] = id;                   // bus stop by the trail into town
      if (town.statue) building(ox + 25, oy + 11, LEGEND_SPOTS.statue, { x: ox + 25, y: oy + 12, type: 'legend', legend: town.statue });
      sign(ox + 8, oy + 6, ['SHINY TRADER', `Trade ${SHINY_TRADE_COST} of the same critter, get 1 SHINY one!`]);
      sign(ox + 21, oy + 6, [town.rest, 'Free naps for tired critters.']);
      const gym = GYMS[town.gym];
      if (gym) sign(ox + 16, oy + 13, [gym.hall, `Leader: ${gym.short}. Win the ${gym.badge}!`]);
      else sign(ox + 16, oy + 13, ['GYM: COMING SOON!', 'A new leader is on the way. Check back later!']);
      for (let x = 0; x < AW; x++) L(x, TH - 1, look.tree);
      for (let y = 0; y < TH; y++) { L(0, y, look.tree); L(AW - 1, y, look.tree); }
      TOWN_AT[ox] = { id, rest: { x: ox + 24, y: oy + 7 }, bus: { x: ox + 15, y: oy + 2 } };
    }
    for (const k of Object.keys(SIGNS)) { const [x, y] = k.split(',').map(Number); set(x, y, 'S'); }
    for (const k of Object.keys(DOORS)) { const [x, y] = k.split(',').map(Number); set(x, y, 'D'); }
    // trainers stand on their spot (you can't walk through them)
    for (const [id, t] of Object.entries(TRAINERS)) {
      const ai = AREAS.findIndex(a => a.id === t.area);
      if (ai >= 0) { set(ai * AW + t.x, t.y, 'N'); NPCS[(ai * AW + t.x) + ',' + t.y] = id; }
    }
    // areas with no town get solid woods below them
    AREAS.forEach((a, i) => { if (!a.town && a.kind !== 'meadow') rect(i * AW, AH, i * AW + AW - 1, MH - 1, 'T'); });
  })();
  function tileAt(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH ? 'T' : map[y][x]; }
  const areaIndex = x => Math.max(0, Math.min(AREAS.length - 1, Math.floor(x / AW)));
  const areaAt = x => AREAS[areaIndex(x)];
  function gateOpenFor(i) {
    const g = AREAS[i]?.gate;
    if (!g) return true;
    if (g.level) return party.some(c => c.lv > g.level);
    if (g.badge) return !!flags.badges?.[g.badge];
    return true;
  }
  const gateAt = (x, y) => GATES[x + ',' + y];
  function walkable(x, y) {
    const t = tileAt(x, y);
    if (t === 'G') return gateOpenFor(gateAt(x, y));
    return !'T~hDSMPYLXUZwbN'.includes(t);
  }
  const inTown = y => y >= AH;
  const townHere = (x, y) => (inTown(y) ? TOWN_AT[areaIndex(x) * AW] : null);

  /* ============ state ============ */
  let party = [];                 // up to 6 critters; party[0] is your lead and walks with you
  let bag = { snack: 3, pod: 5, mega: 0, candy: 0 };
  let box = [];                   // extra critters, kept at home and in rest huts (they don't earn XP)
  let flags = { badges: {}, seen: {} };   // badges won, places visited
  let ai = 0;                     // which party member is battling
  let F = null;                   // the critter you're fighting
  let trainer = null;             // set during a gym or trainer battle
  const A = () => party[ai];
  const player = { x: 5, y: 6, face: 'down', moving: false, t: 0, from: null, to: null, steps: 0 };
  const pal = { x: 6, y: 6, faceLeft: true, moving: false, from: null, to: null };
  let mode = 'busy';              // 'world' = free to walk; 'busy' = something scripted is happening
  let scene = 'choose';           // choose | world | battle | evolve
  let battleBg = BG.meadow;
  let stepsSince = 0, bang = false, chooseIdx = 0;
  const overlay = { flash: 0, bars: 0, fade: 0, blue: 0, slice: 0, sliceLine: 0 };
  const sliceBuf = document.createElement('canvas'); sliceBuf.width = 240; sliceBuf.height = 160;
  const sliceCtx = sliceBuf.getContext('2d');
  const B = { me: {}, foe: {}, leader: {}, shake: 0, proj: null, pod: null, sparkle: 0 };
  const E = { sp: null, white: false, shiny: null };
  function resetBattleSprites() {
    B.me = { x: 0, y: 0, flash: false, alpha: 1, vis: true };
    B.foe = { x: 0, y: 0, flash: false, alpha: 1, vis: true, scale: 1 };
    B.leader = { x: 0, vis: false };
    B.shake = 0; B.proj = null; B.pod = null; B.sparkle = 0; B.beam = null;
    overlay.blue = 0; overlay.slice = 0; overlay.sliceLine = 0;
    B.dealt = new Set();            // team critters that did damage this fight
  }
  resetBattleSprites();
  const levelCap = () => Math.max(LEVEL_CAP.start, ...Object.keys(flags.badges || {}).map(b => LEVEL_CAP[b] || 0));
  const shinyChance = fam => 1 / SHINY[fam].oneIn;
  const plainOf = fam => [...party, ...box].filter(c => FAMILY[c.sp] === fam && !c.shiny).map(c => ({ c }));
  const badgeCount = () => Object.keys(flags.badges || {}).length;
  const snackPct = () => SNACK_HEAL.base + SNACK_HEAL.perBadge * badgeCount();
  const bonusPct = Math.round((SHINY_ATTACK_BONUS - 1) * 100);

  /* ============ saving (this browser only) ============ */
  function save() {
    if (!party.length) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, party: party.map(c => ({ sp: c.sp, lv: c.lv, xp: c.xp, hp: c.hp, shiny: !!c.shiny })),
        box: box.map(c => ({ sp: c.sp, lv: c.lv, xp: c.xp, hp: c.hp, shiny: !!c.shiny })),
        bag, flags, pos: { x: player.x, y: player.y, face: player.face },
      }));
    } catch (_) { /* storage blocked: the game still works, it just won't remember */ }
  }
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      return d && d.v === 1 && Array.isArray(d.party) && d.party.some(p => SPECIES[p.sp]) ? d : null;
    } catch (_) { return null; }
  }
  function restore(d) {
    const revive = p => {
      const c = makeCritter(p.sp, p.lv, !!p.shiny);
      c.xp = Math.max(0, Math.min(p.xp || 0, c.xpNext - 1)); c.shownXp = c.xp;
      c.hp = Math.max(0, Math.min(c.maxHp, p.hp ?? c.maxHp)); c.shownHp = c.hp;
      return c;
    };
    const team = d.party.filter(p => SPECIES[p.sp]).map(revive);
    party = team.slice(0, TEAM_MAX);
    box = [...team.slice(TEAM_MAX), ...(d.box || []).filter(p => SPECIES[p.sp]).map(revive)];
    // older saves: hand out the mega pods they would have won already
    const wins = Object.keys(d.flags?.candy || {}).length;
    bag = { snack: d.bag?.snack ?? 3, pod: d.bag?.pod ?? 5, mega: d.bag?.mega ?? wins * MEGA_POD.perWin, candy: d.bag?.candy ?? 0 };
    flags = { badges: {}, seen: {}, ...(d.flags || {}) };
    delete flags.luck;   // the old bunny-luck system from v0.4/0.5
    if (flags.badge) { flags.badges = { ...flags.badges, pebble: true }; delete flags.badge; }   // saves from v0.4
    const p = d.pos || {};
    if (walkable(p.x, p.y)) Object.assign(player, { x: p.x, y: p.y, face: p.face || 'down' });
    placePal();
  }
  function placePal() {
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [player.x + dx, player.y + dy]).find(([x, y]) => walkable(x, y))
      || [player.x, player.y];
    Object.assign(pal, { x: spot[0], y: spot[1], moving: false, faceLeft: spot[0] > player.x });
  }

  /* ============ textbox + menus ============ */
  let sayState = null, menuState = null;
  function showTextbox(layout) { textbox.hidden = false; textbox.dataset.layout = layout; }
  function hideTextbox() { textbox.hidden = true; menuEl.hidden = true; moreEl.hidden = true; }
  function say(text) {
    return new Promise(res => {
      showTextbox('msg'); menuEl.hidden = true; moreEl.hidden = true;
      sayState = { res, text, typing: true, timer: null };
      if (RM) { finishTyping(); return; }
      let i = 0; msgEl.textContent = '';
      sayState.timer = setInterval(() => { i++; msgEl.textContent = text.slice(0, i); if (i >= text.length) finishTyping(); }, 24);
    });
  }
  function finishTyping() { clearInterval(sayState.timer); msgEl.textContent = sayState.text; sayState.typing = false; moreEl.hidden = false; }
  function advanceSay() {
    if (!sayState) return;
    if (sayState.typing) { finishTyping(); return; }
    const r = sayState.res; sayState = null; moreEl.hidden = true; r();
  }
  function optButton(it) {
    const b = document.createElement('button');
    b.className = 'cq-opt' + (it.locked ? ' is-locked' : '');
    const n = document.createElement('span'); n.className = 'cq-opt-name'; n.textContent = it.label; b.append(n);
    if (it.moveType) {      // a move: its type pill, then POW and accuracy (— = can't miss)
      b.classList.add('cq-opt-move');
      const s = document.createElement('span'); s.className = 'cq-opt-sub';
      s.innerHTML = `<span class="cq-type" style="background:${TYPE_COLORS[it.moveType]}">${it.moveType}</span> `;
      s.append(it.sub); b.append(s);
    } else if (it.sub) { const s = document.createElement('span'); s.className = 'cq-opt-sub'; s.textContent = it.sub; b.append(s); }
    return b;
  }
  // Generic picker: a list of options in the textbox, or (panelMode) the full-screen card panel.
  function chooseMenu(items, { layout = 'side', canBack = false, prompt = '', cols = 2, start = 0, onChange = null, panelMode = false, title = '' } = {}) {
    return new Promise(res => {
      let box;
      if (panelMode) { textbox.hidden = true; panel.hidden = false; panelTitle.textContent = title; box = panelGrid; }
      else { showTextbox(layout); moreEl.hidden = true; msgEl.textContent = prompt; box = menuEl; }
      box.innerHTML = '';
      box.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      items.forEach((it, i) => {
        const b = it.node || optButton(it);
        b.type = 'button'; b.tabIndex = -1;
        b.addEventListener('pointerdown', e => e.preventDefault());
        b.addEventListener('pointerenter', () => { if (menuState) { menuState.index = i; paintMenu(); } });
        b.addEventListener('click', () => pick(i));
        box.appendChild(b);
      });
      menuState = { items, index: Math.min(start, items.length - 1), res, canBack, cols, onChange, box, panelMode };
      if (!panelMode) menuEl.hidden = false;
      paintMenu();
    });
  }
  function paintMenu() {
    [...menuState.box.children].forEach((b, i) => b.classList.toggle('is-sel', i === menuState.index));
    if (menuState.onChange) menuState.onChange(menuState.index);
  }
  function pick(i) {
    if (!menuState) return;
    const { res, panelMode } = menuState;
    menuState = null;
    if (panelMode) panel.hidden = true; else menuEl.hidden = true;
    res(i);
  }
  function navMenu(dir) {
    const n = menuState.items.length, cols = menuState.cols; let i = menuState.index;
    if (dir === 'left' && i % cols) i--;
    if (dir === 'right' && i % cols < cols - 1 && i + 1 < n) i++;
    if (dir === 'up' && i - cols >= 0) i -= cols;
    if (dir === 'down' && i + cols < n) i += cols;
    menuState.index = i; paintMenu();
  }
  const typePills = types => types.map(t => `<span class="cq-type" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('');
  const nameHTML = c => (c.shiny ? '<span class="cq-shiny">★</span>' : '') + nm(c);
  function teamCard(c, tag, compact = false) {
    const b = document.createElement('button');
    b.className = 'cq-card' + (compact ? ' cq-card-luck' : '') + (c.hp <= 0 ? ' is-out' : '');
    const f = Math.max(0, c.hp / c.maxHp);
    b.innerHTML = `
      <img alt="" src="${spriteURL(c.sp, shinyCfg(c))}">
      <span class="cq-card-body">
        <span class="cq-card-top"><b>${nameHTML(c)}</b><small>Lv ${c.lv}</small></span>
        <span class="cq-types">${typePills(SPECIES[c.sp].types)}</span>
        <span class="cq-card-hp"><span class="cq-track"><span class="cq-fill" data-level="${f > 0.5 ? 'hi' : f > 0.2 ? 'mid' : 'lo'}" style="width:${f * 100}%"></span></span><small>${c.hp}/${c.maxHp}</small></span>
      </span>${tag ? `<span class="cq-tag">${tag}</span>` : ''}`;
    return b;
  }
  function pickTeam({ title, forced = false, battleIdx = -1, list = null }) {
    const members = list || party.map((c, i) => ({ c, i }));
    const items = members.map(({ c, i }) => ({ node: teamCard(c, i === battleIdx ? 'BATTLING' : battleIdx < 0 && i === 0 && !list ? 'LEAD' : '') }));
    return chooseMenu(items, { panelMode: true, cols: 2, canBack: !forced, title, start: Math.max(0, battleIdx) });
  }
  // Shiny cards: the shiny sprite, dots for how many plain ones you carry (3 = ready to trade), and wild odds.
  function shinyCard(fam) {
    const b = document.createElement('button');
    b.className = 'cq-card cq-card-luck';
    const have = plainOf(fam).length, dots = Math.min(have, SHINY_TRADE_COST);
    const meter = '●'.repeat(dots) + '○'.repeat(SHINY_TRADE_COST - dots);
    b.innerHTML = `
      <img alt="" src="${spriteURL(fam, SHINY[fam])}">
      <span class="cq-card-body">
        <span class="cq-card-top"><b>${SPECIES[fam].name}</b>${have >= SHINY_TRADE_COST ? '<small class="cq-ready">READY!</small>' : ''}</span>
        <span class="cq-luck">${meter}</span>
        <span class="cq-odds">Wild: 1 in ${SHINY[fam].oneIn}</span>
      </span>`;
    return b;
  }

  /* ============ input ============ */
  const dirStack = [];
  function holdDir(d, on) { const i = dirStack.indexOf(d); if (i >= 0) dirStack.splice(i, 1); if (on) dirStack.push(d); }
  const heldDir = () => dirStack[dirStack.length - 1];
  function press(btn) {
    if (btn === 'a') {
      if (menuState) return pick(menuState.index);
      if (sayState) return advanceSay();
      if (mode === 'world' && !player.moving) interact();
    } else if (btn === 'b') {
      if (menuState && menuState.canBack) return pick(-1);
      if (sayState) return advanceSay();
      if (mode === 'world' && !player.moving) openWorldMenu();
    } else {
      if (menuState) return navMenu(btn);
      if (mode === 'world' && !player.moving && !sayState) tryMove(btn, true);
    }
  }
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right', z: 'a', Z: 'a', ' ': 'a', Enter: 'a', x: 'b', X: 'b', Escape: 'b', Backspace: 'b' };
  const typing = e => e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
  function onKeyDown(e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = KEYMAP[e.key]; if (!k) return;
    e.preventDefault();
    if (DIRS[k]) holdDir(k, true);
    if (!e.repeat) press(k);
  }
  function onKeyUp(e) { const k = KEYMAP[e.key]; if (k && DIRS[k]) holdDir(k, false); }
  function onBlur() { dirStack.length = 0; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  const padCleanups = [];
  root.querySelectorAll('[data-btn]').forEach(el => {
    const k = el.dataset.btn;
    const up = () => { el.classList.remove('is-on'); if (DIRS[k]) holdDir(k, false); };
    const down = e => {
      e.preventDefault(); el.classList.add('is-on');
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* not supported */ }
      if (DIRS[k]) holdDir(k, true);
      press(k);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    padCleanups.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up); });
  });

  /* ============ world ============ */
  function tryMove(d, fromPress = false) {
    player.face = d;
    const [dx, dy] = DIRS[d], nx = player.x + dx, ny = player.y + dy;
    if (!walkable(nx, ny)) {
      if (fromPress && tileAt(nx, ny) === 'G') gateMessage(nx, ny);
      return;
    }
    player.from = { x: player.x, y: player.y }; player.to = { x: nx, y: ny };
    player.t = 0; player.moving = true; player.steps++;
    if (pal.x !== player.x || pal.y !== player.y) {
      pal.from = { x: pal.x, y: pal.y }; pal.to = { x: player.x, y: player.y }; pal.moving = true;
      if (pal.to.x > pal.from.x) pal.faceLeft = false; else if (pal.to.x < pal.from.x) pal.faceLeft = true;
    }
  }
  function finishStep() {
    player.x = player.to.x; player.y = player.to.y; player.moving = false;
    if (pal.moving) { pal.x = pal.to.x; pal.y = pal.to.y; pal.moving = false; }
    stepsSince++;
    const area = areaAt(player.x), town = townHere(player.x, player.y);
    if (town && !flags.bus?.[town.id]) { flags.bus = { ...(flags.bus || {}), [town.id]: true }; save(); }
    const placeKey = town ? 'town:' + town.id : 'area:' + area.id;
    const welcome = town ? TOWNS[town.id].welcome : area.welcome;
    if (welcome && !flags.seen[placeKey]) {
      flags.seen = { ...flags.seen, [placeKey]: true }; save();
      worldSay(welcome);
      return;
    }
    const t = tileAt(player.x, player.y);
    if ((t === ',' || t === ';' || t === 'u' || t === 'e' || t === 'n') && stepsSince > 2 && Math.random() < 0.2) { startBattle(); return; }
    const d = heldDir(); if (d && mode === 'world') tryMove(d);
  }
  function update(dt) {
    if (player.moving) { player.t += dt / STEP; if (player.t >= 1) { player.t = 1; finishStep(); } }
    else if (mode === 'world' && !sayState && !menuState) { const d = heldDir(); if (d) tryMove(d); }
  }
  async function worldSay(lines) {
    mode = 'busy';
    for (const l of lines) await say(l);
    hideTextbox(); mode = 'world';
  }
  function gateMessage(x, y) {
    const i = gateAt(x, y);
    if (i === undefined || gateOpenFor(i)) return;
    const g = AREAS[i].gate;
    worldSay(g.level
      ? [`The gate to the ${AREAS[i].name} is locked.`, `Get a critter past Lv ${g.level} and it will open!`]
      : [`The gate to the ${AREAS[i].name} is locked.`, `Beat the ${GYMS[g.badge].hall} to open it!`]);
  }
  function interact() {
    const [dx, dy] = DIRS[player.face], tx = player.x + dx, ty = player.y + dy, t = tileAt(tx, ty);
    const lead = party[0];
    if (t === 'S') worldSay(SIGNS[tx + ',' + ty]);
    else if (t === 'G') gateMessage(tx, ty);
    else if (t === 'D') {
      const door = DOORS[tx + ',' + ty];
      if (door.type === 'home' || door.type === 'rest') restAt(door);
      else if (door.type === 'trader') traderVisit();
      else if (door.type === 'gym') gymVisit(TOWNS[door.town].gym);
      else if (door.type === 'legend') legendVisit(door.legend);
    }
    else if (t === '~') worldSay(SPECIES[lead.sp].types.includes('WATER') ? [`${nm(lead)} splashes happily in the pond!`] : ['The pond sparkles in the sun.']);
    else if (t === 'M') worldSay(['A huge boulder. It is NOT a Rockalock. Probably.']);
    else if (t === 'L') worldSay(['Bubbling lava! WAY too hot to touch.']);
    else if (t === 'w') worldSay(['A sticky TAR PIT. Blub... blub... Better not step in!']);
    else if (t === 'b') worldSay(['Old dinosaur bones. Really, REALLY old.']);
    else if (t === 'U') busStop(BUS[tx + ',' + ty]);
    else if (t === 'N') { const id = NPCS[tx + ',' + ty]; if (id === 'rival') rivalBattle(flags.rivalAt, true); else trainerTalk(id); }
    else if (pal.x === tx && pal.y === ty) worldSay([`${nm(lead)} looks happy to see you!`, `Lv ${lead.lv}  ·  HP ${lead.hp}/${lead.maxHp}`]);
  }
  function healAll() { [...party, ...box].forEach(c => { c.hp = c.maxHp; c.shownHp = c.hp; }); }
  async function restAt(door) {
    mode = 'busy';
    const where = door.type === 'home' ? 'HOME' : TOWNS[door.town].rest;
    for (;;) {
      const c = await chooseMenu([{ label: 'NAP' }, { label: 'BOX', sub: '' + box.length }, { label: 'BYE' }],
        { layout: 'side', prompt: door.type === 'home' ? 'Home sweet home!' : `${where}: "Welcome!"`, canBack: true });
      if (c === 0) {
        hideTextbox();
        await tween(300, t => (overlay.fade = t)); await wait(350);
        healAll(); bag.snack = Math.max(bag.snack, 3); bag.pod = Math.max(bag.pod, 5); save();
        await tween(300, t => (overlay.fade = 1 - t));
        await say('Your whole team is full of energy!');
        await say('You packed snacks and pods for the road.');
      } else if (c === 1) await boxVisit();
      else break;
    }
    hideTextbox(); mode = 'world';
  }

  /* ============ the BOX: extra critters live here (no XP while boxed) ============ */
  const BOX_PAGE = 7;
  function pageCard(label) {
    const b = document.createElement('button');
    b.className = 'cq-card cq-card-luck cq-card-more';
    b.textContent = label;
    return b;
  }
  async function pickFromBox(title) {
    let page = 0;
    for (;;) {
      const slice = box.slice(page * BOX_PAGE, page * BOX_PAGE + BOX_PAGE);
      const items = slice.map(c => ({ node: teamCard(c, '', true) }));
      const hasNext = box.length > (page + 1) * BOX_PAGE, paged = hasNext || page > 0;
      if (paged) items.push({ node: pageCard(hasNext ? 'MORE ▶' : '◀ BACK TO START') });
      const i = await chooseMenu(items, { panelMode: true, cols: 2, canBack: true, title: `${title} (${box.length})` });
      if (i < 0) return -1;
      if (paged && i === items.length - 1) { page = hasNext ? page + 1 : 0; continue; }
      return page * BOX_PAGE + i;
    }
  }
  async function boxVisit() {
    for (;;) {
      const c = await chooseMenu([{ label: 'TAKE OUT' }, { label: 'PUT IN' }, { label: 'BACK' }],
        { layout: 'side', prompt: `BOX: ${box.length} critters`, canBack: true });
      if (c === 0) {
        if (!box.length) { await say('Your BOX is empty. Catch more critters!'); continue; }
        const i = await pickFromBox('Take out who?');
        if (i < 0) continue;
        const picked = box[i];
        if (party.length < TEAM_MAX) { box.splice(i, 1); party.push(picked); save(); await say(`${nm(picked)} joined your team!`); continue; }
        const j = await pickTeam({ title: `Swap ${nm(picked)} with who?` });
        if (j < 0) continue;
        const out = party[j]; party[j] = picked; box[i] = out; save();
        await say(`${nm(picked)} joined your team. ${nm(out)} went in the BOX.`);
      } else if (c === 1) {
        if (party.length <= 1) { await say('You need at least one critter with you!'); continue; }
        const j = await pickTeam({ title: 'Put who in the BOX?' });
        if (j < 0) continue;
        const out = party.splice(j, 1)[0]; box.push(out); save();
        await say(`${nm(out)} went in the BOX. It won't earn XP in there.`);
      } else return;
    }
  }

  async function openWorldMenu() {
    mode = 'busy';
    for (;;) {
      const c = await chooseMenu([{ label: 'TEAM', sub: `${party.length}/${TEAM_MAX}` }, { label: 'BAG' }, { label: 'SHINY' }, { label: 'CLOSE' }],
        { layout: 'side', prompt: `Menu · Badges ${Object.keys(flags.badges).length}/${Object.keys(GYMS).length}`, canBack: true });
      if (c === 0) { await teamFlow(); continue; }
      if (c === 1) { if (await bagFlow()) return; continue; }
      if (c === 2) { await showShinies('Shinies · ● = one plain critter you have'); continue; }
      break;
    }
    hideTextbox(); mode = 'world';
  }
  async function teamFlow() {
    for (;;) {
      const i = await pickTeam({ title: 'Your team' });
      if (i < 0) return;
      const c = party[i];
      const o = await chooseMenu([{ label: 'LEAD' }, { label: 'SNACK', sub: '×' + bag.snack }, { label: 'BACK' }],
        { layout: 'side', prompt: `${c.shiny ? '★' : ''}${nm(c)}  Lv ${c.lv}`, canBack: true });
      if (o === 0) {
        if (i === 0) await say(`${nm(c)} is already your lead!`);
        else { party.splice(i, 1); party.unshift(c); save(); await say(`${nm(c)} is walking with you now!`); }
      } else if (o === 1) {
        if (bag.snack <= 0) await say('No snacks left! Nap at home to get more.');
        else if (c.hp >= c.maxHp) await say(`${nm(c)} is already full of energy!`);
        else { const h = snackHeal(c); bag.snack--; c.hp += h; c.shownHp = c.hp; save(); await say(`${nm(c)} ate a snack! +${h} HP`); }
      }
    }
  }
  const snackHeal = c => Math.min(Math.max(12, Math.round(c.maxHp * snackPct())), c.maxHp - c.hp);

  /* ============ Pebble Town: the shiny trader ============ */
  // Trade 3 plain critters of one family, get 1 shiny of that family (at the best level of the three).
  const showShinies = title => chooseMenu(SHINY_ORDER.map(f => ({ node: shinyCard(f) })), { panelMode: true, cols: 3, canBack: true, title });
  async function traderVisit() {
    mode = 'busy';
    await say('SHINY TRADER: "Hi! I collect critters!"');
    await say(`"Bring me ${SHINY_TRADE_COST} of the same critter and I'll give you a SHINY one!"`);
    await say(`"Shinies come in cool colors, and they hit ${bonusPct}% harder!"`);
    for (;;) {
      const c = await chooseMenu([{ label: 'TRADE' }, { label: 'BYE' }], { layout: 'side', cols: 1, prompt: 'Want to trade?', canBack: true });
      if (c !== 0) break;
      await shinyTrade();
    }
    await say('"Come back with more critters anytime!"');
    hideTextbox(); mode = 'world';
  }
  async function shinyTrade() {
    const f = await showShinies('Which SHINY do you want?');
    if (f < 0) return;
    const fam = SHINY_ORDER[f], name = SPECIES[fam].name;
    const plain = plainOf(fam);
    if (plain.length < SHINY_TRADE_COST) {
      await say(`"For a shiny ${name}, bring me ${SHINY_TRADE_COST} plain ones, from your team or BOX."`);
      await say(`You have ${plain.length}. Catch ${SHINY_TRADE_COST - plain.length} more!`);
      return;
    }
    // Trade away the lowest-level plain ones; the shiny comes back at the best level of the three.
    const give = [...plain].sort((a, b) => a.c.lv - b.c.lv).slice(0, SHINY_TRADE_COST);
    const lv = Math.max(...give.map(o => o.c.lv));
    await say(`You'll give: ${give.map(o => `${nm(o.c)} Lv ${o.c.lv}`).join(', ')}.`);
    const ok = await chooseMenu([{ label: 'YES' }, { label: 'NO' }], { layout: 'side', cols: 1, prompt: `Trade for a shiny ${name}?` });
    if (ok !== 0) return;
    const giveSet = new Set(give.map(o => o.c));
    party = party.filter(c => !giveSet.has(c)); box = box.filter(c => !giveSet.has(c));
    if (!party.length && box.length) party.push(box.shift());
    const shiny = makeCritter(grownForm(fam, lv), lv, true);
    if (party.length < TEAM_MAX) party.push(shiny); else box.push(shiny);
    save();
    await say(`You handed over your ${SHINY_TRADE_COST} critters. Bye bye!`);
    await say(`Wow! You got a SHINY ${nm(shiny)}! (Lv ${shiny.lv})`);
    await say(`Its attack is ${bonusPct}% stronger than a plain one!`);
    if (box.includes(shiny)) await say('Your team is full, so it went to your BOX.');
  }

  /* ============ Pebble Town: the gym ============ */
  async function gymVisit(gymId) {
    mode = 'busy';
    const gym = GYMS[gymId];
    if (!flags.badges[gymId]) {
      for (const line of gym.intro) await say(`${gym.short}: ${line}`);
      if ((LEVEL_CAP[gymId] || 0) > levelCap()) await say(`"Beat me and your critters can grow to Lv ${LEVEL_CAP[gymId]}!"`);
    } else {
      await say(`${gym.short}: "Back for a rematch? I give out lots of XP!"`);
    }
    const y = await chooseMenu([{ label: 'BATTLE!' }, { label: 'NOT YET' }], { layout: 'side', cols: 1, prompt: `Battle ${gym.short}?` });
    if (y !== 0) { await say('"Come back when you\'re ready!"'); hideTextbox(); mode = 'world'; return; }
    if (!party.some(c => c.hp > 0)) { await say('"Your team needs a nap first!"'); hideTextbox(); mode = 'world'; return; }
    hideTextbox();
    await startTrainerBattle(gymId, gym, false);
  }

  // Returns true if something (an evolution) already took us back to the world.
  async function bagFlow() {
    for (;;) {
      const c = await chooseMenu([{ label: 'SNACK', sub: '×' + bag.snack }, { label: 'POD', sub: '×' + bag.pod }, { label: 'MEGA POD', sub: '×' + (bag.mega || 0) },
        { label: 'CANDY', sub: '×' + (bag.candy || 0) }, { label: 'BACK' }], { layout: 'full', canBack: true, cols: 3 });
      if (c === 0) await say(`Snacks heal ${Math.round(snackPct() * 100)}% of HP. Use them from TEAM, or in battle.`);
      else if (c === 1) await say('Throw pods in battle to catch wild critters!');
      else if (c === 2) await say(bag.mega ? `MEGA PODS catch way better than pods (${MEGA_POD.boost}x)! Save them for tough critters.` : 'No MEGA PODS yet! Win them from gyms and legendaries.');
      else if (c === 3) { if (await useCandy()) return true; }
      else return false;
    }
  }
  const candyWhat = () => (CANDY.target === 'team' ? `+${CANDY.levels} level${CANDY.levels > 1 ? 's' : ''} for your whole team` : `+${CANDY.levels} level${CANDY.levels > 1 ? 's' : ''} for one critter`);
  // First win against each gym and each legendary: a RARE CANDY and some MEGA PODS.
  async function giveCandy(key) {
    if (flags.candy?.[key]) return;
    flags.candy = { ...(flags.candy || {}), [key]: true };
    bag.candy = (bag.candy || 0) + 1; bag.mega = (bag.mega || 0) + MEGA_POD.perWin; save();
    await say(`You got a RARE CANDY! (${candyWhat()})`);
    await say(`You got ${MEGA_POD.perWin} MEGA PODS! They catch critters way better than pods.`);
  }
  async function useCandy() {
    if (!(bag.candy > 0)) { await say('No candy yet! Win it from gyms and legendaries.'); return false; }
    let targets = party;
    if (CANDY.target !== 'team') {
      const i = await pickTeam({ title: `Give the RARE CANDY to who? (+${CANDY.levels} Lv)` });
      if (i < 0) return false;
      targets = [party[i]];
    }
    if (targets.every(c => c.lv >= levelCap())) { await say(capLine(targets[0])); return false; }
    bag.candy--;
    for (const c of targets) {
      const from = c.lv, learned = [];
      for (let k = 0; k < CANDY.levels && c.lv < levelCap(); k++) learned.push(...bumpLevel(c));
      if (c.lv > from) await say(`${nm(c)} ate the candy and grew to Lv ${c.lv}!`);
      for (const m of learned) await say(`${nm(c)} learned ${m}!`);
    }
    save();
    const evolvers = targets.filter(canEvolve);
    if (!evolvers.length) return false;
    hideTextbox();
    for (const c of evolvers) await runEvolution(c, false);
    await announceGates();
    return true;
  }

  /* ============ bus stops: fast travel between towns you've visited ============ */
  async function busStop(here) {
    mode = 'busy';
    flags.bus = { ...(flags.bus || {}), [here]: true };
    const stops = AREAS.filter(a => a.town && flags.bus[a.town]).map(a => a.town);
    if (stops.length < 2) {
      await say(`BUS STOP: ${TOWNS[here].name}`);
      await say('Visit another town and the bus can take you there anytime!');
      hideTextbox(); mode = 'world'; return;
    }
    const card = label => { const b = document.createElement('button'); b.className = 'cq-card cq-card-luck cq-card-more'; b.textContent = label; return { node: b }; };
    const items = stops.map(id => card(id === here ? `${TOWNS[id].name} (here)` : TOWNS[id].name));
    const i = await chooseMenu([...items, card('STAY HERE')], { panelMode: true, cols: 2, canBack: true, title: 'Where do you want to go?' });
    const dest = stops[i];
    if (i < 0 || i >= stops.length || dest === here) { hideTextbox(); mode = 'world'; return; }
    await say(`All aboard! Next stop: ${TOWNS[dest].name}!`);
    hideTextbox();
    await tween(350, t => (overlay.fade = t));
    const spot = Object.values(TOWN_AT).find(t => t.id === dest).bus;
    Object.assign(player, { x: spot.x, y: spot.y, face: 'down', moving: false }); placePal(); save();
    await wait(300);
    await tween(350, t => (overlay.fade = 1 - t));
    await worldSay([`Welcome to ${TOWNS[dest].name}!`]);
  }

  /* ============ trainers out in the world ============ */
  async function trainerTalk(id) {
    mode = 'busy';
    const t = TRAINERS[id];
    if (flags.trainers?.[id]) { await say(`${t.short}: ${t.after}`); hideTextbox(); mode = 'world'; return; }
    for (const line of t.hello) await say(`${t.short}: ${line}`);
    const y = await chooseMenu([{ label: 'BATTLE!' }, { label: 'NOT YET' }], { layout: 'side', cols: 1, prompt: `Battle ${t.leader}?` });
    if (y !== 0) { await say(`${t.short}: "I'll be right here!"`); hideTextbox(); mode = 'world'; return; }
    if (!party.some(c => c.hp > 0)) { await say(`${t.short}: "Your team needs a nap first!"`); hideTextbox(); mode = 'world'; return; }
    hideTextbox();
    await startTrainerBattle('npc:' + id, { ...t, xpMultiplier: 1.5 }, true);
  }

  /* ============ your rival: battles you right after each gym badge ============ */
  const STARTER_OF = { blazepony: 'blazepony', shadowblaze: 'blazepony', twinblaze: 'blazepony', foxlet: 'foxlet', hammerfox: 'foxlet', warfox: 'foxlet',
    splashcano: 'splashcano', boomcano: 'splashcano', tricano: 'splashcano' };
  function myStarter() {
    if (flags.starter) return flags.starter;
    const c = [...party, ...box].find(c => STARTER_OF[c.sp]);
    return c ? STARTER_OF[c.sp] : 'foxlet';
  }
  function rivalTeam(gymId) {
    const starter = RIVAL.counters[myStarter()] || 'blazepony';
    return (RIVAL.teams[gymId] || RIVAL.teams.maple).map(([sp, lv]) => [grownForm(sp === 'STARTER' ? starter : sp, lv), lv]);
  }
  // MAX waits outside the gym he beat you at, until you win a rematch.
  let rivalTile = null;
  function placeRival() {
    if (rivalTile) { map[rivalTile.y][rivalTile.x] = rivalTile.was; delete NPCS[rivalTile.x + ',' + rivalTile.y]; rivalTile = null; }
    const g = flags.rivalAt;
    if (!g || flags.rival?.[g]) return;
    const townId = Object.keys(TOWNS).find(k => TOWNS[k].gym === g), ai = AREAS.findIndex(a => a.town === townId);
    if (ai < 0) return;
    const x = ai * AW + 14, y = AH + 14;
    rivalTile = { x, y, was: map[y][x] };
    map[y][x] = 'N'; NPCS[x + ',' + y] = 'rival';
  }
  async function rivalBattle(gymId, rematch) {
    mode = 'busy';
    flags.rivalAt = gymId; placeRival(); save();
    if (!rematch) { await say('???: "Hey! Wait up!"'); for (const line of RIVAL.hello.slice(1)) await say(`${RIVAL.short}: ${line}`); }
    else for (const line of RIVAL.rematch) await say(`${RIVAL.short}: ${line}`);
    if (!party.some(c => c.hp > 0)) { await say(`${RIVAL.short}: "Your team is too tired. Go nap, then come back!"`); hideTextbox(); mode = 'world'; return; }
    hideTextbox();
    await startTrainerBattle('rival:' + gymId, { ...RIVAL, team: rivalTeam(gymId) }, true);
  }

  /* ============ legendaries: one in every biome ============ */
  async function legendVisit(id) {
    mode = 'busy';
    const L = LEGENDS[id];
    if (flags.legend?.[id]) {
      await say(L.gone);
    } else if (!party.some(c => c.lv >= L.need)) {
      for (const line of L.sleeping) await say(line);
      await say(`Come back when one of your critters is Lv ${L.need}.`);
    } else {
      await say(L.waking);
      hideTextbox();
      await startBattle({ sp: id, lv: L.lv });
      return;
    }
    hideTextbox(); mode = 'world';
  }

  /* ============ drawing: world ============ */
  function entityPx(e) {
    if (!e.moving) return [e.x * T, e.y * T];
    const t = player.t;
    return [Math.round((e.from.x + (e.to.x - e.from.x) * t) * T), Math.round((e.from.y + (e.to.y - e.from.y) * t) * T)];
  }
  function sprImg(sp, dir, now, white, shiny) {
    const set = sprites(sp, shiny);
    if (white) return dir === 'L' ? set.WL : set.W;
    return set[dir][SPECIES[sp].flicker ? Math.floor(now / 160) % 2 : 0];
  }
  function kidSprite() {
    const walking = player.moving && player.t > 0.15 && player.t < 0.85, alt = player.steps % 2;
    switch (player.face) {
      case 'down': return walking ? (alt ? KID.downA : KID.downB) : KID.down;
      case 'up': return walking ? (alt ? KID.upA : KID.upB) : KID.up;
      case 'right': return walking ? KID.rightW : KID.right;
      default: return walking ? KID.leftW : KID.left;
    }
  }
  function drawWorld(now) {
    const [ppx, ppy] = entityPx(player);
    const camX = Math.max(0, Math.min(MW * T - VW * T, ppx + 8 - (VW * T) / 2));
    const camY = Math.max(0, Math.min(MH * T - VH * T, ppy + 8 - (VH * T) / 2));
    const x0 = Math.floor(camX / T), y0 = Math.floor(camY / T);
    const wf = Math.floor(now / 500) % 2;
    // the plain ground of each place, drawn under see-through things (signs, bones, buildings)
    const ground = (tx, ty) => {
      const k = areaAt(tx).kind, h = Math.floor(hash(tx, ty) * 3);
      return { mountains: TILES.ground[h], forest: TILES.forestFloor[h], volcano: TILES.ash[h], prehistoric: TILES.jungle[h] }[k] || TILES.grass[Math.floor(hash(tx, ty) * 4)];
    };
    for (let ty = y0; ty <= y0 + VH; ty++) for (let tx = x0; tx <= x0 + VW; tx++) {
      const t = tileAt(tx, ty), sx = tx * T - camX, sy = ty * T - camY;
      if (t === 'S' || t === 'b' || t === 'h' || t === 'D' || t === 'N') {
        ctx.drawImage(ground(tx, ty), sx, sy);
        if (t === 'S') ctx.drawImage(TILES.signPost, sx, sy);
        if (t === 'b') ctx.drawImage(TILES.bones, sx, sy);
        continue;
      }
      const img = {
        ',': TILES.tall, ';': TILES.rubble, '=': TILES.path, 'T': TILES.tree, 'P': TILES.pine, 'M': TILES.boulder,
        '*': TILES.flowers, 'S': TILES.sign, '~': TILES.water[wf], 'G': TILES.gate[gateOpenFor(gateAt(tx, ty)) ? 1 : 0],
        'r': TILES.ground[Math.floor(hash(tx, ty) * 3)], 'F': TILES.forestFloor[Math.floor(hash(tx, ty) * 3)],
        'Y': TILES.forestTree, 'u': TILES.undergrowth, 'o': TILES.mushrooms,
        'K': TILES.ash[Math.floor(hash(tx, ty) * 3)], 'L': TILES.lava[wf], 'e': TILES.embers, 'X': TILES.blackrock, 'U': TILES.busStop,
        'j': TILES.jungle[Math.floor(hash(tx, ty) * 3)], 'n': TILES.ferns, 'Z': TILES.cycad, 'w': TILES.tar[wf], 'b': TILES.bones,
      }[t] || TILES.grass[Math.floor(hash(tx, ty) * 4)];
      ctx.drawImage(img, sx, sy);
      if (t === '~' || t === '=' || t === 'w') {
        ctx.fillStyle = t === '~' ? '#d8f0fb' : t === 'w' ? '#5a4f3a' : '#cdb47c';
        const e = t === '=' ? 1 : 2, same = n => n === t || (t === '=' && (n === 'G' || n === 'D'));
        if (!same(tileAt(tx, ty - 1))) ctx.fillRect(sx, sy, 16, e);
        if (!same(tileAt(tx, ty + 1))) ctx.fillRect(sx, sy + 16 - e, 16, e);
        if (!same(tileAt(tx - 1, ty))) ctx.fillRect(sx, sy, e, 16);
        if (!same(tileAt(tx + 1, ty))) ctx.fillRect(sx + 16 - e, sy, e, 16);
      }
    }
    for (const b of BUILDINGS) ctx.drawImage(b.legend && b.altImg && flags.legend?.[b.legend] ? b.altImg : b.img, b.x * T - camX, b.y * T - camY);

    const [apx, apy] = entityPx(pal);
    const bob = player.moving && player.t > 0.25 && player.t < 0.75 ? -1 : 0;
    const lead = party[0];
    const palImg = sprImg(lead.sp, pal.faceLeft ? 'L' : 'R', now, false, shinyCfg(lead));
    // trainers: drawn with you and your partner so whoever is lower on screen is in front
    const npcs = [];
    for (const [k, id] of Object.entries(NPCS)) {
      const [nx, ny] = k.split(',').map(Number);
      if (nx < x0 - 1 || nx > x0 + VW + 1 || ny < y0 - 1 || ny > y0 + VH + 1) continue;
      const beaten = id === 'rival' ? false : !!flags.trainers?.[id];
      const img = LEADERS[id === 'rival' ? RIVAL.look : TRAINERS[id].look], sx = nx * T - camX + 8 - Math.floor(img.width / 2), sy = ny * T - camY + 17 - img.height;
      npcs.push({ y: ny * T, draw: () => {
        ctx.drawImage(img, sx, sy);
        if (!beaten) {        // a "!" bubble over trainers you haven't beaten yet
          const by = sy - 11 + (Math.floor(now / 400) % 2);
          ctx.fillStyle = '#2a2135'; ctx.fillRect(sx + 4, by, 8, 10);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 5, by + 1, 6, 8);
          ctx.fillStyle = '#d94a3a'; ctx.fillRect(sx + 7, by + 2, 2, 4); ctx.fillRect(sx + 7, by + 7, 2, 1);
        }
      } });
    }
    const ents = [
      ...npcs,
      { y: apy, draw: () => ctx.drawImage(palImg, apx - camX + 8 - Math.floor(palImg.width / 2), apy - camY + 17 - palImg.height + (pal.moving ? bob : 0)) },
      { y: ppy + 0.5, draw: () => ctx.drawImage(kidSprite(), ppx - camX + 2, ppy - camY - 3 + bob) },
    ].sort((a, b) => a.y - b.y);
    ents.forEach(e => e.draw());
    for (const e of [player, pal]) {         // grass and rubble cover feet
      const on = e.moving ? (player.t > 0.55 ? e.to : null) : { x: e.x, y: e.y };
      if (!on) continue;
      const t = tileAt(on.x, on.y);
      const cover = { ',': TILES.tall, ';': TILES.rubble, 'u': TILES.undergrowth, 'e': TILES.embers, 'n': TILES.ferns }[t];
      if (cover) ctx.drawImage(cover, 0, 10, 16, 6, on.x * T - camX, on.y * T - camY + 10, 16, 6);
    }
    if (bang) {
      const bx = ppx - camX + 3, by = ppy - camY - 16;
      ctx.fillStyle = '#2a2135'; ctx.fillRect(bx, by, 10, 12);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 1, by + 1, 8, 10);
      ctx.fillStyle = '#d94a3a'; ctx.fillRect(bx + 4, by + 2, 2, 5); ctx.fillRect(bx + 4, by + 8, 2, 2);
    }
  }

  /* ============ drawing: other scenes ============ */
  function shadow(cx, cy, rx) { ctx.fillStyle = 'rgba(42,33,53,0.22)'; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(4, rx), 3, 0, 0, Math.PI * 2); ctx.fill(); }
  function drawChoose(now) {
    ctx.drawImage(BG.choose, 0, 0);
    STARTERS.forEach((sp, i) => {
      const img = sprImg(sp, 'R', now), w = img.width * 2, h = img.height * 2, sel = i === chooseIdx;
      const hop = sel && !RM ? -Math.round(Math.abs(Math.sin(now / 180)) * 5) : 0;
      shadow(CHOOSE_X[i], 99, w * 0.35);
      ctx.globalAlpha = sel ? 1 : 0.7;
      ctx.drawImage(img, CHOOSE_X[i] - Math.floor(w / 2), 100 - h + hop, w, h);
      ctx.globalAlpha = 1;
    });
  }
  const STARS = Array.from({ length: 40 }, (_, i) => [Math.floor(hash(i, 3) * 240), Math.floor(hash(7, i) * 110), hash(i, i) * 6]);
  function drawEvolve(now) {
    for (let y = 0; y < 160; y += 8) { ctx.fillStyle = `rgb(${29 + y / 8},${26 + y / 10},${51 + y / 5})`; ctx.fillRect(0, y, 240, 8); }
    for (const [x, y, ph] of STARS) if (Math.sin(now / 300 + ph) > 0) { ctx.fillStyle = '#fff6c2'; ctx.fillRect(x, y, 1, 1); }
    const img = sprImg(E.sp, 'R', now, E.white, E.shiny), w = img.width * 3, h = img.height * 3;
    ctx.fillStyle = 'rgba(255,214,90,0.18)'; ctx.beginPath(); ctx.ellipse(120, 102, 50, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, 120 - Math.floor(w / 2), 104 - h, w, h);
  }
  function drawProj(p) {
    const x = Math.round(p.x), y = Math.round(p.y), fl = Math.floor(performance.now() / 60) % 2;
    const r = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
    switch (p.kind) {
      case 'fire': r('#e2392b', x - 4, y - 4, 8, 8); r(fl ? '#ffd23f' : '#ff7a2a', x - 3, y - 3, 6, 6); r('#fff6c2', x - 1, y - 1, 2, 2); break;
      case 'shadow': r('#1a1430', x - 6, y - 6, 12, 12); r('#5a4c80', x - 5, y - 5, 10, 10); r(fl ? '#ff7a2a' : '#e2392b', x - 2, y - 2, 4, 4); break;
      case 'water': r('#2f7fb5', x - 3, y - 4, 6, 8); r('#4aa3df', x - 2, y - 3, 4, 6); r('#d8f0fb', x - 1, y - 2, 1, 2); break;
      case 'rock': r('#3b3340', x - 4, y - 3, 8, 7); r('#8b7563', x - 3, y - 2, 6, 5); r('#a9937f', x - 2, y - 2, 2, 1); break;
      case 'leaf': r('#2a2135', x - 5, y - 2, 10, 5); r(fl ? '#7fd35b' : '#5fbf45', x - 4, y - 1, 8, 3); r('#3f8f3a', x - 4, y, 8, 1); break;
      case 'wind': r('#ffffff', x - 6, y - 3, 8, 1); r('#ffffff', x - 3, y, 8, 1); r('#ffffff', x - 5, y + 3, 7, 1); break;
      case 'mind':
        for (let i = 0; i < 3; i++) { const rr = 3 + i * 3; ctx.strokeStyle = fl ? '#f0a3d0' : '#d45fa0'; ctx.lineWidth = 2; ctx.strokeRect(x - rr, y - rr, rr * 2, rr * 2); }
        break;
      case 'magma':
        r('#2a2135', x - 7, y - 7, 14, 14); r('#e2392b', x - 6, y - 6, 12, 12); r(fl ? '#ffd23f' : '#ff7a2a', x - 4, y - 4, 8, 8); r('#fff6c2', x - 2, y - 3, 3, 2);
        r('#5a4a44', x - 10 * p.dir, y - 8, 4, 3); break;
      case 'feather':
        for (const dy of [-6, 0, 6]) { r('#2a2135', x - 7, y + dy - 1, 14, 3); r(fl ? '#e3ebf3' : '#a7b0c2', x - 6, y + dy, 12, 1); r('#ffffff', x + 5 * p.dir, y + dy, 2, 1); }
        break;
      case 'hornrocket':
        for (const dy of [-5, 4]) { r('#2a2135', x - 7, y + dy - 3, 14, 6); r('#bdb8b0', x - 6, y + dy - 2, 12, 4); r('#e3dfd8', x + 4 * p.dir, y + dy - 2, 3, 4); r(fl ? '#ffd23f' : '#ff7a2a', x - 10 * p.dir - 2, y + dy - 2, 4, 4); }
        break;
      case 'icicle':
        for (const dy of [-6, 0, 6]) { r('#2a2135', x - 7, y + dy - 2, 14, 4); r(fl ? '#e2f7ff' : '#bff3ff', x - 6, y + dy - 1, 10, 2); r('#ffffff', x + 4 * p.dir, y + dy - 1, 2, 2); r('#6fa3c4', x - 6 * p.dir - 1, y + dy - 1, 2, 2); }
        break;
      case 'smoke':
        for (const [dx, dy, sz] of [[-6, -3, 8], [3, -6, 7], [0, 3, 9]]) { r('#5a5560', x + dx - 1, y + dy - 1, sz + 2, sz + 2); r(fl ? '#9c958c' : '#bdb8b0', x + dx, y + dy, sz, sz); }
        r(fl ? '#ffd23f' : '#ff7a2a', x - 1, y - 1, 3, 3); break;
      case 'spark':
        r('#ffe14a', x - 4, y - 3, 3, 2); r('#ffe14a', x - 2, y - 1, 3, 2); r('#ffe14a', x, y + 1, 3, 2); r(fl ? '#ffffff' : '#bff3ff', x - 1, y - 1, 2, 2); break;
      case 'bolt':
        for (let i = 0; i < 4; i++) { const zx = x - 8 + i * 4 + (i % 2 ? 2 : -2); r('#2a2135', zx - 1, y - 10 + i * 5, 6, 6); r(fl ? '#ffe14a' : '#ffffff', zx, y - 9 + i * 5, 4, 4); }
        break;
      case 'steamball':
        r('#2a2135', x - 8, y - 8, 16, 16); r('#2f7fb5', x - 7, y - 7, 14, 14); r('#4aa3df', x - 6, y - 6, 11, 11); r('#d8f0fb', x - 4, y - 5, 4, 3);
        r(fl ? '#ffffff' : '#bfe6fb', x - 14 * p.dir, y - 9, 5, 4); r(fl ? '#bfe6fb' : '#ffffff', x - 17 * p.dir, y - 3, 4, 3); break;
      case 'burst':
        for (const [dx, dy] of [[-8, -4], [6, -7], [-3, 5], [8, 3], [0, -1]]) { r('#2a2135', x + dx - 3, y + dy - 3, 6, 6); r(fl ? '#e3ebf3' : '#9fb0c4', x + dx - 2, y + dy - 2, 4, 4); }
        break;
      case 'rocket': {
        const d = p.dir;
        r(fl ? '#ffffff' : '#bfe6fb', x - d * 10 - 2, y - 2, 5, 4);          // steam trail
        r('#2a2135', x - 7, y - 3, 14, 6); r('#e2392b', x - 6, y - 2, 12, 4); r('#f6f3ea', x + d * 4 - 1, y - 2, 3, 4);
        r('#a7b0c2', x - d * 6 - 1, y - 4, 3, 8);
        break;
      }
    }
  }
  function drawBeam(b) {
    const x1 = b.from.x + (b.to.x - b.from.x) * b.len, y1 = b.from.y + (b.to.y - b.from.y) * b.len;
    const fl = Math.floor(performance.now() / 50) % 2;
    ctx.lineCap = 'round';
    for (const [col, w] of [['#2a2135', 13], ['#e2392b', 11], [fl ? '#ff7a2a' : '#ffd23f', 7], [fl ? '#ffd23f' : '#fff6c2', 3]]) {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * b.w);
      ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(x1, y1 + (fl ? 1 : -1)); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function drawIceBall(cx, cy, spin) {
    ctx.fillStyle = '#2a2135'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f6a8a'; ctx.beginPath(); ctx.arc(cx, cy, 15.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6fa3c4'; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e2f7ff'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = spin + i * 2.1; ctx.beginPath(); ctx.arc(cx, cy, 10, a, a + 1.2); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 8, cy - 9, 4, 3);
  }
  function drawPod(p) {
    const x = Math.round(p.x) + (p.wob || 0), y = Math.round(p.y);
    const r = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
    r('#2a2135', x - 5, y - 5, 10, 10);
    if (p.mega) { r('#8a4ad9', x - 4, y - 4, 8, 4); r('#c79cff', x - 3, y - 4, 2, 1); r('#ffd23f', x - 4, y - 2, 8, 1); }
    else { r('#2bb3a0', x - 4, y - 4, 8, 4); r('#7fe0d0', x - 3, y - 4, 2, 1); }
    r('#f6f3ea', x - 4, y, 8, 4); r('#2a2135', x - 4, y - 1, 8, 1);
    r('#ffd23f', x - 1, y - 2, 2, 2);
    if (p.glow) for (const [dx, dy] of [[-9, -8], [8, -9], [10, 2], [-10, 3]]) r('#fff6c2', x + dx, y + dy, 2, 2);
  }
  function drawSparkles(cx, cy, now) {
    const t = (now - B.sparkle) / 1200;
    if (t < 0 || t > 1) return;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + t * 4, rad = 18 + t * 18, x = Math.round(cx + Math.cos(a) * rad), y = Math.round(cy + Math.sin(a) * rad * 0.8);
      ctx.fillStyle = i % 2 ? '#ffd23f' : '#ffffff';
      ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2);
    }
  }
  function drawBattle(now) {
    const sx = B.shake ? Math.round((Math.random() * 2 - 1) * B.shake) : 0;
    ctx.save(); ctx.translate(sx, 0);
    ctx.drawImage(battleBg, 0, 0);
    if (B.leader.vis) {
      const img = LEADERS[trainer?.gym.look || 'brick'], w = img.width * 3, h = img.height * 3;
      shadow(FOE_POS.x + B.leader.x, 57, 16);
      ctx.drawImage(img, Math.round(FOE_POS.x - w / 2 + B.leader.x), FOE_POS.y - h, w, h);
    }
    if (B.foe.vis && F) {
      const img = sprImg(F.sp, 'L', now, B.foe.flash, shinyCfg(F)), s = (B.foe.scale ?? 1) * Math.min(img.height > 22 ? 2.5 : 3, 112 / img.width);   // long critters are drawn a bit smaller so they fit
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const hover = SPECIES[F.sp].hovers ? Math.round(Math.sin(now / 200) * 2) - 4 : 0;
      shadow(FOE_POS.x + B.foe.x, 57, w * 0.33);
      ctx.globalAlpha = B.foe.alpha;
      if (B.foe.ball) drawIceBall(FOE_POS.x + B.foe.x, FOE_POS.y - 16 + B.foe.y, B.foe.x / 9);
      else ctx.drawImage(img, Math.round(FOE_POS.x - w / 2 + B.foe.x), Math.round(FOE_POS.y - h + B.foe.y) + hover, w, h);
      ctx.globalAlpha = 1;
      drawSparkles(FOE_POS.x, FOE_POS.y - 26, now);
    }
    if (B.pod) drawPod(B.pod);
    if (B.me.vis && A()) {
      // Evolved critters are tall: draw them a touch smaller and lower so they clear the wild critter's box.
      const img = sprImg(A().sp, 'R', now, B.me.flash, shinyCfg(A())), big = img.height > 22, s = Math.min(big ? 2.5 : 3, 112 / img.width);
      const w = Math.round(img.width * s), h = Math.round(img.height * s), bottom = ME_POS.y + (big ? 3 : 0);
      const idle = Math.round(Math.sin(now / 320)) === 1 ? -1 : 0;
      shadow(ME_POS.x + B.me.x, 102, w * 0.36);
      ctx.globalAlpha = B.me.alpha;
      if (B.me.ball) drawIceBall(ME_POS.x + B.me.x, ME_POS.y - 16 + B.me.y, B.me.x / 9);
      else ctx.drawImage(img, Math.round(Math.max(2, Math.min(ME_POS.x - w / 2, 116 - w)) + B.me.x), Math.round(bottom - h + B.me.y) + idle, w, h);   // long critters slide left so their nose stays clear of your HP box
      ctx.globalAlpha = 1;
    }
    if (B.proj) drawProj(B.proj);
    if (B.beam) drawBeam(B.beam);
    ctx.restore();
  }

  /* ============ battle logic ============ */
  const stageMult = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
  function setFill(el, f) { f = Math.max(0, Math.min(1, f)); el.style.width = f * 100 + '%'; el.dataset.level = f > 0.5 ? 'hi' : f > 0.2 ? 'mid' : 'lo'; }
  function updateHud() {
    if (F) {
      q('eName').innerHTML = nameHTML(F); q('eLv').textContent = 'Lv ' + F.lv;
      q('eTypes').innerHTML = typePills(SPECIES[F.sp].types);
      setFill(q('eFill'), F.shownHp / F.maxHp);
      // trainer battles: a pod for each of their critters (grey = knocked out) and how many are left
      const left = q('eTeam');
      if (left) {
        left.hidden = !trainer;
        if (trainer) {
          const n = trainer.team.filter(c => c.hp > 0).length;
          left.innerHTML = trainer.team.map(c => `<i class="${c.hp > 0 ? '' : 'is-out'}"></i>`).join('') + `<span>${n} left</span>`;
        }
      }
    }
    const c = A(); if (!c) return;
    q('pName').innerHTML = nameHTML(c); q('pLv').textContent = 'Lv ' + c.lv;
    q('pTypes').innerHTML = typePills(SPECIES[c.sp].types);
    setFill(q('pFill'), c.shownHp / c.maxHp);
    q('pNums').textContent = `${Math.ceil(c.shownHp)}/${c.maxHp}`;
    q('xpFill').style.width = (c.lv >= levelCap() ? 100 : (c.shownXp / c.xpNext) * 100) + '%';
  }
  async function drainHp(o, to) {
    const from = o.shownHp; o.hp = to;
    await tween(Math.min(700, 150 + Math.abs(to - from) * 40), t => { o.shownHp = from + (to - from) * t; updateHud(); });
  }
  const side = who => (who === 'p' ? B.me : B.foe);
  async function animMove(who, M) {
    const s = side(who), dir = who === 'p' ? 1 : -1;
    switch (M.anim) {
      case 'dash':
        await tween(220, t => (s.x = dir * 190 * t), easeIn); await wait(140);
        s.x = -dir * 190; await tween(260, t => (s.x = -dir * 190 * (1 - t)), easeOut);
        await tween(160, t => (s.x = dir * 18 * Math.sin(Math.PI * t))); break;
      case 'thump': await tween(200, t => (s.y = -14 * Math.sin(Math.PI * t))); B.shake = 3; await wait(160); B.shake = 0; break;
      case 'nibble': for (let i = 0; i < 2; i++) await tween(110, t => (s.x = dir * 8 * Math.sin(Math.PI * t))); break;
      case 'pounce': await tween(300, t => { s.x = dir * 30 * Math.sin(Math.PI * t); s.y = -16 * Math.sin(Math.PI * t); }); break;
      case 'quake':   // Tree Shake: jump, slam, and the whole screen shakes
        await tween(280, t => (s.y = -18 * Math.sin((Math.PI / 2) * t)));
        await tween(110, t => (s.y = -18 * (1 - t)), easeIn);
        if (!RM) screenEl.classList.add('is-quaking');
        B.shake = 7; await wait(950); B.shake = 0;
        screenEl.classList.remove('is-quaking');
        break;
      case 'rollup': {  // Roll Up: curls into a giant ice ball, the screen goes blue, and it rolls right over the foe
        await tween(260, t => (overlay.blue = 0.5 * t));
        s.ball = true; await tween(200, t => (s.y = -10 * Math.sin(Math.PI * t)));
        await tween(320, t => (s.x = dir * 118 * t), easeIn);
        B.shake = 6; overlay.flash = 0.5; await tween(240, t => (overlay.flash = 0.5 * (1 - t))); B.shake = 0;
        await tween(300, t => (s.x = dir * 118 * (1 - t)), easeOut);
        s.ball = false;
        await tween(300, t => (overlay.blue = 0.5 * (1 - t)));
        break;
      }
      case 'slice':   // Spine Slice: the fire spine cuts the whole screen in half
        await tween(200, t => (s.y = -10 * Math.sin(Math.PI * t)));
        await tween(240, t => (overlay.sliceLine = t));
        B.shake = 4; await tween(180, t => (overlay.slice = t), easeOut);
        await wait(320);
        await tween(240, t => (overlay.slice = 1 - t), easeIn); B.shake = 0;
        await tween(160, t => (overlay.sliceLine = 1 - t));
        break;
      case 'beam': {  // Flaming Beam: a huge beam of fire straight at the foe
        const from = who === 'p' ? { x: ME_POS.x + 26, y: 74 } : { x: FOE_POS.x - 26, y: 34 };
        const to = who === 'p' ? { x: FOE_POS.x, y: 40 } : { x: ME_POS.x, y: 82 };
        await tween(160, t => (s.x = -dir * 6 * t));
        B.beam = { from, to, len: 0, w: 1 };
        await tween(240, t => (B.beam.len = t));
        B.shake = 5; overlay.flash = 0.5; await tween(420, t => (overlay.flash = 0.5 * (1 - t))); B.shake = 0;
        await tween(220, t => (B.beam.w = 1 - t));
        B.beam = null; s.x = 0;
        break;
      }
      case 'smash':
        await tween(220, t => { s.y = -12 * t; s.x = -dir * 4 * t; });
        await tween(110, t => { s.y = -12 * (1 - t); s.x = -dir * 4 + dir * 30 * t; });
        B.shake = 5; await wait(200); B.shake = 0;
        await tween(160, t => (s.x = dir * 26 * (1 - t))); break;
      case 'proj': {
        await tween(120, t => (s.x = dir * 6 * Math.sin(Math.PI * t)));
        const from = who === 'p' ? { x: ME_POS.x + 20, y: 82 } : { x: FOE_POS.x - 18, y: 38 };
        const to = who === 'p' ? { x: FOE_POS.x, y: 38 } : { x: ME_POS.x, y: 82 };
        B.proj = { kind: M.proj, x: from.x, y: from.y, dir };
        await tween(M.proj === 'rocket' ? 300 : 380, t => {
          B.proj.x = from.x + (to.x - from.x) * t;
          B.proj.y = from.y + (to.y - from.y) * t - 18 * Math.sin(Math.PI * t);
        });
        B.proj = null;
        if (['bolt', 'burst', 'steamball', 'magma', 'hornrocket', 'feather', 'icicle', 'smoke'].includes(M.proj)) { overlay.flash = 0.7; B.shake = 4; await tween(240, t => (overlay.flash = 0.7 * (1 - t))); B.shake = 0; }
        if (M.proj === 'rocket') { overlay.flash = 0.8; B.shake = 5; await tween(220, t => (overlay.flash = 0.8 * (1 - t))); B.shake = 0; }
        break;
      }
      default: {
        const dist = M.power >= 9 ? 18 : 12;
        await tween(220, t => { s.x = dir * dist * Math.sin(Math.PI * t); if (who === 'e') s.y = -6 * Math.sin(Math.PI * t); });
      }
    }
    s.x = 0; s.y = 0;
  }
  async function animHit(who) {
    const s = side(who);
    for (let i = 0; i < 3; i++) { s.flash = true; s.x = 3; await wait(60); s.flash = false; s.x = -3; await wait(60); }
    s.x = 0;
  }
  async function animHop(who) { const s = side(who); await tween(240, t => (s.y = -12 * Math.sin(Math.PI * t))); s.y = 0; }
  async function animShake(who) { const s = side(who); await tween(300, t => (s.x = Math.round(Math.sin(t * Math.PI * 6) * 3))); s.x = 0; }

  function foePick() {
    const learn = SPECIES[F.sp].learn || {};
    const ms = SPECIES[F.sp].moves.filter(m => (learn[m] || 0) <= F.lv);
    const status = ms.find(m => MOVES[m].effect), dmg = ms.filter(m => !MOVES[m].effect);
    if (status && Math.random() < 0.2) {
      const [st, dl, tg] = MOVES[status].effect, target = tg === 'self' ? F : A(), cur = target.stages[st];
      if (dl > 0 ? cur < STAGE_CAP[st] : cur > -STAGE_CAP[st]) return status;
    }
    return dmg[rand(dmg.length)];
  }
  const foeName = () => (trainer ? `${trainer.gym.short}'s ${nm(F)}` : 'Wild ' + nm(F));
  async function useMove(who, name) {
    const a = who === 'p' ? A() : F, d = who === 'p' ? F : A();
    const aName = who === 'p' ? nm(a) : foeName(), dName = who === 'p' ? foeName() : nm(d);
    const M = MOVES[name];
    await say(`${aName} used ${name}!`);
    if (M.effect) {
      const [st, dl, tg] = M.effect, target = tg === 'self' ? a : d;
      const tSide = (tg === 'self') === (who === 'p') ? 'p' : 'e', tName = tg === 'self' ? aName : dName;
      if (tg === 'self') { await animHop(who); await animHop(who); } else await animShake(who);
      const cur = target.stages[st];
      if (dl > 0 ? cur >= STAGE_CAP[st] : cur <= -STAGE_CAP[st]) { await say("Nothing happened. It's maxed out!"); return; }
      target.stages[st] += dl;
      if (tg !== 'self') await animShake(tSide);
      if (st === 'eva') await say(`${tName} is harder to hit now!`);
      else await say(`${tName}'s ${st === 'atk' ? 'attack' : 'defense'} ${dl > 0 ? 'rose' : 'fell'}!`);
      return;
    }
    await animMove(who, M);
    // A slash move (sure: true) can't miss. Otherwise roll against accuracy, made lower by the target's DODGE boosts.
    const acc = M.sure ? Infinity : (M.acc * 3) / (3 + Math.max(0, d.stages.eva));
    if (Math.random() * 100 >= acc) { await say(M.acc < 100 && d.stages.eva <= 0 ? `${aName} missed!` : `${dName} dodged it!`); return; }
    const mult = effectiveness(M.type, SPECIES[d.sp].types);
    const atk = a.atk * stageMult(a.stages.atk), def = d.def * stageMult(d.stages.def);
    let dmg = Math.floor(M.power * (atk / def) * 0.75 * (0.85 + Math.random() * 0.15) * (1 + a.lv / 20) * mult) + 1;
    const crit = Math.random() < 1 / 12; if (crit) dmg = Math.floor(dmg * 1.5);
    await animHit(who === 'p' ? 'e' : 'p');
    if (who === 'p') B.dealt.add(a);
    await drainHp(d, Math.max(0, d.hp - dmg));
    if (crit) await say('A super hit!');
    if (mult > 1) await say("It's super effective!");
    else if (mult < 1) await say("It's not very effective...");
  }
  // After each action: did someone run out of energy?
  async function afterAction() {
    if (F.hp <= 0) {
      if (!trainer) { await winSeq(); return 'end'; }
      await trainerFoeDown();
      if (trainer.idx < trainer.team.length - 1) { trainer.idx++; F = trainer.team[trainer.idx]; await sendFoe(); return 'switched'; }
      await trainerWin();
      return 'end';
    }
    if (A().hp <= 0) {
      await tween(450, t => { B.me.y = 24 * t; B.me.alpha = 1 - t; });
      B.me.vis = false;
      await say(`${nm(A())} is out of energy!`);
      if (party.some(c => c.hp > 0)) {
        let i = await pickTeam({ title: 'Who goes next?', forced: true, battleIdx: ai });
        while (party[i].hp <= 0) {
          await say(`${nm(party[i])} has no energy left!`);
          i = await pickTeam({ title: 'Who goes next?', forced: true, battleIdx: ai });
        }
        ai = i; await sendIn();
        return 'switched';
      }
      await say('Your whole team is out of energy...');
      if (trainer) await say(`${trainer.gym.short}: ${trainer.id.startsWith('rival:') ? RIVAL.taunt : '"Good try! Rest up and come back."'}`);
      const nearTown = TOWN_AT[areaIndex(player.x) * AW];
      await say(nearTown ? `You hurried to the ${TOWNS[nearTown.id].rest}.` : 'You hurried home for a nap.');
      await endBattle(true);
      return 'end';
    }
    return null;
  }
  async function sendIn() {
    const c = A();
    c.stages = { atk: 0, def: 0, eva: 0 }; c.shownHp = c.hp; c.shownXp = c.xp;
    B.me = { x: -170, y: 0, flash: false, alpha: 1, vis: true };
    updateHud(); playerBox.hidden = false;
    await tween(380, t => (B.me.x = -170 * (1 - t)), easeOut);
    await say(`Go, ${nm(c)}!`);
  }
  async function recall() {
    await say(`Come back, ${nm(A())}!`);
    await tween(260, t => (B.me.x = -170 * t), easeIn);
    B.me.vis = false;
  }
  async function takeTurn(act) {
    const fMove = foePick();
    if (act.type === 'move') {
      const pFirst = A().spd > F.spd || (A().spd === F.spd && Math.random() < 0.5);
      const order = pFirst ? [['p', act.move], ['e', fMove]] : [['e', fMove], ['p', act.move]];
      for (const [who, mv] of order) {
        await useMove(who, mv);
        const r = await afterAction();
        if (r === 'end') return 'end';
        if (r === 'switched') return 'go';
      }
      return 'go';
    }
    if (act.type === 'run') {
      if (Math.random() < 0.7) { await say('You got away safely!'); await endBattle(false); return 'end'; }
      await say("Couldn't get away!");
    } else if (act.type === 'snack') {
      const c = A(), heal = snackHeal(c);
      bag.snack--;
      await say(`You gave ${nm(c)} a snack!`);
      await drainHp(c, c.hp + heal);
      await say(`Yum! +${heal} HP`);
    } else if (act.type === 'pod') {
      if (await throwPod(act.mega)) return 'end';
    } else if (act.type === 'switch') {
      await recall(); ai = act.to; await sendIn();
    }
    await useMove('e', fMove);
    return (await afterAction()) === 'end' ? 'end' : 'go';
  }
  async function throwPod(mega = false) {
    if (mega) bag.mega--; else bag.pod--;
    await say(mega ? 'You threw a MEGA POD!' : 'You threw a POD!');
    const from = { x: 14, y: 112 }, to = { x: FOE_POS.x, y: FOE_POS.y - 26 };
    B.pod = { x: from.x, y: from.y, wob: 0, glow: 0, mega };
    await tween(450, t => { B.pod.x = from.x + (to.x - from.x) * t; B.pod.y = from.y + (to.y - from.y) * t - 40 * Math.sin(Math.PI * t); });
    overlay.flash = 0.6;
    await tween(260, t => { overlay.flash = 0.6 * (1 - t); B.foe.scale = 1 - t; B.foe.alpha = 1 - 0.8 * t; });
    B.foe.vis = false;
    await tween(220, t => (B.pod.y = to.y + (FOE_POS.y - 6 - to.y) * t), easeIn);
    const p = Math.min(0.95, SPECIES[F.sp].catchRate * (1.4 - F.hp / F.maxHp) * (mega ? MEGA_POD.boost : 1));
    const each = Math.pow(p, 1 / 3);
    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      await wait(380);
      if (Math.random() >= each) break;
      shakes++;
      await tween(320, t => (B.pod.wob = Math.round(Math.sin(t * Math.PI * 2) * 3)));
      B.pod.wob = 0;
    }
    if (shakes === 3) {
      await wait(250); B.pod.glow = 1;
      await say(`Gotcha! ${F.shiny ? 'The SHINY ' : ''}${nm(F)} was caught!`);
      const c = makeCritter(F.sp, F.lv, F.shiny);
      c.hp = Math.max(1, F.hp); c.shownHp = c.hp;
      const caughtLegend = SPECIES[F.sp].legendary;
      if (caughtLegend) flags.legend = { ...(flags.legend || {}), [F.sp]: true };
      enemyBox.hidden = true;
      if (party.length < TEAM_MAX) { party.push(c); await say(`${nm(F)} joined your team! (${party.length}/${TEAM_MAX})`); }
      else { box.push(c); await say(`Your team is full, so ${nm(F)} went to your BOX.`); }
      B.pod = null;
      if (caughtLegend) await giveCandy('legend:' + F.sp);
      await shareXp(4 + F.lv * 2);
      await endBattle(false);
      return true;
    }
    B.pod = null; B.foe.vis = true;
    await tween(220, t => { B.foe.scale = t; B.foe.alpha = 0.2 + 0.8 * t; });
    B.foe.scale = 1; B.foe.alpha = 1;
    await say(['Oh no! It broke right out!', 'Argh! Almost had it!', 'So close!'][shakes]);
    return false;
  }

  /* ============ XP, levels and the level cap ============ */
  function capLine(c) {
    const nextGym = Object.keys(GYMS).find(g => !flags.badges[g] && (LEVEL_CAP[g] || 0) > levelCap());
    return nextGym ? `${nm(c)} can't grow past Lv ${levelCap()} until you beat the ${GYMS[nextGym].hall}!`
      : `${nm(c)} is at the max level, Lv ${levelCap()}!`;
  }
  function bumpLevel(c) {
    c.lv++; applyStats(c); c.xp = 0; c.shownXp = 0; c.xpNext = xpNeed(c.lv); c.shownHp = c.hp;
    return Object.entries(SPECIES[c.sp].learn || {}).filter(([, l]) => l === c.lv).map(([m]) => m);
  }
  // Animated XP for the critter in battle.
  async function gainXp(c, gain) {
    if (c.lv >= levelCap()) { await say(capLine(c)); return; }
    await say(`${nm(c)} got ${gain} XP!`);
    let left = gain;
    while (left > 0) {
      if (c.lv >= levelCap()) { c.xp = 0; c.shownXp = 0; updateHud(); await say(capLine(c)); return; }
      const add = Math.min(c.xpNext - c.xp, left), from = c.xp;
      c.xp += add; left -= add;
      await tween(450, t => { c.shownXp = from + add * t; updateHud(); });
      if (c.xp >= c.xpNext) {
        const learned = bumpLevel(c); updateHud();
        await animHop('p');
        await say(`${nm(c)} grew to Lv ${c.lv}!`);
        for (const m of learned) await say(`${nm(c)} learned ${m}!`);
      }
    }
  }
  // Split fight XP across the team (see XP_SHARE): full share for critters that did damage and are still standing,
  // a smaller share for the rest of the team, a little for knocked-out ones. Critters in the BOX get nothing.
  const shareOf = c => (c.hp <= 0 ? XP_SHARE.knockedOut : B.dealt.has(c) ? XP_SHARE.fought : XP_SHARE.watched);
  async function shareXp(base) {
    const me = A();
    if (me.hp > 0) await gainXp(me, Math.max(1, Math.round(base * shareOf(me))));
    const lines = [];
    for (const c of party) if (c !== me || me.hp <= 0) lines.push(...addXpQuiet(c, Math.max(1, Math.round(base * shareOf(c)))));
    if (party.length > 1) await say('The rest of your team got XP too!');
    for (const l of lines) await say(l);
  }
  // Quiet XP for the rest of the team; returns lines to show.
  function addXpQuiet(c, gain) {
    const lines = []; let left = gain, grew = false;
    while (left > 0 && c.lv < levelCap()) {
      const add = Math.min(c.xpNext - c.xp, left);
      c.xp += add; left -= add;
      if (c.xp >= c.xpNext) { grew = true; bumpLevel(c).forEach(m => lines.push(`${nm(c)} learned ${m}!`)); }
    }
    if (c.lv >= levelCap()) { c.xp = 0; c.shownXp = 0; }
    c.shownXp = c.xp;
    if (grew) lines.unshift(`${nm(c)} grew to Lv ${c.lv}!`);
    return lines;
  }

  async function winSeq() {
    const S = SPECIES[F.sp];
    if (S.exitAnim === 'fly') await tween(650, t => { B.foe.x = 120 * t; B.foe.y = -80 * t; }, easeIn);
    else if (S.exitAnim === 'dash') await tween(450, t => (B.foe.x = 200 * t), easeIn);
    else await tween(650, t => { B.foe.x = 130 * t; B.foe.y = -16 * Math.abs(Math.sin(Math.PI * t * 2)); });
    B.foe.vis = false; enemyBox.hidden = true;
    await say(`The wild ${nm(F)} is all tuckered out!`);
    await say(S.exit || 'It wandered off.');
    if (S.legendary) await giveCandy('legend:' + F.sp);
    await shareXp(8 + F.lv * 3);
    if (Math.random() < 0.25) { bag.pod++; await say(`You found a POD on the ${areaAt(player.x).kind === 'meadow' ? 'grass' : 'trail'}!`); }
    await endBattle(false);
  }
  async function endBattle(lost) {
    hideTextbox();
    await tween(350, t => (overlay.fade = t));
    enemyBox.hidden = true; playerBox.hidden = true;
    scene = 'world'; trainer = null;
    party.forEach(c => (c.stages = { atk: 0, def: 0, eva: 0 }));
    if (lost) {
      const nearTown = TOWN_AT[areaIndex(player.x) * AW];
      if (nearTown) Object.assign(player, { ...nearTown.rest, face: 'up', moving: false });
      else Object.assign(player, { x: 5, y: 6, face: 'down', moving: false });
      placePal();
      healAll(); bag.snack = Math.max(bag.snack, 3);
    }
    stepsSince = 0;
    save();
    const evolvers = lost ? [] : party.filter(canEvolve);
    if (evolvers.length) for (let i = 0; i < evolvers.length; i++) await runEvolution(evolvers[i], i === 0);
    else await tween(350, t => (overlay.fade = 1 - t));
    if (lost) await worldSay(['Your whole team is full of energy again!', 'You packed 3 snacks.']);
    await announceGates();
    mode = 'world';
  }
  function newWild() {
    const area = areaAt(player.x);
    const region = area.encounters || ((player.x % AW) >= 15 ? 'north' : 'south');
    const enc = ENCOUNTERS[region];
    const total = enc.table.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total, base = enc.table[0][0];
    for (const [k, w] of enc.table) { if ((roll -= w) < 0) { base = k; break; } }
    const top = Math.max(...party.map(c => c.lv));
    const lv = Math.max(enc.min, Math.min(enc.max, top - 2 + rand(4)));
    const fam = FAMILY[base];
    const shiny = !!fam && Math.random() < shinyChance(fam);
    battleBg = BG[{ mountains: 'mountain', forest: 'forest', volcano: 'volcano', prehistoric: 'prehistoric' }[area.kind] || 'meadow'];
    return makeCritter(grownForm(base, lv), lv, shiny);
  }
  async function battleLoop() {
    for (;;) {
      const c = await chooseMenu([{ label: 'FIGHT' }, { label: 'BAG' }, { label: 'TEAM' }, { label: 'RUN' }],
        { layout: 'side', prompt: `What will ${nm(A())} do?` });
      let r;
      if (c === 0) {
        const s = SPECIES[A().sp];
        const items = s.moves.map(m => {
          const at = (s.learn || {})[m] || 0, locked = at > A().lv;
          return { label: locked ? '???' : m, sub: locked ? 'Lv ' + at : moveSub(m), moveType: locked ? null : MOVES[m].type, locked, at };
        });
        const m = await chooseMenu(items, { layout: 'full', canBack: true });
        if (m < 0) continue;
        if (items[m].locked) { await say(`${nm(A())} learns this move at Lv ${items[m].at}.`); continue; }
        r = await takeTurn({ type: 'move', move: s.moves[m] });
      } else if (c === 1) {
        const b = await chooseMenu([{ label: 'SNACK', sub: '×' + bag.snack }, { label: 'POD', sub: '×' + bag.pod }, { label: 'MEGA POD', sub: '×' + (bag.mega || 0) }],
          { layout: 'full', canBack: true, cols: 3 });
        if (b < 0) continue;
        if (b === 0) {
          if (bag.snack <= 0) { await say('No snacks left! Nap at home to get more.'); continue; }
          if (A().hp >= A().maxHp) { await say(`${nm(A())} is already full of energy!`); continue; }
          r = await takeTurn({ type: 'snack' });
        } else {
          const mega = b === 2;
          if (trainer) { await say(`You can't catch ${trainer.gym.short}'s critters!`); continue; }
          if (mega && !(bag.mega > 0)) { await say('No MEGA PODS! Win them from gyms and legendaries.'); continue; }
          if (!mega && bag.pod <= 0) { await say('No pods left! Nap at home to get more.'); continue; }
          r = await takeTurn({ type: 'pod', mega });
        }
      } else if (c === 2) {
        const i = await pickTeam({ title: 'Switch to who?', battleIdx: ai });
        if (i < 0) continue;
        if (i === ai) { await say(`${nm(A())} is already battling!`); continue; }
        if (party[i].hp <= 0) { await say(`${nm(party[i])} has no energy left!`); continue; }
        r = await takeTurn({ type: 'switch', to: i });
      } else {
        if (trainer) { await say(trainer.npc ? "You can't run from a trainer battle!" : "You can't run from a gym battle!"); continue; }
        r = await takeTurn({ type: 'run' });
      }
      if (r === 'end') return;
    }
  }
  async function battleIntro() {
    mode = 'busy'; dirStack.length = 0;
    if (!RM) for (let i = 0; i < 3; i++) { await tween(80, t => (overlay.flash = t)); await tween(80, t => (overlay.flash = 1 - t)); }
    await tween(420, t => (overlay.bars = t));
    scene = 'battle'; resetBattleSprites();
    ai = Math.max(0, party.findIndex(c => c.hp > 0));
    const c = A(); c.stages = { atk: 0, def: 0, eva: 0 }; c.shownHp = c.hp; c.shownXp = c.xp;
  }
  async function startBattle(fixed = null) {
    mode = 'busy';
    bang = true; await wait(550); bang = false;
    await battleIntro();
    if (fixed) {
      F = makeCritter(fixed.sp, fixed.lv);
      battleBg = BG[{ mountains: 'mountain', forest: 'forest', volcano: 'volcano', prehistoric: 'prehistoric' }[LEGENDS[fixed.sp]?.area] || 'meadow'];
    } else F = newWild();
    B.me.x = -170; B.foe.x = 170; updateHud();
    await tween(380, t => (overlay.bars = 1 - t));
    await tween(480, t => { B.me.x = -170 * (1 - t); B.foe.x = 170 * (1 - t); }, easeOut);
    enemyBox.hidden = false;
    if (F.shiny) { B.sparkle = performance.now(); await say(`Whoa! It's a SHINY ${nm(F)}!`); }
    else if (SPECIES[F.sp].legendary) { B.shake = 5; await say(`It's the LEGENDARY ${nm(F)}!`); B.shake = 0; }
    else if (SPECIES[F.sp].rare) await say('Whoa! A super rare critter!');
    await say(`A wild ${nm(F)} ${SPECIES[F.sp].appear || 'appeared'}!`);
    playerBox.hidden = false;
    await say(`Go, ${nm(A())}!`);
    await battleLoop();
  }

  /* ============ the gym battle ============ */
  // Gym leaders and the trainers out in the world battle the same way. npc = a world trainer (no badge, fights on the area's ground).
  async function startTrainerBattle(id, gym, npc) {
    await battleIntro();
    trainer = { id, gym, npc, team: gym.team.map(([sp, lv]) => makeCritter(sp, lv)), idx: 0 };
    battleBg = npc ? BG[{ mountains: 'mountain', forest: 'forest', volcano: 'volcano', prehistoric: 'prehistoric' }[areaAt(player.x).kind] || 'meadow']
      : (BG['gym-' + id] || BG['gym-pebble']);
    F = null;
    B.foe.vis = false; B.leader = { x: 170, vis: true }; B.me.x = -170; updateHud();
    await tween(380, t => (overlay.bars = 1 - t));
    await tween(480, t => { B.me.x = -170 * (1 - t); B.leader.x = 170 * (1 - t); }, easeOut);
    await say(`${gym.leader} wants to battle!`);
    await tween(350, t => (B.leader.x = 170 * t), easeIn);
    B.leader.vis = false;
    F = trainer.team[0];
    await sendFoe();
    playerBox.hidden = false;
    await say(`Go, ${nm(A())}!`);
    await battleLoop();
  }
  async function sendFoe() {
    B.foe = { x: 170, y: 0, flash: false, alpha: 1, vis: true, scale: 1 };
    updateHud();
    await tween(420, t => (B.foe.x = 170 * (1 - t)), easeOut);
    enemyBox.hidden = false;
    await say(`${trainer.gym.short} sent out ${nm(F)}!`);
  }
  async function trainerFoeDown() {
    await tween(450, t => { B.foe.y = 20 * t; B.foe.alpha = 1 - t; });
    B.foe.vis = false; enemyBox.hidden = true;
    await say(`${trainer.gym.short}'s ${nm(F)} is out of energy!`);
    await shareXp((8 + F.lv * 3) * trainer.gym.xpMultiplier);
  }
  async function trainerWin() {
    const gym = trainer.gym;
    B.leader = { x: 170, vis: true };
    await tween(400, t => (B.leader.x = 170 * (1 - t)), easeOut);
    await say(`You beat ${gym.leader}!`);
    if (trainer.id.startsWith('rival:')) {
      const g = trainer.id.slice(6);
      await say(`${gym.short}: ${gym.win}`);
      flags.rival = { ...(flags.rival || {}), [g]: true }; flags.rivalAt = null; placeRival();
      const [item, n] = gym.prize;
      bag[item] = (bag[item] || 0) + n; save();
      await say(`${gym.short} threw you ${n} ${item === 'pod' ? 'PODS' : 'SNACKS'} and stomped off.`);
      await endBattle(false);
      return;
    }
    if (trainer.npc) {
      const key = trainer.id.slice(4), first = !flags.trainers?.[key];
      await say(`${gym.short}: ${gym.win}`);
      if (first) {
        flags.trainers = { ...(flags.trainers || {}), [key]: true };
        const [item, n] = gym.prize;
        bag[item] = (bag[item] || 0) + n; save();
        await say(`${gym.short} gave you ${n} ${item === 'pod' ? 'PODS' : 'SNACKS'}!`);
      }
      await endBattle(false);
      return;
    }
    const firstBadge = !flags.badges[trainer.id], gymId = trainer.id;
    if (firstBadge) {
      flags.badges = { ...flags.badges, [trainer.id]: true }; save();
      await say(`${gym.short}: "You earned the ${gym.badge}!"`);
      await giveCandy('gym:' + trainer.id);
      await say(`Snacks now heal ${Math.round(snackPct() * 100)}% of HP!`);
      await say(`Your critters can now grow all the way to Lv ${levelCap()}!`);
    } else {
      await say(`${gym.short}: "Wow, you're getting strong!"`);
    }
    await say(`Gym prize: every critter on your team gets ${gym.teamPrize} XP!`);
    for (const c of party) if (c !== A()) for (const line of addXpQuiet(c, gym.teamPrize)) await say(line);
    await gainXp(A(), gym.teamPrize);
    await endBattle(false);
    if (firstBadge && RIVAL.teams[gymId] && !flags.rival?.[gymId]) { await wait(400); await rivalBattle(gymId, false); }
  }
  // Tell the player when a new area's gate has just opened.
  async function announceGates() {
    for (let i = 1; i < AREAS.length; i++) {
      const key = 'gate:' + AREAS[i].id;
      if (!flags.seen[key] && gateOpenFor(i)) {
        flags.seen = { ...flags.seen, [key]: true }; save();
        await worldSay(['Somewhere to the east, a gate creaks open...', `The ${AREAS[i].name} is open to you now!`]);
      }
    }
  }

  /* ============ evolution ============ */
  const canEvolve = c => { const e = SPECIES[c.sp].evolve; return !!e && c.lv >= e.lv; };
  async function runEvolution(c, alreadyDark = false) {
    mode = 'busy';
    const from = c.sp, evo = SPECIES[from].evolve;
    let to = evo.to;
    if (!alreadyDark) await tween(350, t => (overlay.fade = t));
    scene = 'evolve'; E.sp = from; E.white = false; E.shiny = shinyCfg(c);
    await tween(350, t => (overlay.fade = 1 - t));
    await say(`What's this? ${SPECIES[from].name} is evolving!`);
    if (evo.choices) {
      await say(`${SPECIES[from].name} can grow two different ways. You choose!`);
      const shinyLook = shinyCfg(c);
      const cards = evo.choices.map(sp => {
        const b = document.createElement('button');
        b.className = 'cq-card cq-card-choice';
        b.innerHTML = `<img alt="" src="${spriteURL(sp, shinyLook)}"><span class="cq-card-body"><span class="cq-card-top"><b>${SPECIES[sp].name}</b></span>
          <span class="cq-types">${typePills(SPECIES[sp].types)}</span><span class="cq-odds">${SPECIES[sp].blurb || ''}</span></span>`;
        return { node: b };
      });
      to = evo.choices[await chooseMenu(cards, { panelMode: true, cols: 2, title: 'Which way should it grow?' })];
    } else to = evolveTarget(from);
    hideTextbox();
    E.white = true;
    let delay = 380;
    for (let i = 0; i < 16; i++) { E.sp = i % 2 ? to : from; await wait(delay); delay = Math.max(55, delay * 0.84); }
    E.sp = to;
    await tween(200, t => (overlay.flash = t));
    E.white = false; c.sp = to; applyStats(c); c.shownHp = c.hp; E.shiny = shinyCfg(c); save();
    await tween(500, t => (overlay.flash = 1 - t));
    await say(`${SPECIES[from].name} evolved into ${SPECIES[to].name}!`);
    for (const m of SPECIES[to].moves.filter(m => !SPECIES[from].moves.includes(m))) await say(`${SPECIES[to].name} learned ${m}!`);
    const newTypes = SPECIES[to].types.filter(t => !SPECIES[from].types.includes(t));
    if (newTypes.length) await say(`${SPECIES[to].name} is now part ${newTypes.join(' and ')} type!`);
    hideTextbox();
    await tween(350, t => (overlay.fade = t));
    scene = 'world';
    await tween(350, t => (overlay.fade = 1 - t));
    mode = 'world';
  }

  /* ============ new game / continue ============ */
  async function newGame() {
    mode = 'busy'; hideTextbox(); panel.hidden = true; enemyBox.hidden = true; playerBox.hidden = true;
    await tween(300, t => (overlay.fade = t));
    Object.assign(player, { x: 5, y: 6, face: 'down', moving: false, steps: 0 });
    Object.assign(pal, { x: 6, y: 6, faceLeft: true, moving: false });
    party = []; box = []; F = null; trainer = null; bag = { snack: 3, pod: 5, mega: 0, candy: 0 }; flags = { badges: {}, seen: {} }; chooseIdx = 0; placeRival();
    scene = 'choose'; banner.hidden = false;
    await tween(300, t => (overlay.fade = 1 - t));
    await say('Welcome to MAPLE HILL!');
    await say('Every kid here gets a critter partner.');
    for (;;) {
      const i = await chooseMenu(STARTERS.map(s => ({ label: SPECIES[s].name })),
        { layout: 'full', cols: 3, start: chooseIdx, onChange: n => (chooseIdx = n) });
      chooseIdx = i;
      const s = SPECIES[STARTERS[i]];
      for (const l of s.blurb) await say(l);
      const yes = await chooseMenu([{ label: 'YES' }, { label: 'NO' }], { layout: 'side', cols: 1, prompt: `Choose ${s.name}?` });
      if (yes === 0) break;
    }
    party = [makeCritter(STARTERS[chooseIdx], 5)];
    flags.starter = STARTERS[chooseIdx];
    save();
    await say(`You and ${nm(party[0])} are partners now!`);
    hideTextbox(); banner.hidden = true;
    await tween(300, t => (overlay.fade = t));
    scene = 'world';
    await tween(300, t => (overlay.fade = 1 - t));
    await worldSay(['Walk with the arrow keys or the D-pad.', 'Press A to read signs. Press B for your team and bag.', 'Find wild critters in the tall grass!']);
  }
  async function boot() {
    const d = loadSave();
    if (!d) return newGame();
    restore(d);
    placeRival();
    scene = 'world'; mode = 'busy';
    const c = await chooseMenu([{ label: 'CONTINUE' }, { label: 'NEW GAME' }], { layout: 'side', cols: 1, prompt: 'Welcome back!' });
    if (c === 1) {
      const y = await chooseMenu([{ label: 'NO' }, { label: 'YES' }], { layout: 'side', cols: 1, prompt: 'Erase your team and start over?' });
      if (y === 1) return newGame();
    }
    hideTextbox(); mode = 'world';
  }

  /* ============ dev tools (only rendered in dev, or with ?dev in the URL) ============ */
  async function devLevel(n) {
    if (mode !== 'world' || player.moving || !party.length) return;
    mode = 'busy';
    const c = party[0], learned = [];
    for (let i = 0; i < n && c.lv < levelCap(); i++) learned.push(...bumpLevel(c));
    c.hp = c.maxHp; c.shownHp = c.hp; save();
    await say(`${nm(c)} is now Lv ${c.lv}!`);
    for (const m of learned) await say(`${nm(c)} learned ${m}!`);
    if (c.lv >= levelCap()) await say(capLine(c));
    hideTextbox();
    if (canEvolve(c)) await runEvolution(c, false);
    await announceGates();
    mode = 'world';
  }
  async function devWarpTown() {
    if (mode !== 'world' || player.moving || !party.length) return;
    mode = 'busy';
    await tween(250, t => (overlay.fade = t));
    let i = AREAS.length - 1;
    while (i > 0 && !(AREAS[i].town && gateOpenFor(i))) i--;
    if (!AREAS[i].town) i = AREAS.findIndex(a => a.town);
    Object.assign(player, { x: i * AW + 15, y: AH + 6, face: 'down' }); placePal();
    await tween(250, t => (overlay.fade = 1 - t));
    mode = 'world';
  }
  const devButtons = [];
  const devTool = (name, fn) => {
    const el = q(name); if (!el) return;
    const h = () => { el.blur(); fn(); };
    el.addEventListener('click', h); devButtons.push(() => el.removeEventListener('click', h));
  };
  if (dev) {
    devTool('devLv1', () => devLevel(1));
    devTool('devLv5', () => devLevel(5));
    devTool('devBattle', () => { if (mode === 'world' && !player.moving && party.length) startBattle(); });
    devTool('devPods', () => {
      if (!party.length || mode !== 'world') return;
      bag.pod += 10;
      let added = 0;
      while (party.length < TEAM_MAX && added < SHINY_TRADE_COST) { party.push(makeCritter('fox', 6 + added)); added++; }
      save(); worldSay([`+10 pods, and ${added} test FOXes joined your team.`]);
    });
    devTool('devTown', devWarpTown);
    devTool('devNew', () => { if (mode === 'world') newGame(); });
  }

  // Spine Slice: a line of fire cuts across the screen, then the two halves slide apart.
  function drawSlice() {
    const yL = 100, yR = 56, d = Math.round(overlay.slice * 9);
    if (d > 0) {
      sliceCtx.clearRect(0, 0, 240, 160); sliceCtx.drawImage(cv, 0, 0);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, 240, 160);
      const half = (pts, dx, dy) => {
        ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
        ctx.drawImage(sliceBuf, dx, dy); ctx.restore();
      };
      half([[0, 0], [240, 0], [240, yR], [0, yL]], -d, -d);
      half([[0, yL], [240, yR], [240, 160], [0, 160]], d, d);
    }
    const x1 = 240 * Math.min(1, overlay.sliceLine), fl = Math.floor(performance.now() / 50) % 2;
    for (const [col, w] of [['#e2392b', 5], [fl ? '#ffd23f' : '#ff7a2a', 3], ['#fff6c2', 1]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(0, yL); ctx.lineTo(x1, yL + (yR - yL) * (x1 / 240)); ctx.stroke();
    }
  }

  /* ============ main loop ============ */
  let last = performance.now(), raf = 0;
  function frame(now) {
    if (dead) return;
    const dt = Math.min(50, now - last); last = now;
    if (scene === 'world') update(dt);
    ctx.clearRect(0, 0, 240, 160);
    if (scene === 'world') drawWorld(now);
    else if (scene === 'battle') drawBattle(now);
    else if (scene === 'choose') drawChoose(now);
    else drawEvolve(now);
    if (overlay.blue > 0) { ctx.fillStyle = `rgba(40,120,255,${overlay.blue})`; ctx.fillRect(0, 0, 240, 160); }
    if (overlay.sliceLine > 0) drawSlice();
    if (overlay.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${overlay.flash})`; ctx.fillRect(0, 0, 240, 160); }
    if (overlay.bars > 0) { ctx.fillStyle = '#000'; const h = Math.round(80 * overlay.bars); ctx.fillRect(0, 0, 240, h); ctx.fillRect(0, 160 - h, 240, h); }
    if (overlay.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${overlay.fade})`; ctx.fillRect(0, 0, 240, 160); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  boot();

  return function destroy() {
    dead = true;
    cancelAnimationFrame(raf);
    if (sayState) clearInterval(sayState.timer);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    padCleanups.forEach(f => f());
    devButtons.forEach(f => f());
    screenEl.classList.remove('is-quaking');
    hideTextbox(); panel.hidden = true; enemyBox.hidden = true; playerBox.hidden = true; banner.hidden = true;
  };
}
