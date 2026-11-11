// Critter Quest — game engine.
// startGame(rootElement, { dev }) boots the game inside the markup from CritterQuest.jsx
// and returns a cleanup function (safe with React StrictMode double-mounting).

import { buildArt, hash, T } from './art.js';
import {
  SPECIES, MOVES, STARTERS, ENCOUNTERS, TYPE_COLORS, GATE_LEVEL, TEAM_MAX, LEVEL_CAP,
  FAMILY, SHINY, SHINY_ORDER, LUCK_MAX, GYMS, AREAS, TOWNS,
  effectiveness, moveSub, xpNeed, applyStats, makeCritter, grownForm,
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
  const { KID, sprites, TILES, HOUSES, GYM_IMG, LEADERS, BG, spriteURL } = buildArt(SPECIES);

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
  const SIGNS = {}, DOORS = {}, GATES = {}, BUILDINGS = [], TOWN_AT = {};
  const map = [];
  (function buildMap() {
    for (let y = 0; y < MH; y++) map.push(Array(MW).fill('.'));
    const set = (x, y, ch) => { if (x >= 0 && y >= 0 && x < MW && y < MH) map[y][x] = ch; };
    const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
    const sign = (x, y, lines) => { SIGNS[x + ',' + y] = lines; };
    const building = (x, y, img, door) => {
      BUILDINGS.push({ x, y, img });
      rect(x, y, x + img.width / T - 1, y + img.height / T - 1, 'h');
      if (door) DOORS[door.x + ',' + door.y] = door;
    };
    const WALL = { meadow: 'T', mountains: 'M', forest: 'Y' };

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
        sign(ox + 7, 7, ['MAPLE HILL', 'Home of brave kids and their critter partners.']);
        sign(ox + 13, 7, ['TYPE TIPS', 'WATER beats FIRE. FIRE beats GRASS.', 'GRASS beats WATER. FIGHTING smashes ROCK and STEEL!']);
        sign(ox + 19, 8, ['NORTH MEADOW', 'Rabbits and bluebirds live here. All below Lv 10.']);
        sign(ox + 11, 15, ['FOX HOLLOW', 'Watch out! Foxes like the grass over here.']);
        R(0, AH, AW - 1, MH - 1, 'T');   // thick woods below Maple Hill
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
      if (area.town) { L(15, AH - 1, '='); buildTown(ox, TOWNS[area.town], area.town); }
    });

    function buildTown(ox, town, id) {
      const oy = AH, L = (x, y, ch) => set(ox + x, oy + y, ch), R = (x0, y0, x1, y1, ch) => rect(ox + x0, oy + y0, ox + x1, oy + y1, ch);
      R(0, 0, AW - 1, TH - 1, '.');
      R(15, 0, 15, 7, '='); R(3, 7, 28, 7, '=');          // trail in, main road
      R(9, 7, 9, 13, '='); R(9, 13, 15, 13, '=');         // path round to the gym door
      [[10,4],[11,5],[19,4],[20,5],[6,9],[25,9],[13,14],[18,14],[27,13],[3,13]].forEach(([x, y]) => L(x, y, '*'));
      [[2,1],[2,2],[29,1],[29,2],[12,1],[19,1],[27,10],[28,10],[4,11],[5,12],[22,12],[24,11],[29,14]].forEach(([x, y]) => L(x, y, 'T'));
      if (town.trader) building(ox + 3, oy + 3, HOUSES.blue, { x: ox + 5, y: oy + 6, type: 'trader', town: id });
      else [[4,4],[6,3],[3,5]].forEach(([x, y]) => L(x, y, 'T'));
      building(ox + 22, oy + 3, town.trader ? HOUSES.green : HOUSES.straw, { x: ox + 24, y: oy + 6, type: 'rest', town: id });
      building(ox + 11, oy + 8, town.trader ? GYM_IMG.stone : GYM_IMG.wood, { x: ox + 15, y: oy + 12, type: 'gym', town: id });
      sign(ox + 16, oy + 1, [town.name, town.tagline]);
      if (town.trader) sign(ox + 8, oy + 6, ['SHINY TRADER', 'Bring a bunny, get luckier at finding shinies!']);
      sign(ox + 21, oy + 6, [town.rest, 'Free naps for tired critters.']);
      const gym = GYMS[town.gym];
      sign(ox + 16, oy + 13, [gym.hall, `Leader: ${gym.short}. Win the ${gym.badge}!`]);
      for (let x = 0; x < AW; x++) L(x, TH - 1, 'T');
      for (let y = 0; y < TH; y++) { L(0, y, 'T'); L(AW - 1, y, 'T'); }
      TOWN_AT[ox] = { id, rest: { x: ox + 24, y: oy + 7 } };
    }
    for (const k of Object.keys(SIGNS)) { const [x, y] = k.split(',').map(Number); set(x, y, 'S'); }
    for (const k of Object.keys(DOORS)) { const [x, y] = k.split(',').map(Number); set(x, y, 'D'); }
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
    return !'T~hDSMPY'.includes(t);
  }
  const inTown = y => y >= AH;
  const townHere = (x, y) => (inTown(y) ? TOWN_AT[areaIndex(x) * AW] : null);

  /* ============ state ============ */
  let party = [];                 // up to 6 critters; party[0] is your lead and walks with you
  let bag = { snack: 3, pod: 5 };
  let flags = { luck: {}, badges: {}, seen: {} };   // badges won, shiny luck per family, places visited
  let ai = 0;                     // which party member is battling
  let F = null;                   // the critter you're fighting
  let trainer = null;             // set during the gym battle
  const A = () => party[ai];
  const player = { x: 5, y: 6, face: 'down', moving: false, t: 0, from: null, to: null, steps: 0 };
  const pal = { x: 6, y: 6, faceLeft: true, moving: false, from: null, to: null };
  let mode = 'busy';              // 'world' = free to walk; 'busy' = something scripted is happening
  let scene = 'choose';           // choose | world | battle | evolve
  let battleBg = BG.meadow;
  let stepsSince = 0, bang = false, chooseIdx = 0;
  const overlay = { flash: 0, bars: 0, fade: 0 };
  const B = { me: {}, foe: {}, leader: {}, shake: 0, proj: null, pod: null, sparkle: 0 };
  const E = { sp: null, white: false, shiny: null };
  function resetBattleSprites() {
    B.me = { x: 0, y: 0, flash: false, alpha: 1, vis: true };
    B.foe = { x: 0, y: 0, flash: false, alpha: 1, vis: true, scale: 1 };
    B.leader = { x: 0, vis: false };
    B.shake = 0; B.proj = null; B.pod = null; B.sparkle = 0;
  }
  resetBattleSprites();
  const levelCap = () => Math.max(LEVEL_CAP.start, ...Object.keys(flags.badges || {}).map(b => LEVEL_CAP[b] || 0));
  const luckOf = fam => flags.luck?.[fam] || 1;
  const oneIn = fam => Math.max(2, Math.round(SHINY[fam].oneIn / luckOf(fam)));
  const shinyChance = fam => Math.min(0.5, luckOf(fam) / SHINY[fam].oneIn);

  /* ============ saving (this browser only) ============ */
  function save() {
    if (!party.length) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, party: party.map(c => ({ sp: c.sp, lv: c.lv, xp: c.xp, hp: c.hp, shiny: !!c.shiny })),
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
    party = d.party.filter(p => SPECIES[p.sp]).slice(0, TEAM_MAX).map(p => {
      const c = makeCritter(p.sp, p.lv, !!p.shiny);
      c.xp = Math.max(0, Math.min(p.xp || 0, c.xpNext - 1)); c.shownXp = c.xp;
      c.hp = Math.max(0, Math.min(c.maxHp, p.hp ?? c.maxHp)); c.shownHp = c.hp;
      return c;
    });
    bag = { snack: d.bag?.snack ?? 3, pod: d.bag?.pod ?? 5 };
    flags = { luck: {}, badges: {}, seen: {}, ...(d.flags || {}) };
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
    if (it.sub) { const s = document.createElement('span'); s.className = 'cq-opt-sub'; s.textContent = it.sub; b.append(s); }
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
  function teamCard(c, tag) {
    const b = document.createElement('button');
    b.className = 'cq-card' + (c.hp <= 0 ? ' is-out' : '');
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
  // Shiny luck cards: a sparkly sprite, a star meter (one star per bunny traded) and "1 in N".
  function luckCard(fam) {
    const b = document.createElement('button');
    b.className = 'cq-card cq-card-luck';
    const stars = Math.round(Math.log2(luckOf(fam)));
    const meter = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 6 - stars));
    b.innerHTML = `
      <img alt="" src="${spriteURL(fam, SHINY[fam])}">
      <span class="cq-card-body">
        <span class="cq-card-top"><b>${SPECIES[fam].name}</b></span>
        <span class="cq-luck">${meter}</span>
        <span class="cq-odds">1 in ${oneIn(fam)} is shiny</span>
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
    const placeKey = town ? 'town:' + town.id : 'area:' + area.id;
    const welcome = town ? TOWNS[town.id].welcome : area.welcome;
    if (welcome && !flags.seen[placeKey]) {
      flags.seen = { ...flags.seen, [placeKey]: true }; save();
      worldSay(welcome);
      return;
    }
    const t = tileAt(player.x, player.y);
    if ((t === ',' || t === ';' || t === 'u') && stepsSince > 2 && Math.random() < 0.2) { startBattle(); return; }
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
    }
    else if (t === '~') worldSay(SPECIES[lead.sp].types.includes('WATER') ? [`${nm(lead)} splashes happily in the pond!`] : ['The pond sparkles in the sun.']);
    else if (t === 'M') worldSay(['A huge boulder. It is NOT a Rockalock. Probably.']);
    else if (pal.x === tx && pal.y === ty) worldSay([`${nm(lead)} looks happy to see you!`, `Lv ${lead.lv}  ·  HP ${lead.hp}/${lead.maxHp}`]);
  }
  function healAll() { party.forEach(c => { c.hp = c.maxHp; c.shownHp = c.hp; }); }
  async function restAt(door) {
    mode = 'busy';
    await say(door.type === 'home' ? 'You and your team take a nap at home...' : `${TOWNS[door.town].rest}: "Come in! Your critters can nap here."`);
    hideTextbox();
    await tween(300, t => (overlay.fade = t)); await wait(350);
    healAll(); bag.snack = Math.max(bag.snack, 3); bag.pod = Math.max(bag.pod, 5); save();
    await tween(300, t => (overlay.fade = 1 - t));
    await worldSay(['Your whole team is full of energy!', 'You packed snacks and pods for the road.']);
  }
  async function openWorldMenu() {
    mode = 'busy';
    for (;;) {
      const c = await chooseMenu([{ label: 'TEAM', sub: `${party.length}/${TEAM_MAX}` }, { label: 'BAG' }, { label: 'SHINY' }, { label: 'CLOSE' }],
        { layout: 'side', prompt: `Menu · Badges ${Object.keys(flags.badges).length}/${Object.keys(GYMS).length}`, canBack: true });
      if (c === 0) { await teamFlow(); continue; }
      if (c === 1) { await say(`SNACKS ×${bag.snack}    PODS ×${bag.pod}`); await say('Snacks heal. Pods catch wild critters!'); continue; }
      if (c === 2) { await showLuck('Shiny luck'); continue; }
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
  const snackHeal = c => Math.min(Math.max(12, Math.round(c.maxHp * 0.4)), c.maxHp - c.hp);

  /* ============ Pebble Town: the shiny trader ============ */
  const showLuck = title => chooseMenu(SHINY_ORDER.map(f => ({ node: luckCard(f) })), { panelMode: true, cols: 2, canBack: true, title });
  async function traderVisit() {
    mode = 'busy';
    await say('SHINY TRADER: "Hi! I LOVE bunnies!"');
    await say('"Give me a bunny and I\'ll make one kind of shiny 2x easier to find."');
    for (;;) {
      const c = await chooseMenu([{ label: 'TRADE' }, { label: 'LUCK' }, { label: 'BYE' }], { layout: 'side', prompt: 'What do you want to do?', canBack: true });
      if (c === 0) await bunnyTrade();
      else if (c === 1) await showLuck('Your shiny luck');
      else break;
    }
    await say('"Bring me more bunnies anytime!"');
    hideTextbox(); mode = 'world';
  }
  async function bunnyTrade() {
    const bunnies = party.map((c, i) => ({ c, i })).filter(o => FAMILY[o.c.sp] === 'rabbit');
    if (!bunnies.length) { await say('"You don\'t have a bunny! Catch a RABBIT in the meadow."'); return; }
    if (party.length < 2) { await say('"I can\'t take your only critter!"'); return; }
    const f = await showLuck('Which shiny do you want?');
    if (f < 0) return;
    const fam = SHINY_ORDER[f];
    if (luckOf(fam) >= LUCK_MAX) { await say(`"${SPECIES[fam].name} luck is already at the max!"`); return; }
    let pickIdx = bunnies[0].i;
    if (bunnies.length > 1) {
      const k = await pickTeam({ title: 'Which bunny will you trade?', list: bunnies });
      if (k < 0) return;
      pickIdx = bunnies[k].i;
    }
    const bun = party[pickIdx];
    const ok = await chooseMenu([{ label: 'YES' }, { label: 'NO' }], { layout: 'side', cols: 1, prompt: `Trade ${nm(bun)} Lv ${bun.lv}?` });
    if (ok !== 0) return;
    party.splice(pickIdx, 1);
    flags.luck = { ...flags.luck, [fam]: Math.min(LUCK_MAX, luckOf(fam) * 2) };
    save();
    await say(`You traded ${nm(bun)}. Bye bye, bunny!`);
    await say(`${SPECIES[fam].name} shinies are now ${luckOf(fam)}x easier to find!`);
    await say(`Now about 1 out of every ${oneIn(fam)} wild ${SPECIES[fam].name} will be shiny.`);
  }

  /* ============ Pebble Town: the gym ============ */
  async function gymVisit(gymId) {
    mode = 'busy';
    const gym = GYMS[gymId];
    if (!flags.badges[gymId]) {
      for (const line of gym.intro) await say(`${gym.short}: ${line}`);
      await say(`"Beat me and your critters can grow to Lv ${LEVEL_CAP[gymId]}!"`);
    } else {
      await say(`${gym.short}: "Back for a rematch? I give out lots of XP!"`);
    }
    const y = await chooseMenu([{ label: 'BATTLE!' }, { label: 'NOT YET' }], { layout: 'side', cols: 1, prompt: `Battle ${gym.short}?` });
    if (y !== 0) { await say('"Come back when you\'re ready!"'); hideTextbox(); mode = 'world'; return; }
    if (!party.some(c => c.hp > 0)) { await say('"Your team needs a nap first!"'); hideTextbox(); mode = 'world'; return; }
    hideTextbox();
    await startGymBattle(gymId);
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
    for (let ty = y0; ty <= y0 + VH; ty++) for (let tx = x0; tx <= x0 + VW; tx++) {
      const t = tileAt(tx, ty), sx = tx * T - camX, sy = ty * T - camY;
      const img = {
        ',': TILES.tall, ';': TILES.rubble, '=': TILES.path, 'T': TILES.tree, 'P': TILES.pine, 'M': TILES.boulder,
        '*': TILES.flowers, 'S': TILES.sign, '~': TILES.water[wf], 'G': TILES.gate[gateOpenFor(gateAt(tx, ty)) ? 1 : 0],
        'r': TILES.ground[Math.floor(hash(tx, ty) * 3)], 'F': TILES.forestFloor[Math.floor(hash(tx, ty) * 3)],
        'Y': TILES.forestTree, 'u': TILES.undergrowth, 'o': TILES.mushrooms,
      }[t] || TILES.grass[Math.floor(hash(tx, ty) * 4)];
      ctx.drawImage(img, sx, sy);
      if (t === '~' || t === '=') {
        ctx.fillStyle = t === '~' ? '#d8f0fb' : '#cdb47c';
        const e = t === '~' ? 2 : 1, same = n => n === t || (t === '=' && (n === 'G' || n === 'D'));
        if (!same(tileAt(tx, ty - 1))) ctx.fillRect(sx, sy, 16, e);
        if (!same(tileAt(tx, ty + 1))) ctx.fillRect(sx, sy + 16 - e, 16, e);
        if (!same(tileAt(tx - 1, ty))) ctx.fillRect(sx, sy, e, 16);
        if (!same(tileAt(tx + 1, ty))) ctx.fillRect(sx + 16 - e, sy, e, 16);
      }
    }
    for (const b of BUILDINGS) ctx.drawImage(b.img, b.x * T - camX, b.y * T - camY);

    const [apx, apy] = entityPx(pal);
    const bob = player.moving && player.t > 0.25 && player.t < 0.75 ? -1 : 0;
    const lead = party[0];
    const palImg = sprImg(lead.sp, pal.faceLeft ? 'L' : 'R', now, false, shinyCfg(lead));
    const ents = [
      { y: apy, draw: () => ctx.drawImage(palImg, apx - camX + 8 - Math.floor(palImg.width / 2), apy - camY + 17 - palImg.height + (pal.moving ? bob : 0)) },
      { y: ppy + 0.5, draw: () => ctx.drawImage(kidSprite(), ppx - camX + 2, ppy - camY - 3 + bob) },
    ].sort((a, b) => a.y - b.y);
    ents.forEach(e => e.draw());
    for (const e of [player, pal]) {         // grass and rubble cover feet
      const on = e.moving ? (player.t > 0.55 ? e.to : null) : { x: e.x, y: e.y };
      if (!on) continue;
      const t = tileAt(on.x, on.y);
      const cover = { ',': TILES.tall, ';': TILES.rubble, 'u': TILES.undergrowth }[t];
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
      case 'rocket': {
        const d = p.dir;
        r(fl ? '#ffffff' : '#bfe6fb', x - d * 10 - 2, y - 2, 5, 4);          // steam trail
        r('#2a2135', x - 7, y - 3, 14, 6); r('#e2392b', x - 6, y - 2, 12, 4); r('#f6f3ea', x + d * 4 - 1, y - 2, 3, 4);
        r('#a7b0c2', x - d * 6 - 1, y - 4, 3, 8);
        break;
      }
    }
  }
  function drawPod(p) {
    const x = Math.round(p.x) + (p.wob || 0), y = Math.round(p.y);
    const r = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
    r('#2a2135', x - 5, y - 5, 10, 10);
    r('#2bb3a0', x - 4, y - 4, 8, 4); r('#7fe0d0', x - 3, y - 4, 2, 1);
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
      const img = sprImg(F.sp, 'L', now, B.foe.flash, shinyCfg(F)), s = (B.foe.scale ?? 1) * (img.height > 22 ? 2.5 : 3);
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const hover = SPECIES[F.sp].hovers ? Math.round(Math.sin(now / 200) * 2) - 4 : 0;
      shadow(FOE_POS.x + B.foe.x, 57, w * 0.33);
      ctx.globalAlpha = B.foe.alpha;
      ctx.drawImage(img, Math.round(FOE_POS.x - w / 2 + B.foe.x), Math.round(FOE_POS.y - h + B.foe.y) + hover, w, h);
      ctx.globalAlpha = 1;
      drawSparkles(FOE_POS.x, FOE_POS.y - 26, now);
    }
    if (B.pod) drawPod(B.pod);
    if (B.me.vis && A()) {
      // Evolved critters are tall: draw them a touch smaller and lower so they clear the wild critter's box.
      const img = sprImg(A().sp, 'R', now, B.me.flash, shinyCfg(A())), big = img.height > 22, s = big ? 2.5 : 3;
      const w = Math.round(img.width * s), h = Math.round(img.height * s), bottom = ME_POS.y + (big ? 3 : 0);
      const idle = Math.round(Math.sin(now / 320)) === 1 ? -1 : 0;
      shadow(ME_POS.x + B.me.x, 102, w * 0.36);
      ctx.globalAlpha = B.me.alpha;
      ctx.drawImage(img, Math.round(ME_POS.x - w / 2 + B.me.x), Math.round(bottom - h + B.me.y) + idle, w, h);
      ctx.globalAlpha = 1;
    }
    if (B.proj) drawProj(B.proj);
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
    const acc = (M.acc * 3) / (3 + Math.max(0, d.stages.eva));
    if (Math.random() * 100 >= acc) { await say(`${dName} dodged it!`); return; }
    const mult = effectiveness(M.type, SPECIES[d.sp].types);
    const atk = a.atk * stageMult(a.stages.atk), def = d.def * stageMult(d.stages.def);
    let dmg = Math.floor(M.power * (atk / def) * 0.75 * (0.85 + Math.random() * 0.15) * (1 + a.lv / 20) * mult) + 1;
    const crit = Math.random() < 1 / 12; if (crit) dmg = Math.floor(dmg * 1.5);
    await animHit(who === 'p' ? 'e' : 'p');
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
      if (trainer) await say(`${trainer.gym.short}: "Good try! Rest up and come back."`);
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
      if (await throwPod()) return 'end';
    } else if (act.type === 'switch') {
      await recall(); ai = act.to; await sendIn();
    }
    await useMove('e', fMove);
    return (await afterAction()) === 'end' ? 'end' : 'go';
  }
  async function throwPod() {
    bag.pod--;
    await say('You threw a POD!');
    const from = { x: 14, y: 112 }, to = { x: FOE_POS.x, y: FOE_POS.y - 26 };
    B.pod = { x: from.x, y: from.y, wob: 0, glow: 0 };
    await tween(450, t => { B.pod.x = from.x + (to.x - from.x) * t; B.pod.y = from.y + (to.y - from.y) * t - 40 * Math.sin(Math.PI * t); });
    overlay.flash = 0.6;
    await tween(260, t => { overlay.flash = 0.6 * (1 - t); B.foe.scale = 1 - t; B.foe.alpha = 1 - 0.8 * t; });
    B.foe.vis = false;
    await tween(220, t => (B.pod.y = to.y + (FOE_POS.y - 6 - to.y) * t), easeIn);
    const p = Math.min(0.95, SPECIES[F.sp].catchRate * (1.4 - F.hp / F.maxHp));
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
      party.push(c);
      enemyBox.hidden = true;
      await say(`${nm(F)} joined your team! (${party.length}/${TEAM_MAX})`);
      B.pod = null;
      await gainXp(A(), 4 + F.lv * 2);
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
    const nextGym = Object.keys(GYMS).find(g => !flags.badges[g]);
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
    await gainXp(A(), 8 + F.lv * 3);
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
    battleBg = BG[{ mountains: 'mountain', forest: 'forest' }[area.kind] || 'meadow'];
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
          return { label: locked ? '???' : m, sub: locked ? 'Lv ' + at : moveSub(m), locked, at };
        });
        const m = await chooseMenu(items, { layout: 'full', canBack: true });
        if (m < 0) continue;
        if (items[m].locked) { await say(`${nm(A())} learns this move at Lv ${items[m].at}.`); continue; }
        r = await takeTurn({ type: 'move', move: s.moves[m] });
      } else if (c === 1) {
        const b = await chooseMenu([{ label: 'SNACK', sub: '×' + bag.snack }, { label: 'POD', sub: '×' + bag.pod }], { layout: 'full', canBack: true });
        if (b < 0) continue;
        if (b === 0) {
          if (bag.snack <= 0) { await say('No snacks left! Nap at home to get more.'); continue; }
          if (A().hp >= A().maxHp) { await say(`${nm(A())} is already full of energy!`); continue; }
          r = await takeTurn({ type: 'snack' });
        } else {
          if (trainer) { await say(`You can't catch ${trainer.gym.short}'s critters!`); continue; }
          if (bag.pod <= 0) { await say('No pods left! Nap at home to get more.'); continue; }
          if (party.length >= TEAM_MAX) { await say(`Your team is full! You can carry ${TEAM_MAX} critters.`); continue; }
          r = await takeTurn({ type: 'pod' });
        }
      } else if (c === 2) {
        const i = await pickTeam({ title: 'Switch to who?', battleIdx: ai });
        if (i < 0) continue;
        if (i === ai) { await say(`${nm(A())} is already battling!`); continue; }
        if (party[i].hp <= 0) { await say(`${nm(party[i])} has no energy left!`); continue; }
        r = await takeTurn({ type: 'switch', to: i });
      } else {
        if (trainer) { await say("You can't run from a gym battle!"); continue; }
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
  async function startBattle() {
    mode = 'busy';
    bang = true; await wait(550); bang = false;
    await battleIntro();
    F = newWild();
    B.me.x = -170; B.foe.x = 170; updateHud();
    await tween(380, t => (overlay.bars = 1 - t));
    await tween(480, t => { B.me.x = -170 * (1 - t); B.foe.x = 170 * (1 - t); }, easeOut);
    enemyBox.hidden = false;
    if (F.shiny) { B.sparkle = performance.now(); await say(`Whoa! It's a SHINY ${nm(F)}!`); }
    else if (SPECIES[F.sp].rare) await say('Whoa! A super rare critter!');
    await say(`A wild ${nm(F)} ${SPECIES[F.sp].appear || 'appeared'}!`);
    playerBox.hidden = false;
    await say(`Go, ${nm(A())}!`);
    await battleLoop();
  }

  /* ============ the gym battle ============ */
  async function startGymBattle(gymId) {
    await battleIntro();
    const gym = GYMS[gymId];
    trainer = { id: gymId, gym, team: gym.team.map(([sp, lv]) => makeCritter(sp, lv)), idx: 0 };
    battleBg = BG['gym-' + gymId] || BG['gym-pebble']; F = null;
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
    await gainXp(A(), (8 + F.lv * 3) * trainer.gym.xpMultiplier);
  }
  async function trainerWin() {
    const gym = trainer.gym;
    B.leader = { x: 170, vis: true };
    await tween(400, t => (B.leader.x = 170 * (1 - t)), easeOut);
    await say(`You beat ${gym.leader}!`);
    if (!flags.badges[trainer.id]) {
      flags.badges = { ...flags.badges, [trainer.id]: true }; save();
      await say(`${gym.short}: "You earned the ${gym.badge}!"`);
      await say(`Your critters can now grow all the way to Lv ${levelCap()}!`);
    } else {
      await say(`${gym.short}: "Wow, you're getting strong!"`);
    }
    await say(`Gym prize: every critter on your team gets ${gym.teamPrize} XP!`);
    for (const c of party) if (c !== A()) for (const line of addXpQuiet(c, gym.teamPrize)) await say(line);
    await gainXp(A(), gym.teamPrize);
    await endBattle(false);
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
    const from = c.sp, to = SPECIES[from].evolve.to;
    if (!alreadyDark) await tween(350, t => (overlay.fade = t));
    scene = 'evolve'; E.sp = from; E.white = false; E.shiny = shinyCfg(c);
    await tween(350, t => (overlay.fade = 1 - t));
    await say(`What's this? ${SPECIES[from].name} is evolving!`);
    hideTextbox();
    E.white = true;
    let delay = 380;
    for (let i = 0; i < 16; i++) { E.sp = i % 2 ? to : from; await wait(delay); delay = Math.max(55, delay * 0.84); }
    E.sp = to;
    await tween(200, t => (overlay.flash = t));
    E.white = false; c.sp = to; applyStats(c); c.shownHp = c.hp; E.shiny = shinyCfg(c); save();
    await tween(500, t => (overlay.flash = 1 - t));
    await say(`${SPECIES[from].name} evolved into ${SPECIES[to].name}!`);
    if (SPECIES[to].signature) await say(`${SPECIES[to].name} learned ${SPECIES[to].signature}!`);
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
    party = []; F = null; trainer = null; bag = { snack: 3, pod: 5 }; flags = { luck: {}, badges: {}, seen: {} }; chooseIdx = 0;
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
      if (party.length < TEAM_MAX) party.push(makeCritter('rabbit', 5));
      save(); worldSay(['+10 pods, and a test RABBIT joined your team.']);
    });
    devTool('devTown', devWarpTown);
    devTool('devNew', () => { if (mode === 'world') newGame(); });
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