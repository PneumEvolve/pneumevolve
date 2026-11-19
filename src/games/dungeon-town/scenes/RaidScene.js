import { flash, kids, untint } from '../util';
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
    this.hazards = [];
    const g = this.grid, px = [], spawns = [];
    this.buildSolidRuns(g, TCOLS, TROWS, '#');
    for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++) {
      const ch = g[r][c], x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      if (ch === 'W' || ch === 'g') {
        const w = this.crates.create(x, y, ch === 'W' ? 'wall' : 'gate'); w.refreshBody();
        Object.assign(w, { hp: CAMP_HP[ch], maxHp: CAMP_HP[ch], isCampWall: true }); w.setDepth(10 + y / 1000);
      }
      if (ch === 'c') { const cr = this.crates.create(x, y, 'crate'); cr.refreshBody(); cr.hp = 2; cr.setDepth(5 + y / 1000); }
      if (ch === 'x' || ch === '^') { this.add.image(x, y, ch === 'x' ? 'wire' : 'spikes').setDepth(1.2); this.hazards[r * TCOLS + c] = ch; }
      if (ch === 'P') px.push({ x, y });
      if ('tRbB'.includes(ch)) spawns.push({ ch, x, y });
    }
    this.drawGridFloor(g, TCOLS, TROWS, '#', 'ruins');
    const entry = px.length ? { x: px.reduce((a, p) => a + p.x, 0) / px.length, y: px.reduce((a, p) => a + p.y, 0) / px.length } : { x: TILE * 2, y: TH / 2 };
    this.entry = entry;
    this.setupCombat(entry.x + 20, entry.y, TW, TH, 420);
    this.placeStash(this.grid, TCOLS, TROWS, entry);
    spawns.forEach(sp => {
      const type = { t: 'bturret', R: 'radio', b: 'rifleman', B: 'bruiser' }[sp.ch];
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

  hitCrate(cr, dmg) {
    if (!cr.isCampWall) return super.hitCrate(cr, dmg);
    if (!cr.active) return;
    cr.hp -= dmg;
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