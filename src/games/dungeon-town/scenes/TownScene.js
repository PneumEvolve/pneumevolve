import Phaser from 'phaser';
import { FONT, V, dist, flash, kids, untint } from '../util';
import { BLD, FAV, ITEMS, JOB_DESC, JOB_SITES, PERKS, RECIPES, SP, T, TCOLS, TH, TILE, TL, TROWS, TURRET, TW, XP, recipeOf } from '../tuning';
import { CAMPS, CAMP_TOTAL, TOWN_MAP } from '../maps';
import { GAME, HUD, SAVE, addXp, ammoMax, bCost, campsBeaten, countB, farmScrap, jobOf, levelCap, maxHearts, perk, petById, petLvlDmg, petMaxHp, pointsUsed, prodMult, protectAmt, stashCap, stashTotal, typeCap, writeSave, xpNeed } from '../state';
import { makeTextures } from '../textures';
import { Combat } from '../combat';

// ===================================================================
//  TOWN — build by day, defend the generator by night
// ===================================================================
export class TownScene extends Combat {
  constructor() { super('town'); }
  init(data) { this.result = data && data.result; }

  create() {
    makeTextures(this);
    this.crates = null; this.bulletBlockers = null; this.buildView = false; this.bSprites = []; this.guards = []; this.dawnPending = null; this.spawnPlan = [];
    HUD.scene = 'town';
    this.phase = 'day';
    this.eastOpen = SAVE.townLevel >= 2;
    this.grid = TOWN_MAP.map(r => r.replace(/X/g, this.eastOpen ? 'S' : '#').padEnd(TCOLS, '#').slice(0, TCOLS));
    this.physics.world.setBounds(0, 0, TW, TH);
    this.solids = this.physics.add.staticGroup();
    this.rubble = this.physics.add.staticGroup();
    this.gates = this.physics.add.staticGroup();
    this.bulletBlockers = this.rubble;
    this.buildTown();

    this.townRecs = this.makeTownRecs();
    HUD.maxHp = maxHearts(); HUD.hp = HUD.maxHp;
    HUD.prompt = null; HUD.building = false; HUD.panel = null; HUD.night = null; HUD.buildTab = 'mil'; HUD.buildSel = 'wall'; HUD.buildMsg = '';
    this.setupCombat(this.hallPos.x, this.hallPos.y + 70, TW, TH, 420);
    this.physics.add.collider(this.enemies, this.gates);
    this.physics.add.collider(this.enemies, this.rubble);
    this.physics.add.collider(this.hero, this.rubble);
    this.physics.add.collider(this.petsGround, this.rubble);

    this.tBullets = this.physics.add.group();
    this.physics.add.overlap(this.tBullets, this.enemies, (a, b) => { const bl = a.isBullet ? a : b, z = a.isBullet ? b : a; this.bulletHit(bl, z); });
    this.shade = this.add.rectangle(0, 0, TW, TH, 0x070b22, 1).setOrigin(0).setDepth(700).setAlpha(0);
    this.renderBuildings();
    this.renderPenPets();

    const r = this.result;
    if (r && r.type === 'extract' && r.firstClear && r.dungeon === 'subway') HUD.banner = { text: 'THE SUBWAY IS CLEARED!', sub: `+${r.scrap} ⚙${r.caught ? ' · ' + r.caught : ''} · More dungeons coming`, t: 4 };
    else if (r && r.type === 'extract' && r.firstClear) HUD.banner = { text: 'THE RUINS ARE CLEARED!', sub: `+${r.scrap} ⚙${r.caught ? ' · ' + r.caught : ''} · ${SAVE.townLevel >= 2 ? 'Try the Subway next' : 'Town Hall Lv 2 opens the path to the Subway'}`, t: 4 };
    else if (r && r.type === 'extract') HUD.banner = { text: `HOME SAFE  +${r.scrap} ⚙`, sub: r.caught ? `New creature: ${r.caught}! Check your squad.` : 'Spend it on the town, then end the day', t: 3.4 };
    else if (r && r.type === 'dead') HUD.banner = { text: 'DRAGGED HOME', sub: `You lost ${r.scrap} scrap in room ${r.room}`, t: 3.2 };
    else if (r && r.type === 'abandon') HUD.banner = { text: 'BACK IN TOWN', t: 2 };
    else if (r && r.type === 'raidWin') HUD.banner = { text: `${CAMPS[r.camp].name.toUpperCase()} RAIDED!`, sub: `+${r.scrap} ⚙${r.first && r.camp === 0 ? ' · Careful: bandits may come for your town now' : r.first && CAMPS[r.camp + 1] ? ` · ${CAMPS[r.camp + 1].name} unlocked` : ''}`, t: 4 };
    else if (r && r.type === 'raidDead') HUD.banner = { text: 'DRAGGED HOME', sub: `The ${CAMPS[r.camp].name} bandits got you. Lost ${r.scrap} scrap.`, t: 3.2 };
    else if (r && r.type === 'pathOpen') HUD.banner = { text: 'THE EAST PATH IS OPEN', sub: 'The Subway is that way — but zombies will come through it too', t: 4 };
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
    const gen = [], hall = [], ruins = [], pen = [], subw = [], war = [];
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
        if (ch === 'K') { pen.push({ x, y }); this.baseBlocked[k] = 1; this.reserved[k] = 1; }
        if (ch === 'U') { subw.push({ x, y }); this.reserved[k] = 1; }
        if (ch === 'W') { war.push({ x, y }); this.baseBlocked[k] = 1; this.reserved[k] = 1; }
      }
    }
    const avg = (a) => ({ x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length });
    this.genPos = avg(gen); this.hallPos = avg(hall); this.ruinsPos = avg(ruins); this.penPos = avg(pen); this.subPos = avg(subw); this.warPos = avg(war);
    const warImg = this.rubble.create(this.warPos.x, this.warPos.y, 'wartable');
    warImg.refreshBody(); warImg.body.setSize(84, 60); warImg.setDepth(10 + this.warPos.y / 1000);
    this.add.text(this.warPos.x, this.warPos.y - 58, 'WAR TABLE', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ff8c8c', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
    this.add.image(this.subPos.x, this.subPos.y, 'stairs').setDepth(1.5);
    if (!this.eastOpen) this.add.image(this.subPos.x, this.subPos.y, 'boards').setDepth(1.6);
    this.add.text(this.subPos.x, this.subPos.y - 62, 'SUBWAY', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: this.eastOpen ? '#5fd3ff' : '#6b737c', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
    const penImg = this.rubble.create(this.penPos.x, this.penPos.y, 'pen');
    penImg.refreshBody(); penImg.body.setSize(90, 60); penImg.setDepth(1.4);
    this.add.text(this.penPos.x, this.penPos.y - 62, 'CREATURE PEN', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ff8c9e', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
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
    (this.bSprites || []).forEach(b => { if (b.gunImg) b.gunImg.destroy(); if (b.workerImg) b.workerImg.destroy(); if (b.rcpImg) b.rcpImg.destroy(); b.destroy(); });
    this.bSprites = [];
    this.occ = new Array(TCOLS * TROWS).fill(null);
    const before = SAVE.buildings.length;
    SAVE.buildings = SAVE.buildings.filter(b => { const k = this.idx(b.c, b.r); return b.c > 0 && b.r > 0 && b.c < TCOLS - 1 && b.r < TROWS - 1 && !this.reserved[k] && !this.baseBlocked[k]; });
    if (SAVE.buildings.length !== before) writeSave();
    SAVE.buildings.forEach(rec => {
      const def = BLD[rec.t]; if (!def) return;
      const x = rec.c * TILE + TILE / 2, y = rec.r * TILE + TILE / 2;
      let s;
      if (def.gate) { s = this.gates.create(x, y, rec.t); s.refreshBody(); }
      else if (def.solid) { s = this.solids.create(x, y, rec.t); s.refreshBody(); }
      else s = this.add.image(x, y, rec.t);
      Object.assign(s, { bt: rec.t, def, lvl: rec.lvl || 1, c: rec.c, r: rec.r, rec, dead: false, isBld: true });
      s.maxHp = Math.round(((def.hp || 0) + (rec.t === 'turret' ? (s.lvl - 1) * 4 : 0)) * (1 + 0.5 * (this.prk ? this.prk('engineer') : 0))); s.hp = s.maxHp;
      s.setDepth(def.solid ? 10 + y / 1000 : 1.2);
      if (rec.t === 'turret') { s.gunImg = this.add.image(x, y - 4, 'turretGun').setOrigin(0.2, 0.5).setDepth(11 + y / 1000); s.cd = 0.5; }
      const wk = rec.w && petById(rec.w);
      if (rec.w && !wk) delete rec.w;
      if (RECIPES[rec.t]) { const rk = recipeOf(rec); s.rcpImg = this.add.image(x - 14, y + 14, rk === 'cage' ? 'cageIcon' : rk).setScale(rk === 'cage' ? 1.2 : 0.8).setDepth(12 + y / 1000); }
      if (wk) { s.workerImg = this.add.image(x + 14, y - 16, wk.sp).setScale(0.55).setDepth(12 + y / 1000); s.fav = FAV[rec.t] === wk.sp; if (rec.t === 'guard' && this.phase === 'night') s.workerImg.setVisible(false); }
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
    const near = this.closeTarget(z, z.aggro > 0 ? 420 : (z.type === 'runner' ? 230 : 170));
    if (near) return near;
    if (z.type === 'rifleman') { // bandit riflemen shoot your turrets from range
      const t = this.bSprites.find(b => b.bt === 'turret' && !b.dead && dist(b, z) < 330);
      if (t) return { x: t.x, y: t.y, kind: 'bld', bld: t, obj: t, pad: 10 };
    }
    const step = this.nextStep(Math.floor(z.x / TILE), Math.floor(z.y / TILE));
    if (!step || step.gen) return { x: this.genPos.x, y: this.genPos.y, kind: 'gen', obj: this.genImg, pad: 34 };
    if (step.bld) return { x: step.bld.x, y: step.bld.y, kind: 'bld', bld: step.bld, obj: step.bld, pad: 10 };
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
  onAbandon() { if (GAME.onExit) GAME.onExit(); }
  makeTownRecs() {
    return SAVE.squad.map(id => petById(id)).filter(Boolean).map(pt => ({ id: pt.id, sp: pt.sp, hp: petMaxHp(pt), maxHp: petMaxHp(pt), ko: false, cdT: 0, lvl: pt.lvl, ar: pt.ar, pr: pt.pr }));
  }
  getSquadRecs() { return this.townRecs; }
  itemSrc() { return this.phase === 'night' ? SAVE.stash : null; }
  onItemsChanged() { writeSave(); }
  onSquadOrderChanged() { SAVE.squad = this.townRecs.map(r => r.id); writeSave(); }
  // rebuild your squad (after changes, at night start, at dawn): everyone fully healed
  reloadSquad() {
    this.townRecs = this.makeTownRecs(); this.squadRecs = this.townRecs;
    this.computePassives();
    this.fillSlots(true);
    HUD.maxHp = maxHearts(); HUD.hp = Math.min(HUD.hp, HUD.maxHp);
  }
  // creatures not in your squad and not working hang out by the pen
  renderPenPets() {
    (this.penPets || []).forEach(o => o.destroy());
    this.penPets = [];
    const idle = SAVE.pets.filter(pt => !SAVE.squad.includes(pt.id) && !jobOf(pt.id)).slice(0, 8);
    idle.forEach((pt, i) => {
      const o = this.add.image(this.penPos.x - 60 + (i % 4) * 40, this.penPos.y - 70 + Math.floor(i / 4) * 30, pt.sp).setScale(0.8);
      o.tx = o.x; o.ty = o.y; o.wt = Math.random() * 2;
      this.penPets.push(o);
    });
  }
  updatePenPets(dt) {
    (this.penPets || []).forEach(o => {
      o.wt -= dt;
      if (o.wt <= 0) {
        o.wt = Phaser.Math.FloatBetween(1.5, 3.5);
        o.tx = Phaser.Math.Clamp(this.penPos.x + Phaser.Math.Between(-130, 130), TILE * 1.5, TW - TILE * 1.5);
        o.ty = Phaser.Math.Clamp(this.penPos.y + Phaser.Math.Between(-130, -40), TILE * 1.5, TH - TILE * 1.5);
      }
      const d = Math.hypot(o.tx - o.x, o.ty - o.y);
      if (d > 2) { o.x += (o.tx - o.x) / d * 35 * dt; o.y += (o.ty - o.y) / d * 35 * dt; o.setFlipX(o.tx < o.x); }
      o.setDepth(10 + o.y / 1000);
    });
  }
  assignJob(pt, type) {
    const cur = jobOf(pt.id);
    if (cur && cur.t === type) return 'Already working there.';
    const site = SAVE.buildings.find(b => b.t === type && !(b.w && petById(b.w)));
    if (!site) return `No free ${BLD[type].name}. Build another one first.`;
    if (SAVE.squad.includes(pt.id) && SAVE.squad.length <= 1) return 'You need at least one creature with you.';
    if (cur) delete cur.w;
    site.w = pt.id;
    SAVE.squad = SAVE.squad.filter(id => id !== pt.id);
    writeSave(); this.renderBuildings(); this.reloadSquad(); this.renderPenPets();
    return `${SP[pt.sp].name} now works at the ${BLD[type].name}${FAV[type] === pt.sp ? ' — its favourite job!' : '.'}`;
  }
  stopJob(pt) {
    const cur = jobOf(pt.id); if (!cur) return;
    delete cur.w; writeSave(); this.renderBuildings(); this.reloadSquad(); this.renderPenPets();
  }
  syncRoster() {
    HUD.roster = [{ id: 'hero', sp: 'hero', hero: true, lvl: SAVE.hero.lvl, picks: SAVE.hero.picks || 0, inSquad: -1 }]
      .concat(SAVE.pets.map(pt => { const jb = jobOf(pt.id); return { id: pt.id, sp: pt.sp, inSquad: SAVE.squad.indexOf(pt.id), lvl: pt.lvl, ar: pt.ar, pr: pt.pr, picks: pt.picks || 0, hearts: petMaxHp(pt), job: jb ? BLD[jb.t].name : null }; }));
    HUD.capNow = levelCap();
    this.syncHeroHud();
  }
  // detail page for you or one creature: stats, ranks, upgrade buttons
  syncDetail() {
    const id = HUD.detailId, cap = levelCap();
    if (id === 'war') {
      const beat = campsBeaten(), lines = [];
      for (let i = 0; i < Math.min(CAMP_TOTAL, Math.max(beat + 2, 3)); i++) {
        const c = CAMPS[i];
        if (!c) { lines.push(`${i + 1}.  ???  (coming soon)`); continue; }
        lines.push(`${i + 1}.  ${c.name}  ${i < beat ? '✓ beaten' : i === beat ? '◀ next' : '🔒'}`);
      }
      const buttons = [];
      if (!SAVE.raidedToday) {
        if (beat < CAMPS.length) buttons.push({ label: `RAID: ${CAMPS[beat].name.toUpperCase()}  (+${CAMPS[beat].reward} ⚙)`, ev: { type: 'raid', camp: beat } });
        for (let i = Math.min(beat, CAMPS.length) - 1; i >= 0 && buttons.length < 3; i--) buttons.push({ label: `RAID AGAIN: ${CAMPS[i].name.toUpperCase()}  (+${Math.round(CAMPS[i].reward * 0.4)} ⚙)`, ev: { type: 'raid', camp: i } });
      }
      buttons.push({ label: 'CLOSE', ev: { type: 'back' } });
      const next = CAMPS[beat];
      HUD.detail = {
        name: 'War Table', icon: 'wartable', xpFrac: beat / CAMP_TOTAL,
        body: `Bandit camps beaten: ${beat} / ${CAMP_TOTAL}\n${SAVE.raidedToday ? 'You already raided today. Come back tomorrow.' : 'One raid a day (separate from your dungeon run).'}\n\n${lines.join('\n')}\n\n${next ? next.name + ': ' + next.teach : beat >= CAMPS.length ? 'More camps are coming.' : ''}${beat ? '\n\nBandits know where you live now. Your scouts will warn you a day before they attack.' : ''}${SAVE.raidWarn ? '\n⚠ BANDITS ATTACK TONIGHT' : ''}`,
        buttons,
      };
      return;
    }
    if (id === 'stash') {
      const st = SAVE.stash;
      const out = {};
      SAVE.buildings.filter(b => RECIPES[b.t]).forEach(b => { const k = recipeOf(b); out[k] = (out[k] || 0) + prodMult(b); });
      const outTxt = Object.entries(out).map(([k, n]) => `${n} ${ITEMS[k]}${n > 1 ? 's' : ''}`).join(', ') || 'nothing (build a Kitchen or Workbench)';
      HUD.detail = {
        name: 'Stash', icon: 'storehouse', xpFrac: stashTotal() / Math.max(1, stashCap()),
        body: `Items: ${stashTotal()} / ${stashCap()}   (3 + 5 per Storehouse)\n\nCages ${st.cage}   ·   Med Kits ${st.medkit}\nPet Treats ${st.treat}   ·   Noise Lures ${st.lure}\n\nEvery morning:\n· Farms: +${farmScrap()} scrap\n· Made: ${outTxt}\n   (kitchen items cost ${T.medkitCost} scrap each)\n\nWalk up to a Kitchen or Workbench to change what it makes.\nYou take everything on runs; leftovers come back.`,
        buttons: [
          { label: 'CLOSE', ev: { type: 'back' } },
        ],
      };
      return;
    }
    if (id === 'hero') {
      const hr = SAVE.hero, owned = hr.perks.map(k => PERKS[k][0]);
      const choices = Object.keys(PERKS).filter(k => !perk(k));
      const xpLine = hr.lvl >= cap ? `MAX for Town Hall ${SAVE.townLevel}. Upgrade it to keep levelling.` : `XP ${Math.floor(hr.xp)} / ${xpNeed(hr.lvl)}`;
      const nextPerk = Math.ceil((hr.lvl + 1) / 5) * 5;
      HUD.detail = {
        name: 'You — the Survivor', icon: 'hero', xpFrac: hr.lvl >= cap ? 1 : hr.xp / xpNeed(hr.lvl),
        body: `Level ${hr.lvl} / ${cap}\n${xpLine}\n\nMax hearts: ${maxHearts()}  (+1 every 4 levels)\nPerks: ${owned.length ? owned.join(', ') : 'none yet'}\n\n${hr.picks ? `★ Choose ${hr.picks > 1 ? hr.picks + ' perks' : 'a perk'} →` : `Next perk at level ${nextPerk}`}`,
        buttons: (hr.picks ? choices.map(k => ({ label: `${PERKS[k][0]}: ${PERKS[k][1]}`, ev: { type: 'perk', key: k } })) : []).concat([{ label: '← BACK', ev: { type: 'back' } }]),
      };
      return;
    }
    const pt = petById(id); if (!pt) { if (HUD.panel === 'detail') HUD.panel = 'squad'; return; }
    const d = SP[pt.sp], inSq = SAVE.squad.indexOf(pt.id);
    const xpLine = pt.lvl >= cap ? 'MAX (upgrade the Town Hall)' : `XP ${Math.floor(pt.xp)} / ${xpNeed(pt.lvl)}`;
    const rk = (arr, r) => `${arr[r - 1]}${r < 3 ? `\n   next: ${arr[r]}` : '  (max)'}`;
    const nextPick = Math.ceil((pt.lvl + 1) / 5) * 5;
    const job = jobOf(pt.id), fav = Object.keys(FAV).find(k => FAV[k] === pt.sp);
    if (HUD.detailMode === 'jobs') {
      const jb = JOB_SITES.filter(t => countB(t) > 0).map(t => {
        const free = SAVE.buildings.filter(b => b.t === t && !(b.w && petById(b.w))).length;
        const f = FAV[t] === pt.sp;
        return { label: `${f ? '★ ' : ''}${BLD[t].name} (${free} free): ${JOB_DESC[t][f ? 1 : 0]}`, ev: { type: 'assignJob', id: pt.id, job: t } };
      });
      HUD.detail = {
        name: `${d.name} — pick a job`, icon: pt.sp, xpFrac: pt.lvl >= cap ? 1 : pt.xp / xpNeed(pt.lvl),
        body: `Working creatures stay in town and can't go on runs.\nThey get a bit of XP every morning.\n\nFavourite job: ${BLD[fav].name} (bigger bonus, marked ★)\n\n${jb.length ? 'Pick a building →' : 'Build a Workbench, Kitchen, Farm, Storehouse, Turret or Guard Post first.'}`,
        buttons: jb.slice(0, 7).concat([{ label: '← BACK', ev: { type: 'back' } }]),
      };
      return;
    }
    const btns = [];
    if (pt.picks > 0 && pt.ar < 3) btns.push({ label: `▲ UPGRADE ${d.activeName}`, ev: { type: 'upgrade', id: pt.id, which: 'ar' } });
    if (pt.picks > 0 && pt.pr < 3) btns.push({ label: `▲ UPGRADE ${d.passiveName.toUpperCase()}`, ev: { type: 'upgrade', id: pt.id, which: 'pr' } });
    btns.push({ label: inSq >= 0 ? `REMOVE FROM SQUAD (#${inSq + 1})` : 'ADD TO SQUAD', ev: { type: 'toggleSquad', id: pt.id } });
    btns.push(job ? { label: `STOP WORKING (${BLD[job.t].name})`, ev: { type: 'stopJob', id: pt.id } } : { label: '🛠 GIVE A JOB', ev: { type: 'jobMenu' } });
    btns.push({ label: '← BACK', ev: { type: 'back' } });
    const jobLine = job ? `Job: ${BLD[job.t].name}${FAV[job.t] === pt.sp ? ' ★ favourite' : ''} — ${JOB_DESC[job.t][FAV[job.t] === pt.sp ? 1 : 0]}` : `No job · favourite: ${BLD[fav].name}`;
    HUD.detail = {
      name: d.name, icon: pt.sp, xpFrac: pt.lvl >= cap ? 1 : pt.xp / xpNeed(pt.lvl),
      body: `Level ${pt.lvl} / ${cap}   ·   ♥ ${petMaxHp(pt)}\n${xpLine}\n${jobLine}\n\nACTIVE — ${d.activeName}  (rank ${pt.ar}/3)\n${rk(d.activeRanks, pt.ar)}\n\nPASSIVE — ${d.passiveName}  (rank ${pt.pr}/3)\n${rk(d.passiveRanks, pt.pr)}\n\n${pt.picks ? `★ ${pt.picks} upgrade${pt.picks > 1 ? 's' : ''} ready!` : (pt.ar >= 3 && pt.pr >= 3 ? 'Fully upgraded' : `Next upgrade at level ${nextPick}`)}`,
      buttons: btns,
    };
  }
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
    HUD.raidWarn = !!SAVE.raidWarn;
    HUD.stashTot = `${stashTotal()}/${stashCap()}`;
    const next = TL[SAVE.townLevel + 1];
    HUD.hall = { level: SAVE.townLevel, next: next ? { cost: next.cost, mil: next.mil, civ: next.civ } : null, scrap: SAVE.scrap, mil: lv.mil, civ: lv.civ };
  }

  // ---------------------------------------------------------------- events
  onEvent(ev) {
    const day = this.phase === 'day';
    switch (ev.type) {
      case 'prompt': {
        const p = HUD.prompt; if (!p || !day || HUD.building) return;
        if (p.action === 'ruins') { if (HUD.runsLeft > 0) this.startRun('ruins'); else HUD.banner = { text: 'TOO LATE FOR THE RUINS', sub: 'End the day and go again tomorrow', t: 2 }; }
        if (p.action === 'subway') {
          if (!this.eastOpen) HUD.banner = { text: 'BOARDED UP', sub: 'Upgrade the Town Hall to level 2 to open the east path to the Subway', t: 2.6 };
          else if (HUD.runsLeft > 0) this.startRun('subway'); else HUD.banner = { text: 'TOO LATE FOR THE SUBWAY', sub: 'End the day and go again tomorrow', t: 2 };
        }
        if (p.action === 'hall') { HUD.hallMsg = ''; this.syncHud(); HUD.panel = 'hall'; }
        if (p.action === 'pen') this.onEvent({ type: 'openSquad' });
        if (p.action === 'war') { HUD.detailId = 'war'; HUD.detailMode = null; HUD.rosterMsg = ''; this.syncDetail(); HUD.panel = 'detail'; }
        if (p.action === 'recipe' && p.b) this.cycleRecipe(p.b);
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
      case 'select': HUD.buildSel = ev.item; HUD.buildMsg = BLD[ev.item] ? BLD[ev.item].desc : (ev.item === 'upgrade' ? 'Tap a turret to upgrade it.' : ev.item === 'recipe' ? 'Tap a Kitchen or Workbench to switch what it makes.' : 'Tap a building to remove it (points come back).'); break;
      case 'tapTile': if (HUD.building) this.tapTile(ev.x, ev.y); break;
      case 'hallUpgrade': this.upgradeHall(); break;
      case 'closePanel': HUD.panel = null; break;
      case 'swapSlots': if (day && !HUD.building && !HUD.panel) this.swapSlots(ev.a, ev.b); break;
      case 'openSquad':
        if (!day || HUD.building) return;
        HUD.rosterMsg = ''; HUD.rosterPage = 0; this.syncRoster(); HUD.panel = 'squad';
        break;
      case 'toggleSquad': {
        const i = SAVE.squad.indexOf(ev.id);
        if (i >= 0) {
          if (SAVE.squad.length <= 1) { HUD.rosterMsg = 'You need at least one creature with you.'; break; }
          SAVE.squad.splice(i, 1); HUD.rosterMsg = `${SP[petById(ev.id).sp].name} left the squad.`;
        } else if (SAVE.squad.length >= 4) { HUD.rosterMsg = 'Squad is full (4). Tap one in the squad to take it out first.'; break; }
        else { const jb = jobOf(ev.id); if (jb) delete jb.w; SAVE.squad.push(ev.id); HUD.rosterMsg = `${SP[petById(ev.id).sp].name} joined as #${SAVE.squad.length}${jb ? ' (left its job)' : ''}.`; this.renderBuildings(); }
        writeSave(); this.reloadSquad(); this.syncRoster(); this.renderPenPets();
        if (HUD.panel === 'detail') this.syncDetail();
        break;
      }
      case 'openDetail': HUD.detailId = ev.id; HUD.detailMode = null; HUD.rosterMsg = ''; this.syncDetail(); HUD.panel = 'detail'; break;
      case 'jobMenu': HUD.detailMode = 'jobs'; HUD.rosterMsg = ''; this.syncDetail(); break;
      case 'assignJob': { const pt = petById(ev.id); if (pt) HUD.rosterMsg = this.assignJob(pt, ev.job); HUD.detailMode = null; this.syncDetail(); break; }
      case 'stopJob': { const pt = petById(ev.id); if (pt) { this.stopJob(pt); HUD.rosterMsg = 'Stopped working. It\'s back at the pen.'; } this.syncDetail(); break; }
      case 'page': HUD.rosterPage = Math.max(0, (HUD.rosterPage || 0) + ev.d); break;
      case 'openStash': if (!day || HUD.building) return; HUD.detailId = 'stash'; HUD.detailMode = null; HUD.rosterMsg = ''; this.syncDetail(); HUD.panel = 'detail'; break;
      case 'recipe': { const opts = ev.b === 'kitchen' ? ['medkit', 'treat'] : ['cage', 'lure']; SAVE.recipes[ev.b] = opts[(opts.indexOf(SAVE.recipes[ev.b]) + 1) % 2]; writeSave(); this.syncDetail(); break; }
      case 'swapOrder': { const q = SAVE.squad; if (q[ev.a] != null && q[ev.b] != null) { const t = q[ev.a]; q[ev.a] = q[ev.b]; q[ev.b] = t; writeSave(); this.reloadSquad(); this.syncRoster(); HUD.rosterMsg = 'Squad order changed.'; } break; }
      case 'raid': if (day && !SAVE.raidedToday && ev.camp < CAMPS.length && ev.camp <= campsBeaten()) { HUD.panel = null; this.startRaid(ev.camp); } break;
      case 'back': if (HUD.detailId === 'stash' || HUD.detailId === 'war') { HUD.panel = null; break; }
        if (HUD.detailMode) { HUD.detailMode = null; this.syncDetail(); break; } HUD.panel = 'squad'; HUD.rosterMsg = ''; this.syncRoster(); break;
      case 'upgrade': {
        const pt = petById(ev.id);
        if (pt && pt.picks > 0 && pt[ev.which] < 3) { pt[ev.which]++; pt.picks--; writeSave(); this.reloadSquad(); this.syncHeroHud(); HUD.rosterMsg = 'Upgraded!'; }
        this.syncDetail();
        break;
      }
      case 'perk': {
        const hr = SAVE.hero;
        if (hr.picks > 0 && !perk(ev.key)) { hr.perks.push(ev.key); hr.picks--; writeSave(); HUD.maxHp = maxHearts(); HUD.hp = HUD.maxHp; HUD.ammo = ammoMax(); this.syncHeroHud(); HUD.rosterMsg = `${PERKS[ev.key][0]} learned!`; }
        this.syncDetail();
        break;
      }
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
      this.buildMinZoom = z * 0.9;
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

  // build camera: zoom around the screen centre, keep the town in view
  buildZoom(f) {
    if (!this.buildView) return;
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * f, this.buildMinZoom || 0.3, 2.4));
    this.clampBuildCam();
  }
  buildPan(dx, dy) {
    if (!this.buildView) return;
    const cam = this.cameras.main;
    cam.scrollX -= dx / cam.zoom; cam.scrollY -= dy / cam.zoom;
    this.clampBuildCam();
  }
  clampBuildCam() {
    const cam = this.cameras.main;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, -cam.width / 2, TW - cam.width / 2);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, -cam.height / 2, TH - cam.height / 2);
  }

  cycleRecipe(b) {
    const opts = RECIPES[b.bt]; if (!opts) return;
    b.rec.rcp = opts[(opts.indexOf(recipeOf(b.rec)) + 1) % opts.length];
    writeSave();
    this.floatText(b.x, b.y - 30, `NOW MAKING: ${ITEMS[b.rec.rcp].toUpperCase()}S`, '#f2d14b', 14);
    this.ring(b.x, b.y, 34, 0xf2d14b);
    this.renderBuildings();
  }

  tapTile(wx, wy) {
    const c = Math.floor(wx / TILE), r = Math.floor(wy / TILE);
    const say = (m) => { HUD.buildMsg = m; };
    if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return;
    const k = this.idx(c, r), existing = this.occ[k], sel = HUD.buildSel;
    const lv = TL[SAVE.townLevel];
    const pop = (col) => { const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2; this.spark(x, y, col, 8); this.ring(x, y, 30, col); };
    if (sel === 'recipe') {
      if (!existing || !RECIPES[existing.bt]) return say('Tap a Kitchen or Workbench to switch what it makes.');
      this.cycleRecipe(existing);
      return say(`${existing.def.name} now makes ${ITEMS[existing.rec.rcp]}s.`);
    }
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
    const mx = typeCap(sel);
    if (mx && countB(sel) >= mx) return say(`Town Hall level ${SAVE.townLevel} allows ${mx} ${def.name}${mx > 1 ? 's' : ''}. Upgrade it for more.`);
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
    if (SAVE.townLevel === 2) { HUD.panel = null; this.leaving = true; this.cameras.main.fadeOut(400); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ result: { type: 'pathOpen' } })); return; }
    this.genMax = TL[SAVE.townLevel].gen; this.genHp = this.genMax;
    HUD.hallMsg = '';
    this.syncHud(); this.syncHeroHud();
    this.ring(this.hallPos.x, this.hallPos.y, 120, 0xf2d14b); this.spark(this.hallPos.x, this.hallPos.y, 0xf2d14b, 20);
    HUD.panel = null;
    HUD.banner = { text: `TOWN HALL LEVEL ${SAVE.townLevel}`, sub: `Military ${TL[SAVE.townLevel].mil} · Civic ${TL[SAVE.townLevel].civ} · Level cap ${levelCap()}`, t: 2.8 };
  }

  startRun(dungeon = 'ruins') {
    SAVE.runsToday++; writeSave();
    const pets = this.makeTownRecs();
    const st = SAVE.stash;
    const run = { dungeon, room: 1, hp: maxHearts(), maxHp: maxHearts(), scrap: 0, cages: T.cagesPerRun + st.cage, stashCages: st.cage, captured: [], pets,
      items: { medkit: st.medkit, treat: st.treat, lure: st.lure } };
    st.cage = 0; st.medkit = 0; st.treat = 0; st.lure = 0; writeSave();
    this.leaving = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('dungeon', { run }));
  }

  startRaid(i) {
    SAVE.raidedToday = true;
    const pets = this.makeTownRecs();
    const st = SAVE.stash;
    const run = { dungeon: 'camp', camp: i, room: 3 + i * 2, hp: maxHearts(), maxHp: maxHearts(), scrap: 0, cages: 0, stashCages: 0, captured: [], pets,
      items: { medkit: st.medkit, treat: st.treat, lure: st.lure } };
    st.medkit = 0; st.treat = 0; st.lure = 0; writeSave();
    this.leaving = true;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('raid', { run }));
  }

  // ---------------------------------------------------------------- night
  // creatures assigned to guard posts come out at night and defend the post
  spawnGuards() {
    this.clearGuards();
    this.guards = [];
    this.bSprites.forEach(b => {
      if (b.bt !== 'guard' || !b.rec.w) return;
      const pt = petById(b.rec.w); if (!pt) return;
      const def = SP[pt.sp], grp = def.fly ? this.petsAir : this.petsGround;
      const g = grp.create(b.x, b.y + 40, pt.sp);
      g.body.setCircle(def.body[0], def.body[1], def.body[2]);
      g.setCollideWorldBounds(true);
      const ghp = petMaxHp(pt) + (FAV.guard === pt.sp ? 2 : 0);
      const rec = { id: pt.id, sp: pt.sp, hp: ghp, maxHp: ghp, ko: false, cdT: 2, lvl: pt.lvl, ar: pt.ar, pr: pt.pr };
      Object.assign(g, { rec, sp: pt.sp, def, isPet: true, isGuard: true, post: b, mode: 'follow', atkT: 0.5, iv: 0, kbT: 0, shellT: 0 });
      if (b.workerImg) b.workerImg.setVisible(false);
      this.guards.push(g);
    });
  }
  clearGuards() { (this.guards || []).forEach(g => g.active && g.destroy()); this.guards = []; }

  updateGuards(dt, time) {
    (this.guards || []).forEach(g => {
      if (!g.active) return;
      const def = g.def, home = { x: g.post.x, y: g.post.y + 40 };
      g.iv = Math.max(0, g.iv - dt); g.atkT -= dt; g.shellT = Math.max(0, g.shellT - dt);
      if (g.rec.cdT > 0) g.rec.cdT -= dt;
      g.setAlpha(g.dig ? 0.2 : g.iv > 0 ? (Math.floor(time / 70) % 2 ? 0.4 : 1) : 1);
      if (g.shellT > 0) g.setTint(0xffd166); else if (g.iv <= 0) untint(g);
      if (g.mode === 'pounce') { g.t -= dt; g.setVelocity(g.vx, g.vy); if (g.t <= 0) this.pounceLand(g); return; }
      if (g.kbT > 0) { g.kbT -= dt; g.setVelocity(g.kbx, g.kby); return; }
      const z = this.nearestEnemy(home.x, home.y, 230, false);
      // use its active ability on its own when zombies are close
      if (z && g.rec.cdT <= 0 && dist(g, z) < 200) {
        if (def.active !== 'mend' || g.rec.hp < g.rec.maxHp || HUD.hp < HUD.maxHp) this.useAbility(g, null, g);
      }
      if (def.fly) {
        const tx = home.x, ty = home.y - 40 + Math.sin(time * 0.006 + g.post.c) * 5;
        g.setVelocity((tx - g.x) * 5, (ty - g.y) * 5);
        if (def.attack === 'zap' && z && g.atkT <= 0 && dist(g, z) < def.range) {
          g.atkT = def.cd; this.bolt(g.x, g.y, z.x, z.y, def.boltColor);
          this.damage(z, def.dmg + petLvlDmg(g.rec.lvl), new V(z.x - g.x, z.y - g.y).normalize(), 60, false, true, true);
        }
        return;
      }
      if (z) {
        const d = new V(z.x - g.x, z.y - g.y); const dd = d.length(); d.normalize();
        if (dd > def.range * 0.7) g.setVelocity(d.x * def.speed, d.y * def.speed); else g.setVelocity(0, 0);
        g.setFlipX(d.x < 0);
        if (dd < def.range && g.atkT <= 0) {
          g.atkT = def.cd;
          this.damage(z, def.dmg + petLvlDmg(g.rec.lvl), d, 140, false, false, true);
          this.tweens.add({ targets: g, scale: 1.2, duration: 70, yoyo: true });
        }
      } else {
        const d = new V(home.x - g.x, home.y - g.y); const dd = d.length();
        if (dd > 10) { d.normalize(); g.setVelocity(d.x * Math.min(def.speed, dd * 4), d.y * Math.min(def.speed, dd * 4)); g.setFlipX(d.x < 0); }
        else g.setVelocity(0, 0);
      }
    });
  }

  // each morning: kitchens turn scrap into Med Kits / Pet Treats, workbenches build Cages / Lures
  produce() {
    const st = SAVE.stash, cap = stashCap(), made = {};
    this.stashFull = false;
    const add = (k) => { if (stashTotal() >= cap) { this.stashFull = true; return false; } st[k]++; made[k] = (made[k] || 0) + 1; return true; };
    SAVE.buildings.filter(b => b.t === 'kitchen').forEach(b => {
      for (let i = 0; i < prodMult(b); i++) { if (SAVE.scrap < T.medkitCost) break; if (!add(recipeOf(b))) break; SAVE.scrap -= T.medkitCost; }
    });
    SAVE.buildings.filter(b => b.t === 'workbench').forEach(b => { for (let i = 0; i < prodMult(b); i++) if (!add(recipeOf(b))) break; });
    return made;
  }

  startNight() {
    this.phase = 'night';
    this.renderBuildings();
    this.genMax = TL[SAVE.townLevel].gen; this.genHp = this.genMax;
    this.reloadSquad();
    this.spawnGuards();
    HUD.hp = HUD.maxHp;
    const day = SAVE.day, tier = SAVE.townLevel; // night difficulty comes only from the Town Hall level
    this.nightLen = Math.min(T.nightMax, T.nightBase + 20 * (tier - 1));
    this.nightT = 0;
    // zombies arrive in packs from one entrance at a time
    const n = 6 + tier * 6;
    const pool = ['walker', 'walker', 'walker', 'runner'];
    if (tier >= 2) pool.push('runner', 'spitter');
    if (tier >= 3) pool.push('bloater', 'spitter');
    if (tier >= 4) pool.push('bloater', 'runner');
    const types = [];
    for (let i = 0; i < n; i++) types.push(Phaser.Utils.Array.GetRandom(pool));
    for (let i = 0; i < Math.max(0, tier - 2); i++) types.splice(Phaser.Math.Between(Math.floor(n / 2), types.length), 0, 'brute');
    this.banditNight = !!SAVE.raidWarn;
    if (this.banditNight) { // bandits instead of zombies
      types.length = 0;
      const nb = 4 + tier * 4;
      for (let i = 0; i < nb; i++) types.push(Math.random() < 0.55 ? 'rifleman' : 'bruiser');
      SAVE.raidWarn = false; SAVE.lastRaidDay = SAVE.day; writeSave();
    }
    const packSize = 1 + tier;
    const packs = Math.ceil(types.length / packSize);
    const window = this.nightLen * 0.8;
    this.spawnPlan = [];
    for (let pk = 0; pk < packs; pk++) {
      const e = Phaser.Utils.Array.GetRandom(this.entrances);
      const at = 3 + (pk / packs) * window;
      types.slice(pk * packSize, pk * packSize + packSize).forEach((type, j) => this.spawnPlan.push({ type, at: at + j * 0.45, e }));
    }
    this.tweens.add({ targets: this.shade, alpha: 0.42, duration: 1200 });
    HUD.banner = this.banditNight ? { text: 'BANDIT RAID!', sub: 'Riflemen will shoot your turrets from range. Protect the generator!', t: 3 } : { text: `NIGHT ${day}`, sub: `Threat level ${tier} (Town Hall) — defend the generator!`, t: 2.6 };
    this.kills0 = HUD.kills || 0;
  }

  dawn(survived) {
    if (this.phase !== 'night') return;
    this.phase = 'day';
    kids(this.enemies).forEach(z => { this.spark(z.x, z.y, 0xffd166, 6); z.destroy(); });
    kids(this.spits).forEach(s => s.destroy());
    kids(this.tBullets).forEach(s => s.destroy());
    this.clearGuards();
    this.spawnPlan = [];
    this.magnetAll = true;
    this.time.delayedCall(2500, () => { this.magnetAll = false; });
    let sub;
    if (survived) {
      const reward = 10 + SAVE.townLevel * 8;
      SAVE.scrap += reward; sub = `Survived!  +${reward} ⚙`;
    } else {
      const protectedAmt = protectAmt();
      const lost = Math.floor(Math.max(0, SAVE.scrap - protectedAmt) * T.genLossPct);
      SAVE.scrap -= lost; sub = `${this.banditNight ? 'The bandits looted the town.' : 'The generator fell.'}  Lost ${lost} ⚙${protectedAmt ? ` (storehouses saved ${Math.min(protectedAmt, SAVE.scrap)})` : ''}`;
    }
    const farms = farmScrap();
    // workers earn a little XP every morning
    SAVE.buildings.forEach(b => { const pt = b.w && petById(b.w); if (pt) addXp(pt, 6); });
    if (farms) { SAVE.scrap += farms; sub += `   ·   Farms +${farms} ⚙`; }
    const made = this.produce();
    const mk = Object.entries(made).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${ITEMS[k]}${n > 1 ? 's' : ''}`);
    if (mk.length) sub += `\nMade: ${mk.join(', ')}`;
    if (this.stashFull) sub += `${mk.length ? '' : '\n'}  (stash full: build a Storehouse)`;
    SAVE.day++; SAVE.runsToday = 0; SAVE.raidedToday = false;
    // once you've hit a camp, bandits may come for you; scouts warn you a day ahead
    if (campsBeaten() > 0 && !SAVE.raidWarn && (SAVE.lastRaidDay == null || SAVE.day - SAVE.lastRaidDay >= 3) && Math.random() < 0.35) {
      SAVE.raidWarn = true; sub += '\n⚠ Scouts spotted bandits. They will attack TONIGHT.';
    }
    this.banditNight = false;
    writeSave();
    this.tweens.add({ targets: this.shade, alpha: 0, duration: 1500 });
    this.renderBuildings();
    this.genHp = this.genMax;
    if (HUD.dead) { HUD.dead = false; untint(this.hero); this.hero.setPosition(this.hallPos.x, this.hallPos.y + 70); }
    this.reloadSquad();
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
      else if (dist(h, this.subPos) < 70) HUD.prompt = { label: !this.eastOpen ? 'SUBWAY: TOWN HALL LV 2 OPENS THIS PATH' : HUD.runsLeft > 0 ? 'ENTER THE SUBWAY' : 'SUBWAY: COME BACK TOMORROW', action: 'subway' };
      else if (dist(h, this.hallPos) < 100) HUD.prompt = { label: 'TOWN HALL', action: 'hall' };
      else if (dist(h, this.penPos) < 95) HUD.prompt = { label: 'CREATURE PEN', action: 'pen' };
      else if (dist(h, this.warPos) < 95) HUD.prompt = { label: SAVE.raidWarn ? 'WAR TABLE  ·  ⚠ BANDITS TONIGHT' : 'WAR TABLE', action: 'war' };
      else {
        const pb = this.bSprites.find(b => RECIPES[b.bt] && dist(h, b) < 62);
        if (pb) HUD.prompt = { label: `${BLD[pb.bt].name.toUpperCase()}: ${ITEMS[recipeOf(pb.rec)].toUpperCase()}S  ⇄`, action: 'recipe', b: pb };
      }
    }
    HUD.scrap = SAVE.scrap;
    this.updatePenPets(dt);
    this.bSprites.forEach(b => { if (b.workerImg) b.workerImg.y = b.y - 16 + Math.sin(this.time.now * 0.005 + b.c) * 2; });
    HUD.canSwap = this.phase === 'day' && !HUD.building && !HUD.panel && this.squadRecs.length > 1;

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
      this.updateGuards(dt, this.time.now);
      kids(this.tBullets).forEach(b => { if (b.active && Phaser.Math.Distance.Between(b.x, b.y, b.sx, b.sy) > b.range) b.destroy(); });
      HUD.night = { t: Math.max(0, this.nightLen - this.nightT), gen: this.genHp, genMax: this.genMax };
      if (this.dawnPending === 'fail') { this.dawnPending = null; this.dawn(false); }
      else if (this.nightT >= this.nightLen) this.dawn(true);
    } else HUD.night = null;
  }

  updateTurrets(dt) {
    this.bSprites.forEach(t => {
      if (t.bt !== 'turret' || t.dead) return;
      const st0 = TURRET[t.lvl], crew = !!t.workerImg;
      const st = { range: st0.range, dmg: st0.dmg + (crew ? 1 : 0), rate: st0.rate * (crew && t.fav ? 0.75 : 1) };
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