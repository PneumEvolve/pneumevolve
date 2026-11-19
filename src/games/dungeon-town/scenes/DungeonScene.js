import Phaser from 'phaser';
import { V, dist, kids } from '../util';
import { COLS, FIRST_CATCH, FIRST_HOS, FIRST_SUB, RH, ROWS, RW, SP, T, TILE, WILD, WILD_HOS, WILD_SUB } from '../tuning';
import { BOSS_ROOM, FINAL_ROOM, HOS_BOSS, HOS_FINAL, HOS_TEMPLATES, SUB_BOSS, SUB_FINAL, SUB_TEMPLATES, TEMPLATES, hospitalWaves, subwayWaves, wavesFor } from '../maps';
import { HUD, SAVE, addPet, labActive, writeSave } from '../state';
import { makeTextures } from '../textures';
import { Combat } from '../combat';

// ===================================================================
//  DUNGEON — a run through the ruins (5 rooms)
// ===================================================================
export class DungeonScene extends Combat {
  constructor(key) { super(key || 'dungeon'); }
  init(data) { this.run = data.run; }

  create() {
    makeTextures(this);
    const run = this.run;
    this.crates = null; this.bulletBlockers = null;
    HUD.scene = 'dungeon';
    HUD.maxHp = run.maxHp; HUD.hp = run.hp; HUD.room = run.room; HUD.scrap = run.scrap; HUD.cages = run.cages; HUD.parts = run.parts || 0;
    this.dg = run.dungeon || 'ruins';
    const DGS = {
      ruins: { name: 'RUINS', tpl: TEMPLATES, boss: BOSS_ROOM, fin: FINAL_ROOM, waves: wavesFor, wild: WILD, first: FIRST_CATCH, theme: 'ruins' },
      subway: { name: 'SUBWAY', tpl: SUB_TEMPLATES, boss: SUB_BOSS, fin: SUB_FINAL, waves: subwayWaves, wild: WILD_SUB, first: FIRST_SUB, theme: 'subway' },
      hospital: { name: 'HOSPITAL', tpl: HOS_TEMPLATES, boss: HOS_BOSS, fin: HOS_FINAL, waves: hospitalWaves, wild: WILD_HOS, first: FIRST_HOS, theme: 'hospital' },
    };
    this.DG = DGS[this.dg] || DGS.ruins;
    const dgName = this.DG.name;
    HUD.dungeonName = dgName;
    HUD.banner = { text: run.room === T.rooms ? 'FINAL ROOM' : T.bossRooms.includes(run.room) ? 'BOSS ROOM' : `${dgName} · ROOM ${run.room}`, t: 1.4 };
    HUD.prompt = null; HUD.building = false; HUD.panel = null; HUD.night = null;

    this.isExtractRoom = T.extractRooms.includes(run.room);
    const tpl = run.room === T.rooms ? this.DG.fin : T.bossRooms.includes(run.room) ? this.DG.boss : Phaser.Utils.Array.GetRandom(this.DG.tpl);
    this.grid = tpl.map(r => r.padEnd(COLS, '#').slice(0, COLS));
    this.physics.world.setBounds(0, 0, RW, RH);
    this.solids = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    this.buildRoom();
    this.setupCombat(this.entry.x, this.entry.y - 20, RW, RH, 420);
    this.placeStash(this.grid, COLS, ROWS, this.entry);
    // MEND is limited per room: a new room gives it back
    (this.run.pets || []).forEach(r => { if (r.mendUses) { r.mendUses = 0; r.cdT = 0; } });

    // a wild creature? first-time catches are guaranteed in their room
    const owned = (sp) => SAVE.pets.some(pt => pt.sp === sp) || run.captured.includes(sp);
    const first = this.DG.first[run.room];
    // every native shows up exactly once per run, in its own room (your first one comes early, in its set room)
    if (!run.wildPlan) {
      run.wildPlan = {};
      const WT = this.DG.wild, F = this.DG.first, used = new Set();
      Object.keys(WT).forEach(sp => {
        let room = +(Object.keys(F).find(r => F[r] === sp && !owned(sp)) || 0);
        if (!room || used.has(room)) {
          const opts = []; for (let r = WT[sp][0]; r <= WT[sp][1]; r++) if (!used.has(r)) opts.push(r);
          room = opts.length ? Phaser.Utils.Array.GetRandom(opts) : 0;
        }
        if (room) { used.add(room); run.wildPlan[room] = sp; }
      });
      // Bat in the Lab: a creature from another district wanders in
      if (labActive('bat')) {
        const others = Object.keys(Object.assign({}, WILD, WILD_SUB, WILD_HOS)).filter(sp => !WT[sp]);
        const free = []; for (let r = 2; r <= 9; r++) if (!used.has(r)) free.push(r);
        if (others.length && free.length) run.wildPlan[Phaser.Utils.Array.GetRandom(free)] = Phaser.Utils.Array.GetRandom(others);
      }
    }
    const wildSp = run.wildPlan[run.room] || null;
    if (wildSp) this.spawnWild(wildSp);
    this.waves = this.DG.waves(run.room);
    this.setupTrains();
    this.waveIdx = -1; this.waveDelay = 1.0;
    this.roomClear = false; this.extractT = 0;
  }

