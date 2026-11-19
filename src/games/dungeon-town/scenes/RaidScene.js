import Phaser from 'phaser';
import { V, dist, flash, kids, untint } from '../util';
import { E, TCOLS, TH, TILE, TROWS, TW } from '../tuning';
import { CAMPS, CAMP_HP } from '../maps';
import { HUD, SAVE, campDone, writeSave } from '../state';
import { makeTextures } from '../textures';
import { DungeonScene } from './DungeonScene';

// ===================================================================
//  RAID — attack a bandit camp, knock down its radio tower
// ===================================================================
export class RaidScene extends DungeonScene {
  constructor() { super('raid'); }

  create() {
    makeTextures(this);
    const run = this.run, camp = CAMPS[run.camp];
    this.camp = camp; this.won = false;
    this.crates = null; this.bulletBlockers = null;
    HUD.scene = 'raid';
    HUD.maxHp = run.maxHp; HUD.hp = run.hp; HUD.scrap = 0; HUD.cages = 0;
    HUD.prompt = null; HUD.building = false; HUD.panel = null; HUD.night = null;
    HUD.banner = { text: camp.name.toUpperCase(), sub: camp.teach, t: 3.2 };
    this.grid = camp.map.map(r => r.padEnd(TCOLS, '#').slice(0, TCOLS));
    this.physics.world.setBounds(0, 0, TW, TH);
    this.solids = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    this.hazards = []; this.mines = []; this.vents = []; this.minesShown = false;
    const g = this.grid, px = [], spawns = [];
    this.buildSolidRuns(g, TCOLS, TROWS, '#');
    for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++) {
      const ch = g[r][c], x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      if (ch === 'W' || ch === 'g' || ch === 'Q') {
        const w = this.crates.create(x, y, ch === 'W' ? 'wall' : ch === 'Q' ? 'rwall' : 'gate'); w.refreshBody();
        Object.assign(w, { hp: CAMP_HP[ch], maxHp: CAMP_HP[ch], isCampWall: true, reinforced: ch === 'Q' }); w.setDepth(10 + y / 1000);
      }
      if (ch === 'm') this.mines.push({ x, y, img: this.add.image(x, y, 'mine').setDepth(1.3).setAlpha(0), shown: false, armT: 0 });
      if (ch === 'v') { this.add.image(x, y, 'vent').setDepth(1.2); this.vents.push({ x, y, t: Phaser.Math.FloatBetween(2, 5) }); }
      if (ch === 'c') { const cr = this.crates.create(x, y, 'crate'); cr.refreshBody(); cr.hp = 2; cr.setDepth(5 + y / 1000); }
      if (ch === 'x' || ch === '^') { this.add.image(x, y, ch === 'x' ? 'wire' : 'spikes').setDepth(1.2); this.hazards[r * TCOLS + c] = ch; }
      if (ch === 'P') px.push({ x, y });
      if ('tRbBd'.includes(ch)) spawns.push({ ch, x, y });
    }
    this.drawGridFloor(g, TCOLS, TROWS, '#', 'ruins');
    const entry = px.length ? { x: px.reduce((a, p) => a + p.x, 0) / px.length, y: px.reduce((a, p) => a + p.y, 0) / px.length } : { x: TILE * 2, y: TH / 2 };
    this.entry = entry;
    this.setupCombat(entry.x + 20, entry.y, TW, TH, 420);
    this.placeStash(this.grid, TCOLS, TROWS, entry);
    spawns.forEach(sp => {
      const type = { t: 'bturret', R: 'radio', b: 'rifleman', B: 'bruiser', d: 'bdog' }[sp.ch];
      const z = this.spawnEnemy(type, sp.x, sp.y);
      if (E[type].bandit) z.idle = true;
      if (type === 'radio') this.tower = z;
    });
    this.lanes = []; this.roomClear = false; this.spikeT = 0; this.petSpikeT = 0;
  }

  onEvent() {}
  sceneUpdate(dt) {
    HUD.topText = `${this.camp.name.toUpperCase()}   ·   ⚙ ${this.run.scrap}${this.run.parts ? `   ·   🔩 ${this.run.parts}` : ''}`;
    if (this.won || HUD.dead) return;
    this.updateMines(dt);
    this.updateCampVents(dt);
    // hazards: wire slows you, spikes hurt (a dash carries you over both)
    const at = (o) => this.hazards[Math.floor(o.y / TILE) * TCOLS + Math.floor(o.x / TILE)];
    const h = this.hero, hz = at(h);
    if (hz === 'x' && this.dashT <= 0) h.body.velocity.scale(0.45);
    this.spikeT -= dt;
    if (hz === '^' && this.spikeT <= 0) { this.spikeT = 0.8; this.hurtHero(0, 0, 1); }
    this.petSpikeT -= dt;
    if (this.petSpikeT <= 0) {
      this.petSpikeT = 0.9;
      this.activePets.forEach(p => { if (p && p.active && !p.def.fly && at(p) === '^') this.damagePet(p, 1, 0, 0); });
    }
  }

  // hidden mines: you see them only up close (or after a Bat's Screech); step on one and it blows
  revealMines(h, R) {
    let n = 0;
    (this.mines || []).forEach(m => { if (!m.shown && dist(m, h) < R + 140) { m.shown = true; m.img.setAlpha(1); this.ring(m.x, m.y, 22, 0xff4d6d); n++; } });
    if (n) this.floatText(h.x, h.y - 66, `${n} MINE${n > 1 ? 'S' : ''} FOUND`, '#ff8c9e', 14);
  }
  updateMines(dt) {
    const walkers = [this.hero].concat(this.allPets().filter(p => !p.def.fly && !p.dig));
    this.mines = this.mines.filter(m => {
      const near = walkers.some(o => dist(o, m) < 64);
      if (!m.shown) m.img.setAlpha(near ? 0.55 + 0.45 * Math.sin(this.time.now * 0.02) : 0);
      if (m.armT > 0) {
        m.armT -= dt; m.img.setAlpha(1).setTint(Math.floor(this.time.now / 60) % 2 ? 0xffffff : 0xff4d6d);
        if (m.armT <= 0) {
          this.ring(m.x, m.y, 70, 0xff6a3d); this.spark(m.x, m.y, 0xff6a3d, 14); this.decal(m.x, m.y); this.cameras.main.shake(180, 0.012);
          if (dist(this.hero, m) < 70) { const d = new V(this.hero.x - m.x, this.hero.y - m.y).normalize(); this.hurtHero(d.x, d.y, 2); }
          this.allPets().forEach(p => { if (dist(p, m) < 70) this.damagePet(p, 1, 0, 0); });
          kids(this.enemies).forEach(z => { if (z.active && !E[z.type].struct && dist(z, m) < 70) this.damage(z, 3, new V(z.x - m.x, z.y - m.y).normalize(), 200, true, true); });
          m.img.destroy(); return false;
        }
        return true;
      }
      if (walkers.some(o => dist(o, m) < 24)) { m.armT = 0.35; m.shown = true; this.floatText(m.x, m.y - 24, 'CLICK', '#ff4d6d', 14); }
      return true;
    });
  }
  // camp gas vents: bandits wear masks, so the gas only hurts you and your pets
  updateCampVents(dt) {
    (this.vents || []).forEach(v => {
      v.t -= dt;
      if (v.t < 0.8 && !v.hiss) { v.hiss = true; this.spark(v.x, v.y, 0x9fd14a, 6); }
      if (v.t <= 0) { v.t = Phaser.Math.FloatBetween(5, 7); v.hiss = false; this.addGas(v.x, v.y, 75, 3.5, { foe: true, zombies: false }); }
    });
  }

  hitCrate(cr, dmg) {
    if (!cr.isCampWall) return super.hitCrate(cr, dmg);
    if (!cr.active) return;
    // reinforced walls shrug off guns and swords; only a Ram's charge (or digging under) really works
    if (cr.reinforced && dmg < 8) { dmg *= 0.25; if (!this.toughSaid) { this.toughSaid = true; this.floatText(cr.x, cr.y - 30, 'TOO TOUGH: charge it or dig under', '#c0c6cc', 13); } }
    cr.hp -= dmg * (dmg >= 8 ? 1 : this.structMult());
    flash(cr, 0xffffff); this.time.delayedCall(60, () => cr.active && untint(cr));
    this.spark(cr.x, cr.y, 0x8a7a5a, 4);
    if (cr.hp <= 0) { this.spark(cr.x, cr.y, 0x6b737c, 14); this.cameras.main.shake(100, 0.005); cr.destroy(); }
  }

  killEnemy(z) {
    const tower = z === this.tower;
    super.killEnemy(z);
    if (tower) this.winRaid();
  }

  winRaid() {
    if (this.won) return;
    this.won = true; this.magnetAll = true;
    const run = this.run, first = !campDone(run.camp);
    const bonus = first ? this.camp.reward : Math.round(this.camp.reward * 0.4);
    kids(this.enemies).forEach(z => { if (E[z.type].bandit) { this.spark(z.x, z.y, 0xffd166, 8); this.floatText(z.x, z.y - 30, 'RUN!', '#ffd166', 16); z.destroy(); } });
    kids(this.spits).forEach(s => s.destroy());
    HUD.banner = { text: 'CAMP RAIDED!', sub: `The radio is down. +${bonus} ⚙ and ${first ? this.camp.parts : Math.round(this.camp.parts * 0.4)} 🔩 from their stash`, t: 2.6 };
    this.cameras.main.shake(300, 0.01);
    this.time.delayedCall(2600, () => {
      if (this.leaving) return;
      SAVE.scrap += run.scrap + bonus;
      const pb = (run.parts || 0) + (first ? (this.camp.parts || 0) : Math.round((this.camp.parts || 0) * 0.4)); SAVE.parts = (SAVE.parts || 0) + pb;
      if (first) { SAVE.camps = SAVE.camps || {}; SAVE.camps[run.camp] = true; }
      writeSave();
      this.endRun({ type: 'raidWin', camp: run.camp, scrap: run.scrap + bonus, parts: pb, first });
    });
  }

  heroDied() {
    const run = this.run;
    HUD.deadText = `YOU DIED\nLost ${run.scrap} scrap${run.parts ? ` and ${run.parts} parts` : ''}`;
    this.time.delayedCall(1900, () => this.endRun({ type: 'raidDead', camp: run.camp, scrap: run.scrap }));
  }

  drawSceneFx(g) {
    kids(this.crates).forEach(w => {
      if (!w.active || !w.isCampWall || w.hp >= w.maxHp) return;
      g.fillStyle(0x000000, 0.7); g.fillRect(w.x - 18, w.y - 28, 36, 5);
      g.fillStyle(0xff8c42, 1); g.fillRect(w.x - 18, w.y - 28, 36 * w.hp / w.maxHp, 5);
    });
    kids(this.enemies).forEach(z => {
      if (!z.active || !E[z.type].struct) return;
      const big = z === this.tower, w = big ? 70 : 36;
      if (!big && z.hp >= z.maxHpS) return;
      g.fillStyle(0x000000, 0.7); g.fillRect(z.x - w / 2, z.y - (big ? 60 : 30), w, big ? 7 : 5);
      g.fillStyle(big ? 0xff4d6d : 0xff8c42, 1); g.fillRect(z.x - w / 2, z.y - (big ? 60 : 30), w * Math.max(0, z.hp) / z.maxHpS, big ? 7 : 5);
    });
  }
}