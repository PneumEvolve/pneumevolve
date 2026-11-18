import Phaser from 'phaser';
import { FONT, V, dist, flash, kids, untint } from './util';
import { E, ITEMS, SP, T, TILE, XP } from './tuning';
import { Ctl, HUD, SAVE, addXp, ammoMax, dashCd, gunDmg, isMilestone, levelCap, maxHearts, perk, petById, petLvlDmg, petMaxHp, reloadTime, swordDmg, writeSave, xpNeed } from './state';

// ===================================================================
//  COMBAT BASE — hero, companions, enemies, shared by Town + Dungeon
// ===================================================================
export class Combat extends Phaser.Scene {
  // hooks a scene can override
  // who a zombie goes after: a shelled beetle first, then the closest of you / your pets / ratlings
  closeTarget(z, maxRange) {
    const h = this.hero;
    const taunt = this.allPets().find(p => p.shellT > 0 && dist(p, z) < 260);
    if (taunt) return { x: taunt.x, y: taunt.y, kind: 'pet', obj: taunt, pad: 0 };
    const lure = (this.lures || []).find(l => l.active && dist(l, z) < T.lureRange);
    if (lure) return { x: lure.x, y: lure.y, kind: 'lure', obj: lure, pad: 0 };
    let best = null, bd = maxRange;
    if (!HUD.dead) { const d = dist(z, h); if (d < bd) { bd = d; best = { x: h.x, y: h.y, kind: 'hero', obj: h, pad: 0 }; } }
    this.allPets().forEach(p => {
      if (p.mode === 'pounce') return;
      const d = dist(z, p) * 1.3; if (d < bd) { bd = d; best = { x: p.x, y: p.y, kind: 'pet', obj: p, pad: 0 }; }
    });
    this.ratlings.forEach(r => { if (!r.active) return; const d = dist(z, r); if (d < bd) { bd = d; best = { x: r.x, y: r.y, kind: 'decoy', obj: r, pad: 0 }; } });
    return best;
  }
  targetFor(z) {
    const h = this.hero;
    if (this.cage && dist(z, this.cage) < Math.min(260, dist(z, h))) return { x: this.cage.x, y: this.cage.y, kind: 'cage', obj: this.cage, pad: 0 };
    return this.closeTarget(z, Infinity) || { x: h.x, y: h.y, kind: 'hero', obj: h, pad: 0 };
  }
  hitTarget(tg, dmg, dx, dy) {
    if (tg.kind === 'cage') this.damageCage(dmg);
    else if (tg.kind === 'hero') this.hurtHero(dx, dy, dmg);
    else if (tg.kind === 'pet') this.damagePet(tg.obj, dmg, dx, dy);
    else if (tg.kind === 'decoy') this.killRatling(tg.obj);
    // a lure just soaks up hits until it runs out
  }
  getSquadRecs() { return []; }
  onSquadOrderChanged() {}
  allPets() { return this.activePets.concat(this.guards || []).filter(p => p && p.active); }
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
    this.worldW = worldW; this.worldH = worldH; this.zoomDiv = zoomDiv;
    Object.assign(HUD, {
      ammo: ammoMax(), reload: 0, dashCd: 0, cd1: 0, cd2: 0, cd1Max: 1, cd2Max: 1,
      ab1Label: null, ab2Label: null, ab1Sp: null, ab2Sp: null,
      canCapture: false, dead: false, canSwap: false,
    });
    Ctl.queue.length = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;

    this.hero = this.physics.add.image(x, y, 'hero');
    this.hero.body.setCircle(13, 11, 16);
    this.hero.setCollideWorldBounds(true);
    this.gun = this.add.image(0, 0, 'gun').setOrigin(0.1, 0.4);
    this.facing = new V(0, -1);
    this.dashT = 0; this.dashDir = new V(1, 0); this.inv = 0; this.gunCdT = 0; this.swordCdT = 0;
    this.kbT = 0; this.kb = new V(); this.gunKick = 0; this.faceLock = 0; this.ghostT = 0;