  collectScrap(n) { this.run.scrap += n; HUD.scrap = this.run.scrap; }
  collectParts(n) { this.run.parts = (this.run.parts || 0) + n; HUD.parts = this.run.parts; }
  onAbandon() { this.endRun({ type: 'abandon' }); }
  getSquadRecs() { return this.run.pets; }
  itemSrc() { return this.run.items || null; }
  onEvent(ev) { if (ev.type === 'swapSlots' && this.roomClear && !HUD.dead && !this.leaving) this.swapSlots(ev.a, ev.b); }

  buildRoom() {
    const grid = this.grid;
    this.spawns = []; this.doorZones = []; this.vents = [];
    const px = [], hx = [], dx = [];
    this.buildSolidRuns(grid, COLS, ROWS, '#');
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c], x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      if (ch === 'c') { const cr = this.crates.create(x, y, 'crate'); cr.refreshBody(); cr.hp = 2; cr.setDepth(5 + y / 1000); }
      if (ch === 'r') { const rb = this.solids.create(x, y, 'rubble'); rb.refreshBody(); rb.setDepth(5 + y / 1000); }
      if (ch === 's') this.spawns.push({ x, y });
      if (ch === 'v') { this.add.image(x, y, 'vent').setDepth(1.2); this.vents.push({ x, y, t: Phaser.Math.FloatBetween(2, 6) }); }
      if (ch === 'P') px.push({ x, y });
      if (ch === 'H') hx.push({ x, y });
      if (ch === 'D') { dx.push({ x, y }); const z = this.add.zone(x, y, TILE, TILE); this.physics.add.existing(z, true); this.solids.add(z); this.doorZones.push(z); }
    }
    const avg = (a) => a.length ? { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length } : null;
    this.entry = avg(px) || { x: RW / 2, y: RH - TILE * 1.5 };
    this.hatchPos = avg(hx) || { x: RW / 2, y: RH / 2 };
    this.doorPos = avg(dx);
    this.drawGridFloor(grid, COLS, ROWS, '#D', this.DG.theme);
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

  // ---- trains (subway): a lane flashes, then a train sweeps through and wrecks everything on it
  // gas vents (hospital): hiss, then puff a drifting toxic cloud
  updateVents(dt) {
    if (!this.vents || !this.vents.length || this.roomClear) return;
    this.vents.forEach(v => {
      v.t -= dt;
      if (v.t < 0.8 && !v.hiss) { v.hiss = true; this.spark(v.x, v.y, 0x9fd14a, 6); }
      if (v.t <= 0) {
        v.t = Phaser.Math.FloatBetween(6, 9); v.hiss = false;
        this.addGas(v.x, v.y, 70, 3.5, { foe: true, zombies: true, vx: Phaser.Math.Between(-14, 14), vy: Phaser.Math.Between(-14, 14) });
      }
    });
  }

  setupTrains() {
    this.lanes = [];
    this.grid.forEach((row, r) => { if (row.includes('=')) this.lanes.push({ y: r * TILE + TILE / 2, state: 'wait', t: Phaser.Math.FloatBetween(4, 8), dir: 1, train: null }); });
  }
  updateTrains(dt) {
    (this.lanes || []).forEach(L => {
      L.t -= dt;
      if (L.state === 'wait' && L.t <= 0) {
        L.state = 'warn'; L.t = 1.5; L.dir = Math.random() < 0.5 ? 1 : -1;
        this.floatText(Phaser.Math.Clamp(this.hero.x, 80, RW - 80), L.y - 30, 'TRAIN!', '#ff4d6d', 18);
      }
      // your pets get off the tracks when a train is coming (zombies don't — lure them!)
      if (L.state === 'warn' || L.state === 'go') this.allPets().forEach(p => { if (p.mode !== 'pounce' && Math.abs(p.y - L.y) < 46) p.setVelocity(p.body.velocity.x * 0.3, (p.y < L.y ? -1 : 1) * 300); });
      if (L.state === 'warn' && L.t <= 0) {
        L.state = 'go'; L.hit = new Set();
        L.train = this.add.image(L.dir > 0 ? -160 : RW + 160, L.y, 'train').setDepth(860).setFlipX(L.dir < 0);
        this.cameras.main.shake(400, 0.006);
      } else if (L.state === 'go') {
        const tr = L.train; tr.x += L.dir * 1500 * dt;
        const inLane = (o) => o && o.active && Math.abs(o.y - L.y) < 38 && Math.abs(o.x - tr.x) < 150 && !L.hit.has(o);
        if (inLane(this.hero)) { L.hit.add(this.hero); this.hurtHero(0, this.hero.y < L.y ? -1 : 1, 2); }
        this.allPets().forEach(p => { if (inLane(p)) { L.hit.add(p); this.damagePet(p, 2, 0, p.y < L.y ? -1 : 1); } });
        kids(this.enemies).forEach(z => { if (inLane(z) && !z.hidden) { L.hit.add(z); this.damage(z, 12, new V(L.dir, z.y < L.y ? -0.6 : 0.6).normalize(), 600, true, true); } });
        this.ratlings.forEach(r => { if (inLane(r)) this.killRatling(r); });
        if ((L.dir > 0 && tr.x > RW + 200) || (L.dir < 0 && tr.x < -200)) { tr.destroy(); L.train = null; L.state = 'wait'; L.t = Phaser.Math.FloatBetween(6, 11); }
      }
    });
  }

  sceneUpdate(dt) {
    HUD.cages = this.run.cages;
    this.updateTrains(dt);
    this.updateVents(dt);
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
    if (HUD.hp < HUD.maxHp) { const hl = labActive('moth') ? 2 : 1; HUD.hp = Math.min(HUD.maxHp, HUD.hp + hl); this.floatText(this.hero.x, this.hero.y - 40, `+${hl} ♥`, '#ff8c9e', 18); }
    // bench pets rest and heal
    this.squadRecs.forEach(r => {
      const out = this.activePets.some(p => p && p.active && p.rec === r);
      if (!out && !r.ko) this.healPet(r, [0, 1, 2, 3][this.prk('nurse')]);
      if (out && this.prk('nurse') >= 3) this.healPet(r, 1);
    });
    HUD.canSwap = this.squadRecs.length > 1; this.syncSquadHud();
    writeSave();
    if (this.run.room < T.rooms) { this.doorZones.forEach(z => z.destroy()); this.drawDoor(true); }
    if (this.isExtractRoom) {
      this.hatch.setVisible(true).setScale(0);
      this.tweens.add({ targets: this.hatch, scale: 1, duration: 400, ease: 'Back.out' });
    }
    HUD.banner = { text: this.run.room === T.rooms ? 'RUINS CLEARED! EXTRACT' : 'ROOM CLEAR', sub: (this.isExtractRoom && this.run.room < T.rooms ? 'Hatch = go home with your loot  ·  Door = go deeper' : 'Tap two pets on the left to swap them'), t: 2.8 };
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
    if (labActive('hound') && run.scrap) run.scrap += Math.round(run.scrap * 0.25);
    SAVE.scrap += run.scrap; SAVE.parts = (SAVE.parts || 0) + (run.parts || 0);
    SAVE.runs++; if (this.dg === 'ruins') SAVE.bestRoom = Math.max(SAVE.bestRoom, run.room);
    SAVE.best = SAVE.best || {}; SAVE.best[this.dg] = Math.max(SAVE.best[this.dg] || 0, run.room);
    run.captured.forEach(sp => addPet(sp));
    const clearKey = `${this.dg}Cleared`;
    const firstClear = run.room >= T.rooms && !SAVE[clearKey];
    if (run.room >= T.rooms) SAVE[clearKey] = true;
    writeSave();
    this.tweens.add({ targets: [this.hero, this.gun], scale: 0, duration: 300 });
    this.time.delayedCall(450, () => this.endRun({ type: 'extract', scrap: run.scrap, parts: run.parts || 0, dungeon: this.dg, caught: Object.entries(run.captured.reduce((m, sp) => { m[sp] = (m[sp] || 0) + 1; return m; }, {})).map(([sp, n]) => (n > 1 ? n + '× ' : '') + SP[sp].name).join(', '), firstClear }));
  }

  heroDied() {
    const run = this.run;
    HUD.deadText = `YOU DIED\nLost ${run.scrap} scrap${run.parts ? ` and ${run.parts} parts` : ''}`;
    SAVE.runs++; if (this.dg === 'ruins') SAVE.bestRoom = Math.max(SAVE.bestRoom, run.room - 1); writeSave();
    this.time.delayedCall(1900, () => this.endRun({ type: 'dead', room: run.room, scrap: run.scrap, caught: run.captured.length }));
  }

  endRun(result) {
    this.leaving = true;
    // unused items (and spare cages) go back to the stash
    const run = this.run, st = SAVE.stash;
    if (run.items) { st.medkit += run.items.medkit || 0; st.treat += run.items.treat || 0; st.lure += run.items.lure || 0; run.items = null; }
    st.cage += Math.max(0, Math.min(run.cages, run.stashCages || 0));
    run.stashCages = 0;
    writeSave();
    this.scene.start('town', { result });
  }

  drawSceneFx(g, time) {
    (this.lanes || []).forEach(L => {
      if (L.state !== 'warn') return;
      const on = Math.floor((time || 0) / 150) % 2 === 0;
      g.fillStyle(0xff3b3b, on ? 0.35 : 0.12); g.fillRect(TILE, L.y - 24, RW - TILE * 2, 48);
    });
    if (this.extractT > 0) {
      g.lineStyle(5, 0x8ef0a0, 1); g.beginPath();
      g.arc(this.hatchPos.x, this.hatchPos.y, 52, -Math.PI / 2, -Math.PI / 2 + this.extractT * Math.PI * 2, false); g.strokePath();
    }
  }

  spawnWild(sp) {
    const def = SP[sp];
    let x, y, tries = 0;
    do { x = Phaser.Math.Between(TILE * 2, RW - TILE * 2); y = Phaser.Math.Between(TILE * 2, RH / 2); tries++; }
    while ((this.grid[Math.floor(y / TILE)][Math.floor(x / TILE)] !== '.' || Phaser.Math.Distance.Between(x, y, this.entry.x, this.entry.y) < 300) && tries < 40);
    const c = this.physics.add.image(x, y, sp);
    c.body.setCircle(def.body[0], def.body[1], def.body[2]);
    c.setCollideWorldBounds(true);
    if (!def.fly) { this.physics.add.collider(c, this.solids); this.physics.add.collider(c, this.crates); }
    const speed = { crow: 125, rat: 175, beetle: 70, moth: 140, hound: 150, mole: 120, bat: 150 }[sp] || 120;
    Object.assign(c, { isWild: true, species: sp, hp: def.wildHp, maxHp: def.wildHp, wSpeed: speed, weak: 0, mode: 'wander', zapT: 2.5, tx: x, ty: y, wt: 0, caged: false, fleeing: false, kbT: 0 });
    this.physics.add.overlap(this.bullets, c, (a, b) => {
      const bl = a.isBullet ? a : b; if (!bl.active || c.caged || c.fleeing) return;
      const d = new V(bl.body.velocity.x, bl.body.velocity.y).normalize();
      const dmg = bl.dmg; bl.destroy(); this.damageWild(c, dmg, d, 150);
    });
    this.wild = c;
    this.time.delayedCall(1500, () => { if (this.wild === c && c.active && !HUD.banner) HUD.banner = { text: `A WILD ${def.name.toUpperCase()}!`, sub: 'Weaken it until it glows, then throw a cage', t: 2.6 }; });
  }
}