    if (!this.crates) this.crates = this.physics.add.staticGroup();
    if (!this.bulletBlockers) this.bulletBlockers = this.solids;
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.spits = this.physics.add.group();
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.collider(this.hero, this.crates);
    this.petsGround = this.physics.add.group(); this.petsAir = this.physics.add.group();
    this.physics.add.collider(this.petsGround, this.solids);
    this.physics.add.collider(this.petsGround, this.crates);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.crates);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.enemies, this.petsGround);
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
    const spitPet = (a, b) => {
      const s = a.isSpit ? a : b, pt = a.isSpit ? b : a; if (!s.active || !pt.active) return;
      const d = new V(s.body.velocity.x, s.body.velocity.y).normalize();
      this.splash(s); this.damagePet(pt, 1, d.x, d.y);
    };
    this.physics.add.overlap(this.spits, this.petsGround, spitPet);
    this.physics.add.overlap(this.spits, this.petsAir, spitPet);

    this.fx = this.add.graphics().setDepth(900);
    this.pickups = []; this.cage = null; this.wild = null; this.pending = 0; this.magnetAll = false;
    this.squadRecs = this.getSquadRecs();
    this.computePassives();
    this.activePets = [null, null]; this.ratlings = []; this.lures = []; this.staticT = 5;
    this.syncHeroHud();
    this.fillSlots(true);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.hero, true, 0.12, 0.12);
    cam.setBackgroundColor('#0e1013');
    cam.fadeIn(250);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,F,B,N,R,ONE,TWO,THREE');
    this.hitstop = 0; this.blockedPause = false; this.leaving = false;
    if (!this.scene.isActive('ui')) this.scene.launch('ui');
  }

  fitZoom() {
    if (this.buildView) return;
    const z = Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / this.zoomDiv, 0.55, 2.4);
    this.cameras.main.setZoom(z);
  }

  drawGridFloor(grid, cols, rows, wallChars, theme) {
    const TH_ = theme === 'subway'
      ? { wall: '#34444c', wd1: '#2c3a41', wd2: '#3f525b', face: '#22303a', mortar: '#18232a', f: ['#2b2f33', '#2d3135', '#292d31'], grid: '#23272b', fd1: '#232629', fd2: '#34383d', tiles: true }
      : { wall: '#353a42', wd1: '#2c3037', wd2: '#40464f', face: '#22262c', mortar: '#1a1d22', f: ['#24272c', '#262a2f', '#222529'], grid: '#1f2226', fd1: '#1c1f23', fd2: '#2e3238' };
    const W = cols * TILE, H = rows * TILE;
    if (this.floorKey && this.textures.exists(this.floorKey)) this.textures.remove(this.floorKey);
    this.floorKey = 'floor_' + this.sys.settings.key + '_' + Date.now();
    const tex = this.textures.createCanvas(this.floorKey, W, H), c = tex.getContext(), P = 3, R = Phaser.Math;
    const isWall = (r, cc) => r < 0 || r >= rows || cc < 0 || cc >= cols || wallChars.includes(grid[r][cc]);
    const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.floor(x / P) * P, Math.floor(y / P) * P, P, P); };
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      const x0 = cc * TILE, y0 = r * TILE;
      if (isWall(r, cc)) {
        c.fillStyle = TH_.wall; c.fillRect(x0, y0, TILE, TILE);
        for (let i = 0; i < 10; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, 30), Math.random() < 0.5 ? TH_.wd1 : TH_.wd2);
        if (!isWall(r + 1, cc)) {
          c.fillStyle = TH_.face; c.fillRect(x0, y0 + 30, TILE, 18);
          c.fillStyle = TH_.mortar;
          for (let yy = 0; yy < 18; yy += 9) { c.fillRect(x0, y0 + 30 + yy, TILE, P); for (let xx = (yy ? 12 : 0); xx < TILE; xx += 24) c.fillRect(x0 + xx, y0 + 30 + yy, P, 9); }
        }
      } else {
        const shade = TH_.f[(r * 7 + cc * 3) % 3];
        c.fillStyle = shade; c.fillRect(x0, y0, TILE, TILE);
        if (TH_.tiles) { c.fillStyle = TH_.grid; c.fillRect(x0, y0, TILE, P); c.fillRect(x0, y0, P, TILE); c.fillRect(x0 + 24, y0, P, TILE); c.fillRect(x0, y0 + 24, TILE, P); }
        else if ((r + cc) % 2 === 0) { c.fillStyle = TH_.grid; c.fillRect(x0, y0, TILE, P); c.fillRect(x0, y0, P, TILE); }
        for (let i = 0; i < 7; i++) dot(x0 + R.Between(0, TILE - 1), y0 + R.Between(0, TILE - 1), Math.random() < 0.6 ? TH_.fd1 : TH_.fd2);
        if (grid[r][cc] === '=') { // train tracks
          c.fillStyle = '#1d1c1b'; c.fillRect(x0, y0 + 3, TILE, TILE - 6);
          c.fillStyle = '#4a3a2a'; for (let xx = 3; xx < TILE; xx += 12) c.fillRect(x0 + xx, y0 + 6, 6, TILE - 12);
          c.fillStyle = '#8a929a'; c.fillRect(x0, y0 + 12, TILE, P); c.fillRect(x0, y0 + 33, TILE, P);
        }
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
    if (JD(k.ONE)) Ctl.queue.push({ type: 'item', k: 'medkit' });
    if (JD(k.TWO)) Ctl.queue.push({ type: 'item', k: 'treat' });
    if (JD(k.THREE)) Ctl.queue.push({ type: 'item', k: 'lure' });

    while (Ctl.queue.length) {
      const ev = Ctl.queue.shift();
      if (ev.type === 'abandon') { this.onAbandon(); return; }
      if (ev.type === 'item') { if (!HUD.dead && !this.inputFrozen()) this.useItem(ev.k); continue; }
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
    if (HUD.ammo < ammoMax()) { HUD.reload += dt; if (HUD.reload >= reloadTime()) { HUD.ammo++; HUD.reload = 0; } } else HUD.reload = 0;

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

    this.updatePets(dt, time);
    this.updateRatlings(dt, time);
    this.updateLures(dt);
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

    [hero].concat(this.activePets.filter(p => p && p.active && !p.def.fly), kids(this.enemies)).forEach(o => o.active && o.setDepth(10 + o.y / 1000));
    this.gun.setDepth(hero.depth + 0.001);
    this.activePets.forEach(p => p && p.active && p.def.fly && p.setDepth(800));
    if (this.wild && this.wild.active) this.wild.setDepth(790);

    const isrc = this.itemSrc();
    HUD.items = isrc ? { medkit: isrc.medkit || 0, treat: isrc.treat || 0, lure: isrc.lure || 0 } : null;
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
    let elite = false;
    if (type === 'boss') { type = 'brute'; elite = true; }
    if (type === 'mother') elite = true;
    const def = E[type];
    const z = this.enemies.create(x, y, type);
    z.type = type; z.hp = def.hp; z.mode = 'chase'; z.t = 0; z.kbT = 0; z.stun = 0; z.aggro = 0; z.spikeT = 0;
    z.spd = z.baseSpd = def.speed * Phaser.Math.FloatBetween(0.88, 1.15);
    if (type === 'runner') z.body.setCircle(10, 14, 22);
    else if (type === 'brute') { z.body.setCircle(22, 10, 8); z.face = Math.atan2(this.hero.y - y, this.hero.x - x); }
    else if (type === 'bloater') z.body.setCircle(15, 9, 12);
    else if (type === 'crawler') z.body.setCircle(12, 12, 20);
    else if (type === 'mother') { z.body.setCircle(30, 10, 12); z.spawnT = 2.5; z.volT = 2; z.face = 0; }
    else z.body.setCircle(13, 11, 16);
    if (type === 'spitter' || type === 'rifleman') { z.fireT = Phaser.Math.FloatBetween(1, 2); z.strafe = Math.random() < 0.5 ? 1 : -1; }
    if (type === 'bruiser') z.body.setCircle(13, 19, 24);
    if (def.struct) {
      z.body.setImmovable(true); z.body.pushable = false; z.maxHpS = def.hp; z.cd = 1;
      if (type === 'radio') z.body.setCircle(24, 24, 40);
      if (type === 'bturret') { z.body.setCircle(18, 6, 8); z.setTint(0xffb0a0); z.gunImg = this.add.image(x, y - 4, 'turretGun').setOrigin(0.2, 0.5).setTint(0xff8c8c).setDepth(11 + y / 1000); }
    }
    if (type === 'crawler') { z.mode = 'burrow'; z.hidden = true; z.setAlpha(0.25); z.t = 0; }
    if (type === 'shrieker') { z.fireT = Phaser.Math.FloatBetween(2, 3.5); z.strafe = Math.random() < 0.5 ? 1 : -1; }
    if (elite && type === 'mother') { z.elite = true; z.hp = z.maxHpE = 50 + (this.run ? this.run.room : 5) * 4; }
    else if (elite) { z.elite = true; z.hp = z.maxHpE = 30 + (this.run ? this.run.room : 5) * 3; z.spd *= 1.15; }
    z.setScale(0.2);
    this.tweens.add({ targets: z, scale: elite && type === 'brute' ? 1.4 : 1, alpha: z.hidden ? 0.25 : 1, duration: 220, ease: 'Back.out' });
    if (elite && type === 'brute') HUD.banner = { text: 'THE WARDEN', sub: 'Get behind it — its armour blocks hits from the front', t: 2.4 };
    if (type === 'mother') HUD.banner = { text: 'THE TUNNEL MOTHER', sub: 'Kill the crawlers she spawns — or lure her onto the tracks', t: 2.6 };
    return z;
  }

  updateEnemy(z, dt, time) {
    // shrieker buff: faster for a few seconds
    if (z.buffT > 0) {
      z.buffT -= dt;
      const sp0 = z.spd; z.spd = sp0 * 1.5;
      this.updateEnemyInner(z, dt, time);
      if (z.active) { z.spd = sp0; if (z.buffT <= 0 && z.mode !== 'windup') untint(z); }
      return;
    }
    this.updateEnemyInner(z, dt, time);
  }
  updateEnemyInner(z, dt, time) {
    const def = E[z.type];
    z.aggro = Math.max(0, z.aggro - dt);
    if (def.struct) { // camp buildings: never move; a stun (screech, chain...) jams a turret
      z.setVelocity(0, 0); z.kbT = 0;
      if (z.stun > 0) { z.stun -= dt; return; }
      if (z.type === 'bturret') this.updateBTurret(z, def, dt);
      return;
    }
    if (z.kbT > 0) { z.kbT -= dt; z.setVelocity(z.kbx, z.kby); z.kbx *= 0.85; z.kby *= 0.85; return; }
    if (z.stun > 0) {
      z.stun -= dt; z.setVelocity(0, 0);
      z.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time * 0.015)));
      if (z.stun <= 0) { z.setAlpha(1); z.mode = 'chase'; }
      return;
    }
    if (z.idle) { // a bandit on guard: waits until you come close or hurt one of them
      const near = !HUD.dead && (dist(z, this.hero) < 300 || this.allPets().some(p => dist(z, p) < 220) || z.aggro > 0);
      if (!near) { z.setVelocity(0, 0); return; }
      kids(this.enemies).forEach(o => { if (o.idle && dist(o, z) < 260) { o.idle = false; this.floatText(o.x, o.y - 34, '!', '#ff4d6d', 22); } });
      z.idle = false;
    }
    const tg = this.targetFor(z);
    const dx = tg.x - z.x, dy = tg.y - z.y, d = Math.hypot(dx, dy) || 1;
    if (z.type !== 'brute' && z.type !== 'mother' && Math.abs(dx) > 3) z.setFlipX(dx < 0);
    if (z.type === 'walker' || z.type === 'runner' || z.type === 'bruiser') this.updateLunger(z, def, tg, dx, dy, d, dt);
    else if (z.type === 'spitter' || z.type === 'rifleman') this.updateSpitter(z, def, tg, dx, dy, d, dt);
    else if (z.type === 'brute') this.updateBrute(z, def, tg, dx, dy, d, dt);
    else if (z.type === 'bloater') this.updateBloater(z, def, tg, dx, dy, d, dt, time);
    else if (z.type === 'crawler') this.updateCrawler(z, def, tg, dx, dy, d, dt, time);
    else if (z.type === 'shrieker') this.updateShrieker(z, def, tg, dx, dy, d, dt);
    else if (z.type === 'mother') this.updateMother(z, def, tg, dx, dy, d, dt);
  }

  // burrows (can't be hit), surfaces under its target behind a telegraph circle, bites, then is exposed
  updateCrawler(z, def, tg, dx, dy, d, dt, time) {
    z.t -= dt;
    if (z.mode === 'burrow') {
      // underground: passes under walls; surfaces on its own if it digs too long
      z.body.checkCollision.none = true;
      z.burrowT = (z.burrowT || 0) + dt;
      z.setVelocity(dx / d * z.spd, dy / d * z.spd);
      if (z.burrowT > 6) { z.mode = 'surface'; z.t = 0.6; z.setVelocity(0, 0); return; }
      if (Math.random() < 0.3) { const p = this.add.image(z.x, z.y + 10, 'dot').setTint(0x5a4a3a).setDepth(3); this.tweens.add({ targets: p, alpha: 0, y: p.y - 6, duration: 300, onComplete: () => p.destroy() }); }
      if (tg.kind !== 'path' && d - (tg.pad || 0) < 46 && !(HUD.dead && tg.kind === 'hero')) { z.mode = 'surface'; z.t = 0.6; z.setVelocity(0, 0); }
    } else if (z.mode === 'surface') {
      z.setVelocity(0, 0);
      if (z.t <= 0) {
        z.hidden = false; z.setAlpha(1); z.mode = 'exposed'; z.t = 1.6; z.burrowT = 0; z.body.checkCollision.none = false;
        this.spark(z.x, z.y, 0x5a4a3a, 10); this.cameras.main.shake(70, 0.004);
        const hitIt = (o) => dist(z, o) < def.biteR;
        if (hitIt(this.hero)) { const v = new V(this.hero.x - z.x, this.hero.y - z.y).normalize(); this.hurtHero(v.x, v.y, def.dmg); }
        this.allPets().forEach(p => { if (hitIt(p)) this.damagePet(p, def.dmg, 0, -1); });
        if (this.cage && hitIt(this.cage)) this.damageCage(1);
        if (tg.kind === 'bld' || tg.kind === 'gen') this.hitTarget(tg, def.dmg, 0, 0);
      }
    } else if (z.mode === 'exposed') {
      z.setVelocity(0, 0);
      if (z.t <= 0) { z.mode = 'burrow'; z.hidden = true; z.setAlpha(0.25); }
    } else { z.mode = 'burrow'; z.hidden = true; z.setAlpha(0.25); }
  }

  // stays back and screams to speed up nearby zombies
  updateShrieker(z, def, tg, dx, dy, d, dt) {
    z.fireT -= dt;
    if (z.mode === 'windup') {
      z.t -= dt; z.setVelocity(0, 0);
      if (z.t <= 0) {
        untint(z); z.mode = 'chase'; z.fireT = def.screamCd;
        this.ring(z.x, z.y, def.screamR, 0xb48cff); this.floatText(z.x, z.y - 34, 'SHRIEK!', '#b48cff', 14);
        this.hittables(false).forEach(o => { if (o !== z && dist(o, z) < def.screamR) { o.buffT = 4; if (o.mode !== 'windup') o.setTint(0xd2b8ff); } });
      }
      return;
    }
    let vx, vy;
    if (tg.kind === 'path') { vx = dx / d; vy = dy / d; }
    else if (d > def.keep + 40) { vx = dx / d; vy = dy / d; }
    else if (d < def.keep - 40) { vx = -dx / d; vy = -dy / d; }
    else { vx = -dy / d * z.strafe; vy = dx / d * z.strafe; }
    z.setVelocity(vx * z.spd, vy * z.spd);
    if (z.fireT <= 0 && d < 520) { z.mode = 'windup'; z.t = def.windup; z.setTint(0xb48cff); z.setVelocity(0, 0); }
  }

  // boss: slow, spawns crawlers, fires acid volleys
  updateMother(z, def, tg, dx, dy, d, dt) {
    z.spawnT -= dt; z.volT -= dt;
    if (z.mode === 'windup') {
      z.t -= dt; z.setVelocity(0, 0);
      if (z.t <= 0) {
        untint(z); z.mode = 'chase'; z.volT = def.volleyCd;
        const base = Math.atan2(dy, dx);
        [-0.3, 0, 0.3].forEach(o => this.spit(z, { x: z.x + Math.cos(base + o) * 100, y: z.y + Math.sin(base + o) * 100 }, 'spit', 240));
      }
      return;
    }
    z.setVelocity(dx / d * z.spd, dy / d * z.spd);
    if (Math.abs(dx) > 3) z.setFlipX(dx < 0);
    if (z.spawnT <= 0) {
      z.spawnT = def.spawnCd;
      const alive = kids(this.enemies).filter(o => o.active && o.type === 'crawler').length;
      if (alive < 6) for (let i = 0; i < 2; i++) this.emerge('crawler', z.x + Phaser.Math.Between(-60, 60), z.y + Phaser.Math.Between(20, 60));
    }
    if (z.volT <= 0 && d < 500) { z.mode = 'windup'; z.t = 0.55; z.setTint(0xc8ff6a); }
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
        const lt = z.tg || tg, lo = (lt.obj && lt.obj.active !== false) ? lt.obj : lt;
        const ld = Math.hypot(lo.x - z.x, lo.y - z.y) - (lt.pad || 0);
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
      if (tg.kind !== 'path' && z.fireT <= 0 && d < 430 && !(HUD.dead && tg.kind === 'hero')) { z.mode = 'windup'; z.t = def.windup; z.tg = tg; z.setTint(def.tex ? 0xff8c8c : 0xc8ff6a); z.setVelocity(0, 0); }
    } else if (z.mode === 'windup') {
      z.t -= dt; z.setVelocity(0, 0);
      if (z.t <= 0) {
        const st = z.tg || tg; untint(z); this.spit(z, (st.obj && st.obj.active !== false) ? st.obj : st, def.tex || 'spit', def.spitSpeed);
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

  splash(s) { if (!s.active) return; const k = s.texture.key; this.spark(s.x, s.y, k === 'spark' ? 0x5fd3ff : k === 'bbullet' ? 0xff8c8c : 0xb5c94f, 5); s.destroy(); }

  // bandit turret: shoots the closest of you / your pets / a lure
  updateBTurret(z, def, dt) {
    z.cd -= dt;
    const tg = HUD.dead ? null : this.closeTarget(z, def.range);
    if (!tg) return;
    const a = Math.atan2(tg.y - z.y, tg.x - z.x);
    if (z.gunImg) z.gunImg.setRotation(a);
    if (z.cd <= 0) {
      z.cd = def.rate;
      this.spit(z, tg.obj || tg, 'bbullet', def.shotSpeed);
      const fl = this.add.image(z.x + Math.cos(a) * 30, z.y - 4 + Math.sin(a) * 30, 'dot').setTint(0xff8c8c).setScale(1.8).setDepth(860);
      this.tweens.add({ targets: fl, alpha: 0, duration: 60, onComplete: () => fl.destroy() });
    }
  }

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
    this.allPets().forEach(p => { if (this.inArc(z, p, def.slamRange, def.slamArc)) this.damagePet(p, def.dmg, fx, fy); });
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
    this.gainXp('bloater');
    this.ring(x, y, def.boomR, 0xb5c94f); this.ring(x, y, def.boomR * 0.6, 0xff6a3d);
    this.spark(x, y, 0xb5c94f, 16); this.spark(x, y, 0xff6a3d, 8);
    this.decal(x, y); this.decal(x + 14, y - 8);
    this.cameras.main.shake(220, 0.014);
    this.freeze(0.07);
    if (dist(this.hero, { x, y }) < def.boomR) { const d = new V(this.hero.x - x, this.hero.y - y).normalize(); this.hurtHero(d.x, d.y, def.dmg); }
    if (this.cage && dist(this.cage, { x, y }) < def.boomR) this.damageCage(2);
    this.allPets().forEach(p => { if (dist(p, { x, y }) < def.boomR) { const d = new V(p.x - x, p.y - y).normalize(); this.damagePet(p, def.dmg, d.x, d.y); } });
    this.ratlings.forEach(r => { if (r.active && dist(r, { x, y }) < def.boomR) this.killRatling(r); });
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
    if (!z.active || z.dying || (z.hidden && !this.forceHit)) return;
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
    if (z.gunImg) z.gunImg.destroy();
    this.gainXp(z.elite ? 'boss' : z.type);
    const big = z.type === 'brute';
    this.spark(z.x, z.y, 0x9acd32, big ? 20 : 12);
    this.decal(z.x, z.y); if (big) this.decal(z.x + 12, z.y + 6);
    this.cameras.main.shake(big ? 160 : 70, big ? 0.01 : 0.004);
    this.dropScrap(z.x, z.y, z.elite ? [10, 14] : E[z.type].scrap);
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
      if (d < 22) { this.collectScrap(this.prMap && Math.random() < [0, 0.25, 0.4, 0.6][this.prk('scavenge')] ? 2 : 1); HUD.scrapPop = 0.25; p.destroy(); return false; }
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
    const list = kids(this.enemies).filter(z => z.active && !z.dying && !z.hidden);
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
    this.shoot(dir, fromTwin ? T.twinDmg + (perk('gunner') ? 1 : 0) : gunDmg());
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
    targets.forEach(z => this.hit(z, swordDmg(), new V(z.x - h.x, z.y - h.y).normalize(), T.swordKb, true, false));
    kids(this.crates).forEach(c => {
      if (!c.active || dist(c, h) > T.meleeRange + 24) return;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(c.y - h.y, c.x - h.x) - a)) < T.meleeHalfArc) this.hitCrate(c, 3);
    });
    this.freeze(0.06);
    this.cameras.main.shake(90, 0.006);
  }

  bulletHit(b, z) {
    if (!b.active || !z.active || z.dying || z.hidden) return;
    const d = new V(b.body.velocity.x, b.body.velocity.y).normalize();
    this.spark(b.x, b.y, 0xfff2a8, 3);
    const dmg = b.dmg, turret = b.fromTurret; b.destroy();
    this.damage(z, dmg, d, turret ? 90 : T.gunKb, false, false, turret);
    if (!turret) this.freeze(0.025);
  }

  tryDash(mv) {
    if (HUD.dashCd > 0) return;
    HUD.dashCd = dashCd();
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

  // ---------------------------------------------------------------- squad / pets
  // fill the 2 active slots: keep pets already out, fill gaps with the next healthy pet in order
  fillSlots(reset) {
    const recs = this.squadRecs;
    if (reset) {
      this.activePets.forEach(p => p && p.active && p.destroy());
      this.activePets = [null, null];
    }
    const out = this.activePets.map(p => (p && p.active ? p.rec : null));
    for (let s = 0; s < 2; s++) {
      if (out[s]) continue;
      const next = recs.find(r => !r.ko && !out.includes(r));
      if (next) { out[s] = next; this.activePets[s] = this.spawnPet(next, s); }
      else this.activePets[s] = null;
    }
    this.refreshAbilityHud();
  }

  spawnPet(rec, slot) {
    const def = SP[rec.sp], h = this.hero;
    const grp = def.fly ? this.petsAir : this.petsGround;
    const p = grp.create(h.x + (slot ? 40 : -40), h.y + (def.fly ? -40 : 24), rec.sp);
    p.body.setCircle(def.body[0], def.body[1], def.body[2]);
    p.setCollideWorldBounds(true);
    Object.assign(p, { rec, sp: rec.sp, def, slot, isPet: true, mode: 'follow', atkT: 0.5, iv: 0, kbT: 0, shellT: 0 });
    if (rec.cdT == null) rec.cdT = 0;
    p.setScale(0.3);
    this.tweens.add({ targets: p, scale: 1, duration: 220, ease: 'Back.out' });
    return p;
  }

  refreshAbilityHud() {
    [0, 1].forEach(s => {
      const p = this.activePets[s];
      HUD[s ? 'ab2Label' : 'ab1Label'] = p ? SP[p.sp].activeName : null;
      HUD[s ? 'cd2Max' : 'cd1Max'] = p ? this.cdFor(p.rec) : 1;
      HUD[s ? 'ab2Sp' : 'ab1Sp'] = p ? p.sp : null;
    });
    this.syncSquadHud();
  }

  syncSquadHud() {
    const act = this.activePets.map(p => (p && p.active ? p.rec : null));
    HUD.squad = this.squadRecs.map(r => ({ id: r.id, sp: r.sp, hp: r.hp, maxHp: r.maxHp, ko: r.ko, slot: act.indexOf(r), lvl: r.lvl || 1 }));
  }

  swapSlots(a, b) {
    const recs = this.squadRecs;
    if (a < 0 || b < 0 || a >= recs.length || b >= recs.length || a === b) return;
    const t = recs[a]; recs[a] = recs[b]; recs[b] = t;
    this.onSquadOrderChanged();
    this.fillSlots(true);
    this.activePets.forEach(p => p && this.ring(p.x, p.y, 30, 0x8ef0a0));
  }

  petAttackBonus() { const r = this.prk('pack'); return r >= 3 ? 2 : r ? 1 : 0; }
  computePassives() {
    this.prMap = {};
    this.squadRecs.forEach(r => { const k = SP[r.sp].passive; this.prMap[k] = Math.max(this.prMap[k] || 0, r.pr || 1); });
  }
  prk(k) { return (this.prMap && this.prMap[k]) || 0; }
  cdFor(rec) {
    const d = SP[rec.sp], red = (rec.ar || 1) >= 3 ? ({ pounce: 1.5, zap: 1.5, swarm: 2, mend: 3, shell: 2 }[d.active] || 0) : 0;
    return (d.cdMax - red) * (1 - [0, 0.15, 0.25, 0.35][this.prk('swift')]);
  }
  syncHeroHud() {
    const hr = SAVE.hero;
    HUD.hero = { lvl: hr.lvl, xp: hr.xp, need: xpNeed(hr.lvl), cap: levelCap(), picks: hr.picks || 0 };
    HUD.picksPending = (hr.picks || 0) + SAVE.pets.reduce((m, pt) => m + (pt.picks || 0), 0);
  }
  levelFx(obj, text, milestone) {
    this.ring(obj.x, obj.y, 46, 0xf2d14b); this.spark(obj.x, obj.y, 0xf2d14b, 12);
    this.floatText(obj.x, obj.y - 48, text, '#f2d14b', 18);
    if (milestone) HUD.banner = { text, sub: 'New upgrade ready — pick it in 🐾 SQUAD back in town', t: 2.6 };
  }
  // XP for a kill: you + active pets get it all, bench pets 30%. XP is kept even if the run fails.
  gainXp(key) {
    const amt = XP[key] || 2;
    HUD.leveledThisKill = false;
    const ups = addXp(SAVE.hero, amt);
    if (ups.length) { this.levelFx(this.hero, `LEVEL ${SAVE.hero.lvl}!`, ups.some(isMilestone)); HUD.maxHp = maxHearts(); HUD.hp = Math.min(HUD.maxHp, HUD.hp + 1); }
    const act = this.activePets.map(p => (p && p.active ? p.rec : null));
    (this.guards || []).forEach(g => { if (g.active) act.push(g.rec); });
    this.squadRecs.concat((this.guards || []).map(g => g.rec)).forEach(r => {
      const pt = petById(r.id); if (!pt) return;
      const u = addXp(pt, amt * (act.includes(r) ? 1 : 0.3));
      if (!u.length) return;
      r.lvl = pt.lvl;
      const nm = petMaxHp(pt); if (nm > r.maxHp) { if (!r.ko) r.hp += nm - r.maxHp; r.maxHp = nm; }
      const spr = this.allPets().find(p => p.rec === r);
      this.levelFx(spr || this.hero, `${SP[r.sp].name.split(' ')[1].toUpperCase()} LV ${pt.lvl}!`, u.some(isMilestone));
      HUD.leveledThisKill = true;
    });
    this.syncHeroHud(); this.syncSquadHud();
    if (ups.length || HUD.leveledThisKill) writeSave();
  }

  damagePet(p, dmg, dx, dy) {
    if (!p || !p.active || p.iv > 0 || p.shellT > 0 || p.mode === 'pounce' || this.leaving) return;
    p.rec.hp = Math.max(0, p.rec.hp - dmg);
    p.iv = T.petIframes;
    p.kbx = dx * 380; p.kby = dy * 380; p.kbT = 0.1;
    flash(p, 0xff4444); this.time.delayedCall(90, () => p.active && untint(p));
    this.floatText(p.x, p.y - 22, '-' + dmg, '#ff8c9e', 15);
    if (p.rec.hp <= 0) this.knockOut(p);
    this.syncSquadHud();
  }

  knockOut(p) {
    const slot = p.slot, short = (sp) => SP[sp].name.split(' ')[1].toUpperCase();
    p.rec.ko = true;
    this.spark(p.x, p.y, 0xff8c9e, 14);
    this.floatText(p.x, p.y - 30, `${short(p.sp)} KO!`, '#ff8c9e', 16);
    p.destroy();
    if (p.isGuard) return;
    this.activePets[slot] = null;
    this.fillSlots(false);
    const np = this.activePets[slot];
    if (np) { this.ring(np.x, np.y, 34, 0x8ef0a0); this.floatText(np.x, np.y - 30, `${short(np.sp)} IN!`, '#8ef0a0', 14); }
  }

  healPet(rec, n) { if (!rec.ko) rec.hp = Math.min(rec.maxHp, rec.hp + n); }

  updatePets(dt, time) {
    const h = this.hero;
    this.squadRecs.forEach(r => { if (r.cdT > 0) r.cdT = Math.max(0, r.cdT - dt); });
    [0, 1].forEach(s => { const p = this.activePets[s]; HUD[s ? 'cd2' : 'cd1'] = p ? p.rec.cdT : 0; });
    // Static passive: you zap a nearby zombie every few seconds
    if (this.prk('static') && !HUD.dead) {
      this.staticT -= dt;
      if (this.staticT <= 0) {
        const z = this.nearestEnemy(h.x, h.y, T.staticRange, false);
        if (z) { this.staticT = [5, 5, 3.5, 2.5][this.prk('static')]; this.bolt(h.x, h.y - 10, z.x, z.y); this.damage(z, this.prk('static') >= 3 ? 2 : 1, new V(z.x - h.x, z.y - h.y).normalize(), 60, false, true); }
        else this.staticT = 0.4;
      }
    }
    this.activePets.forEach((p, slot) => {
      if (!p || !p.active) return;
      const def = p.def;
      p.iv = Math.max(0, p.iv - dt); p.atkT -= dt; p.shellT = Math.max(0, p.shellT - dt);
      p.setAlpha(p.dig ? 0.2 : p.iv > 0 ? (Math.floor(time / 70) % 2 ? 0.4 : 1) : 1);
      if (p.shellT > 0) p.setTint(0xffd166); else if (p.iv <= 0) untint(p);
      if (p.mode === 'pounce') { p.t -= dt; p.setVelocity(p.vx, p.vy); if (p.t <= 0) this.pounceLand(p); return; }
      if (p.kbT > 0) { p.kbT -= dt; p.setVelocity(p.kbx, p.kby); return; }
      if (dist(p, h) > 520) p.setPosition(h.x - 30, h.y + 20);
      const low = p.rec.hp <= 1 && p.rec.maxHp > 1;
      const side = slot === 0 ? 1 : -1;
      if (def.fly) {
        const tx = h.x + side * 36 + this.facing.y * 10, ty = h.y - 46 + Math.sin(time * 0.006 + slot * 2) * 5;
        p.setVelocity((tx - p.x) * 6, (ty - p.y) * 6);
        p.setFlipX(this.facing.x < 0);
        if (def.attack === 'zap' && p.atkT <= 0 && !HUD.dead) {
          const z = this.nearestEnemy(p.x, p.y, low ? 120 : def.range, false);
          if (z) { p.atkT = def.cd; this.bolt(p.x, p.y, z.x, z.y, def.boltColor); this.damage(z, def.dmg + petLvlDmg(p.rec.lvl) + this.petAttackBonus(), new V(z.x - p.x, z.y - p.y).normalize(), 60, false, true); }
          else p.atkT = 0.3;
        }
        return;
      }
      const target = HUD.dead ? null : this.nearestEnemy(p.x, p.y, low ? 70 : 230, false);
      if (target && dist(h, target) < 320) {
        const d = new V(target.x - p.x, target.y - p.y); const dd = d.length(); d.normalize();
        if (dd > def.range * 0.7) p.setVelocity(d.x * def.speed, d.y * def.speed); else p.setVelocity(0, 0);
        p.setFlipX(d.x < 0);
        if (dd < def.range && p.atkT <= 0) {
          p.atkT = def.cd * (this.prk('pack') >= 2 ? 0.85 : 1);
          this.damage(target, def.dmg + petLvlDmg(p.rec.lvl) + this.petAttackBonus(), d, 140, false, false);
          this.tweens.add({ targets: p, scale: 1.2, duration: 70, yoyo: true });
        }
      } else {
        // follow behind you; a pet on its last heart sticks right at your heel
        const back = low ? 26 : 46;
        const tx = h.x - this.facing.x * back + this.facing.y * 22 * side, ty = h.y - this.facing.y * back - this.facing.x * 22 * side;
        const d = new V(tx - p.x, ty - p.y); const dd = d.length();
        if (dd > 12) { d.normalize(); const sp = Math.min(def.speed + 60, dd * 5); p.setVelocity(d.x * sp, d.y * sp); p.setFlipX(d.x < 0); }
        else p.setVelocity(0, 0);
      }
    });
  }

  // ---- items
  itemSrc() { return null; }
  onItemsChanged() {}
  useItem(k) {
    const src = this.itemSrc(), h = this.hero;
    if (!src || !(src[k] > 0)) { this.floatText(h.x, h.y - 44, `NO ${ITEMS[k].toUpperCase()}S`, '#9aa4ad', 13); return; }
    if (k === 'medkit') {
      if (HUD.hp >= HUD.maxHp) { this.floatText(h.x, h.y - 44, 'ALREADY FULL', '#9aa4ad', 13); return; }
      HUD.hp = Math.min(HUD.maxHp, HUD.hp + T.medkitHeal);
      this.ring(h.x, h.y, 50, 0x8ef0a0); this.floatText(h.x, h.y - 44, `+${T.medkitHeal} ♥`, '#8ef0a0', 18);
    } else if (k === 'treat') {
      const ko = this.squadRecs.find(r => r.ko);
      if (ko) { ko.ko = false; ko.hp = Math.min(ko.maxHp, T.treatHeal); this.fillSlots(false); this.floatText(h.x, h.y - 44, `${SP[ko.sp].name.split(' ')[1].toUpperCase()} IS BACK!`, '#8ef0a0', 16); }
      else {
        const hurt = this.squadRecs.filter(r => r.hp < r.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (!hurt) { this.floatText(h.x, h.y - 44, 'NO PET NEEDS IT', '#9aa4ad', 13); return; }
        this.healPet(hurt, T.treatHeal); this.floatText(h.x, h.y - 44, `${SP[hurt.sp].name.split(' ')[1].toUpperCase()} +${T.treatHeal} ♥`, '#8ef0a0', 16);
      }
      this.syncSquadHud();
    } else if (k === 'lure') {
      const d = Ctl.aim || this.facing;
      const lx = Phaser.Math.Clamp(h.x + d.x * 170, TILE * 1.2, this.worldW - TILE * 1.2), ly = Phaser.Math.Clamp(h.y + d.y * 170, TILE * 1.2, this.worldH - TILE * 1.2);
      const l = this.add.image(h.x, h.y, 'lure').setDepth(9);
      l.t = T.lureTime; l.pulse = 0;
      this.tweens.add({ targets: l, x: lx, y: ly, angle: 360, duration: 300, ease: 'Quad.out' });
      this.lures.push(l);
      this.floatText(h.x, h.y - 44, 'LURE!', '#f2d14b', 15);
    }
    src[k]--;
    this.onItemsChanged();
  }
  updateLures(dt) {
    this.lures = (this.lures || []).filter(l => {
      if (!l.active) return false;
      l.t -= dt; l.pulse -= dt;
      if (l.pulse <= 0) { l.pulse = 0.5; this.ring(l.x, l.y, 60, 0xf2d14b); }
      if (l.t <= 0) { this.spark(l.x, l.y, 0xf2d14b, 8); l.destroy(); return false; }
      return true;
    });
  }

  updateRatlings(dt, time) {
    this.ratlings = this.ratlings.filter(r => {
      if (!r.active) return false;
      r.t -= dt; r.atkT -= dt;
      if (r.t <= 0) { this.spark(r.x, r.y, 0x9aa4ad, 4); r.destroy(); return false; }
      const z = this.nearestEnemy(r.x, r.y, 400, false);
      if (z) {
        const d = dist(r, z);
        if (d > 22) { r.x += (z.x - r.x) / d * 280 * dt; r.y += (z.y - r.y) / d * 280 * dt; }
        else if (r.atkT <= 0) { r.atkT = 0.7; this.damage(z, 1, new V(z.x - r.x, z.y - r.y).normalize(), 40, false, true); }
        r.setFlipX(z.x < r.x);
      }
      r.setDepth(10 + r.y / 1000);
      return true;
    });
  }

  killRatling(r) { if (!r || !r.active) return; this.spark(r.x, r.y, 0x9aa4ad, 5); r.destroy(); }

  // ---------------------------------------------------------------- abilities (your 2 active pets)
  ability(i, dir) { this.useAbility(this.activePets[i - 1], dir, this.hero); }

  // h = where the ability is aimed from: you for your squad, the creature itself for guards
  useAbility(p, dir, h) {
    if (!p || !p.active || p.rec.cdT > 0) return;
    const def = SP[p.sp];
    const ar = p.rec.ar || 1;
    const used = () => { p.rec.cdT = this.cdFor(p.rec); };
    if (def.active === 'pounce' || def.active === 'dig') {
      if (p.mode === 'pounce') return;
      let lx, ly;
      if (dir) { lx = h.x + dir.x * T.pounceDist; ly = h.y + dir.y * T.pounceDist; }
      else {
        const z = this.nearestEnemy(h.x, h.y, T.pounceAuto, false);
        if (z) { lx = z.x; ly = z.y; } else { lx = h.x + this.facing.x * T.pounceDist; ly = h.y + this.facing.y * T.pounceDist; }
      }
      lx = Phaser.Math.Clamp(lx, TILE * 1.2, this.worldW - TILE * 1.2); ly = Phaser.Math.Clamp(ly, TILE * 1.2, this.worldH - TILE * 1.2);
      const dur = 0.28;
      const dig = def.active === 'dig', dd = dig ? 0.5 : dur;
      p.mode = 'pounce'; p.t = dd; p.vx = (lx - p.x) / dd; p.vy = (ly - p.y) / dd; p.ar = ar; p.dig = dig;
      p.body.checkCollision.none = true;
      p.setFlipX(p.vx < 0);
      if (dig) { p.setAlpha(0.2); this.spark(p.x, p.y, 0x5a4a3a, 8); }
      else this.tweens.add({ targets: p, scale: 1.8, duration: dur * 500, yoyo: true, ease: 'Sine.out' });
      used();
    } else if (def.active === 'zap') {
      const first = this.nearestEnemy(p.x, p.y, 320, false);
      if (!first) { this.floatText(p.x, p.y - 24, 'NO TARGET', '#5fd3ff', 12); return; }
      used();
      const hitList = [first]; let cur = first;
      while (hitList.length < T.chainCount + (ar >= 2 ? 2 : 0)) {
        let nxt = null, bd = T.chainJump;
        this.hittables(false).forEach(z => { if (!hitList.includes(z)) { const d = dist(z, cur); if (d < bd) { bd = d; nxt = z; } } });
        if (!nxt) break; hitList.push(nxt); cur = nxt;
      }
      let prev = p;
      hitList.forEach(z => {
        this.bolt(prev.x, prev.y, z.x, z.y); prev = z;
        this.damage(z, T.chainDmg + (ar >= 3 ? 1 : 0) + this.petAttackBonus(), new V(z.x - p.x, z.y - p.y).normalize(), 120, true, true);
        this.stunEnemy(z, T.chainStun);
      });
      this.freeze(0.05); this.cameras.main.shake(120, 0.006);
    } else if (def.active === 'swarm') {
      let lx, ly;
      if (dir) { lx = h.x + dir.x * 180; ly = h.y + dir.y * 180; }
      else { const z = this.nearestEnemy(h.x, h.y, 420, false); if (z) { lx = z.x; ly = z.y; } else { lx = h.x + this.facing.x * 140; ly = h.y + this.facing.y * 140; } }
      for (let k = 0; k < (ar >= 2 ? 5 : 3); k++) {
        const r = this.add.image(p.x, p.y, 'rat').setScale(0.6);
        Object.assign(r, { t: ar >= 3 ? 8 : 5, atkT: 0.3, isRatling: true });
        this.tweens.add({ targets: r, x: lx + Phaser.Math.Between(-30, 30), y: ly + Phaser.Math.Between(-20, 20), duration: 240, ease: 'Quad.out' });
        this.ratlings.push(r);
      }
      this.spark(p.x, p.y, 0x9aa4ad, 8);
      used();
    } else if (def.active === 'mend') {
      const heal = ar >= 2 ? 2 : 1;
      if (!p.isGuard || dist(this.hero, p) < 240) HUD.hp = Math.min(HUD.maxHp, HUD.hp + heal);
      this.squadRecs.forEach(r => this.healPet(r, heal));
      (this.guards || []).forEach(g => g.active && this.healPet(g.rec, heal));
      this.ring(h.x, h.y, 60, 0x8ef0a0); this.spark(h.x, h.y, 0x8ef0a0, 10);
      this.allPets().forEach(q => this.ring(q.x, q.y, 34, 0x8ef0a0));
      this.floatText(h.x, h.y - 44, `+${heal} ♥ EVERYONE`, '#8ef0a0', 18);
      this.syncSquadHud();
      used();
    } else if (def.active === 'screech') {
      const R = ar >= 2 ? 220 : 160, stun = ar >= 3 ? 2.5 : 1.5;
      this.ring(h.x, h.y, R, 0xb48cff); this.ring(p.x, p.y, 50, 0xd2b8ff);
      kids(this.enemies).forEach(z => {
        if (!z.active || z.dying || dist(z, h) > R) return;
        if (z.hidden) { z.hidden = false; z.setAlpha(1); z.mode = 'exposed'; z.t = 2.5; z.burrowT = 0; z.body.checkCollision.none = false; this.spark(z.x, z.y, 0x5a4a3a, 8); }
        this.stunEnemy(z, stun);
      });
      this.floatText(h.x, h.y - 44, 'SCREECH!', '#b48cff', 16);
      this.cameras.main.shake(100, 0.005);
      used();
    } else if (def.active === 'shell') {
      p.shellT = ar >= 2 ? 4.5 : 3;
      if (ar >= 3) this.healPet(p.rec, 1);
      this.ring(p.x, p.y, 260, 0xffd166);
      this.floatText(p.x, p.y - 30, 'OVER HERE!', '#ffd166', 15);
      used();
    }
  }

  pounceLand(p) {
    p.mode = 'follow'; p.body.checkCollision.none = false; p.setVelocity(0, 0);
    const dig = p.dig; p.dig = false; if (dig) p.setAlpha(1);
    const pr = T.pounceRadius + ((p.ar || 1) >= 2 ? (dig ? 20 : 25) : 0) - (dig ? 5 : 0);
    const col = dig ? 0x9c6b3e : 0xe08a3c;
    this.ring(p.x, p.y, pr, col);
    this.spark(p.x, p.y, col, dig ? 14 : 8);
    if (dig) this.cameras.main.shake(140, 0.007);
    let hitAny = false;
    this.hittables(false).forEach(z => {
      if (dist(p, z) > pr) return;
      hitAny = true;
      const d = new V(z.x - p.x, z.y - p.y); if (d.lengthSq() < 1) d.set(1, 0); d.normalize();
      this.hit(z, T.pounceDmg + ((p.ar || 1) >= 2 ? 1 : 0) + this.petAttackBonus(), d, dig ? 340 : 260, true, true);
      if (!z.isWild) this.stunEnemy(z, T.pounceStun + ((p.ar || 1) >= 3 ? 0.6 : 0) - (dig ? 0.3 : 0));
    });
    this.cameras.main.shake(120, hitAny ? 0.008 : 0.003);
    if (hitAny) this.freeze(0.06);
  }

  bolt(x1, y1, x2, y2, color = 0x5fd3ff) {
    const g = this.add.graphics().setDepth(880);
    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < 5; i++) { const t = i / 5; pts.push({ x: x1 + (x2 - x1) * t + Phaser.Math.Between(-9, 9), y: y1 + (y2 - y1) * t + Phaser.Math.Between(-9, 9) }); }
    pts.push({ x: x2, y: y2 });
    g.lineStyle(5, color, 0.5); g.strokePoints(pts);
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
    if (c.weak > 0) { c.weak -= dt; if (c.weak <= 0) { c.hp = Math.ceil(c.maxHp * 0.7); this.floatText(c.x, c.y - 26, 'RECOVERED', '#5fd3ff', 13); } }
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
    const sp = c.weak > 0 ? 45 : c.wSpeed;
    const d = new V(c.tx - c.x, c.ty - c.y); const dd = d.length() || 1;
    c.setVelocity(d.x / dd * sp, d.y / dd * sp + Math.sin(time * 0.01) * 20);
    if (Math.abs(d.x) > 2) c.setFlipX(d.x < 0);
    if (c.weak <= 0 && !HUD.dead && c.species === 'crow') {
      c.zapT -= dt;
      if (c.zapT <= 0 && dist(c, h) < 330) { c.mode = 'windup'; c.t = 0.6; c.setTint(0x5fd3ff); }
    }
  }

  damageWild(c, dmg, dir, kb) {
    if (!c.active || c.caged || c.fleeing) return;
    c.kbx = dir.x * kb; c.kby = dir.y * kb; c.kbT = 0.1;
    flash(c, 0xffffff); this.time.delayedCall(70, () => c.active && untint(c));
    if (c.weak > 0) { // hit again while weakened: it's gone
      this.spark(c.x, c.y, 0xff8c9e, 14); this.floatText(c.x, c.y - 30, 'DEFEATED', '#ff8c9e', 15);
      this.dropScrap(c.x, c.y, [2, 4]); c.destroy(); this.wild = null;
      return;
    }
    const th = Math.ceil(c.maxHp * 0.35);
    c.hp = Math.max(th, c.hp - dmg);
    this.floatText(c.x, c.y - 24, String(dmg), '#ffffff', 16);
    if (c.hp <= th) { c.weak = T.weakTime; c.mode = 'wander'; this.floatText(c.x, c.y - 40, 'WEAK — CAGE IT! (one more hit kills it)', '#f2d14b', 15); }
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
      const c = this.wild, spc = c ? c.species : 'crow';
      this.run.captured.push(spc);
      if (c) c.destroy(); this.wild = null;
      this.spark(cg.x, cg.y, 0xf2d14b, 18);
      this.ring(cg.x, cg.y, 70, 0xf2d14b);
      this.floatText(cg.x, cg.y - 34, 'CAUGHT!', '#f2d14b', 22);
      const done = cg; this.cage = null;
      this.tweens.add({ targets: done, y: done.y - 40, alpha: 0, duration: 500, onComplete: () => done.destroy() });
      HUD.banner = { text: `CAUGHT A ${SP[spc].name.toUpperCase()}!`, sub: 'Extract to bring it home', t: 2.4 };
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
      if (z.type === 'crawler' && z.mode === 'surface') { g.fillStyle(0xff3b3b, 0.2 + 0.4 * (1 - z.t / 0.6)); g.fillCircle(z.x, z.y, E.crawler.biteR); return; }
      if (z.mode !== 'windup') return;
      if (z.type === 'shrieker') { g.lineStyle(3, 0xb48cff, 0.6); g.strokeCircle(z.x, z.y, E.shrieker.screamR * (1 - z.t / E.shrieker.windup)); return; }
      if (z.type === 'mother') { g.fillStyle(0xc8ff6a, 0.25); g.fillCircle(z.x, z.y, 50); return; }
      if (z.type === 'brute') {
        const p = 1 - z.t / E.brute.windup;
        g.fillStyle(0xff3b3b, 0.15 + 0.35 * p);
        g.beginPath(); g.slice(z.x, z.y, E.brute.slamRange, z.face - E.brute.slamArc, z.face + E.brute.slamArc, false); g.fillPath();
      } else if (z.type === 'spitter' || z.type === 'rifleman') {
        const tg = z.tg || this.targetFor(z);
        g.lineStyle(2, z.type === 'rifleman' ? 0xff4d6d : 0xb5c94f, 0.5); g.lineBetween(z.x, z.y, tg.x, tg.y);
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
      const ap = this.activePets[Ctl.aimAbility.i - 1];
      if (ap && ap.active && SP[ap.sp].aim) {
        const swarm = SP[ap.sp].active === 'swarm', R = swarm ? 180 : T.pounceDist;
        const d = Ctl.aimAbility.dir, lx = h.x + d.x * R, ly = h.y + d.y * R;
        g.lineStyle(3, 0xe08a3c, 0.7); g.strokeCircle(lx, ly, swarm ? 50 : T.pounceRadius);
        g.lineStyle(2, 0xe08a3c, 0.3); g.lineBetween(ap.x, ap.y, lx, ly);
      }
    }
    this.allPets().forEach(p => {
      const n = p.rec.maxHp, y = p.y - (p.def.fly ? 24 : 28);
      for (let i = 0; i < n; i++) { g.fillStyle(i < p.rec.hp ? 0xff8c9e : 0x3a2a2e, 1); g.fillRect(p.x - n * 4 + i * 8, y, 6, 4); }
    });
    kids(this.enemies).forEach(z => {
      if (!z.active || !z.elite) return;
      g.fillStyle(0x000000, 0.7); g.fillRect(z.x - 40, z.y - 56, 80, 7);
      g.fillStyle(0xff4d6d, 1); g.fillRect(z.x - 40, z.y - 56, 80 * Math.max(0, z.hp) / z.maxHpE, 7);
    });
    if (Ctl.mode === 'brawl' && !HUD.dead && !this.inputFrozen()) {
      const am = ammoMax(), w = 14, gap = 4, total = am * w + (am - 1) * gap, x0 = h.x - total / 2, y = h.y - 34;
      for (let i = 0; i < am; i++) {
        const x = x0 + i * (w + gap);
        g.fillStyle(0x000000, 0.6); g.fillRect(x - 1, y - 1, w + 2, 8);
        const f = i < HUD.ammo ? 1 : (i === HUD.ammo ? HUD.reload / reloadTime() : 0);
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