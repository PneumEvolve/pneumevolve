import Phaser from 'phaser';

/**
 * Creates the Dungeon Town game inside `parent` (a DOM element).
 * Returns the Phaser.Game instance — call game.destroy(true) to clean up.
 * All game state lives inside this function, so every mount starts fresh.
 */
export function createDungeonTownGame(parent, { onExit } = {}) {
  // =====================================================================
  //  DUNGEON TOWN — STEP 1: "THE ROOM"  (PneumEvolve module)
  //  Goal: find out if moving, shooting, slashing and dashing feel good.
  //  All the numbers you'll want to tweak live in T below.
  // =====================================================================
  const T = {
    heroSpeed: 240, heroHp: 5, iframes: 0.8,
    dashSpeed: 780, dashTime: 0.15, dashCd: 0.9,
    // gun
    ammoMax: 3, reloadTime: 0.75, gunCd: 0.16, bulletSpeed: 950, bulletRange: 540, gunDmg: 1, gunKb: 220,
    twinFireRate: 0.22,           // twin-stick mode: no ammo, steady fire
    // sword (auto-used when an enemy is close in the attack direction)
    meleeRange: 80, meleeHalfArc: 0.95, swordDmg: 3, swordCd: 0.4, swordKb: 520,
    autoRange: 560,               // tap-attack auto-aim range
    // zombie
    zHp: 4, zSpeed: 78, zWindupRange: 72, zWindup: 0.45, zLungeSpeed: 430, zLunge: 0.18, zRecover: 0.55,
    // Scrap Hound (creature)
    houndBiteCd: 1.0, houndBiteRange: 50,
    pounceCd: 6, pounceDist: 240, pounceAuto: 420, pounceRadius: 75, pounceDmg: 2, pounceStun: 1.3,
    howlCd: 8, howlRadius: 200, howlKb: 650, howlStun: 0.7,
  };
  const WORLD = { w: 1500, h: 950 };
  const V = Phaser.Math.Vector2;

  // Shared state between the game scene and the UI/controls scene
  const Ctl = { move: {x:0, y:0}, mode: 'brawl', queue: [], aim: null, aimAbility: null, twin: null, blocked: false };
  const HUD = { hp: T.heroHp, ammo: T.ammoMax, reload: 0, dashCd: 0, cd1: 0, cd2: 0, wave: 0, kills: 0, dead: false, banner: null };

  // Works on Phaser 3.x and 4.x (setTintFill isn't in every version)
  const flash = (obj, color) => { if (typeof obj.setTintFill === 'function') obj.setTintFill(color); else obj.setTint(color); };

  function makeTextures(scene) {
    if (scene.textures.exists('hero')) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0b0f14); g.fillCircle(20, 20, 20);
    g.fillStyle(0x3fd0c9); g.fillCircle(20, 20, 16);
    g.fillStyle(0xbff5f1); g.fillCircle(26, 20, 5);
    g.generateTexture('hero', 40, 40); g.clear();

    g.fillStyle(0x0b0f14); g.fillCircle(20, 20, 20);
    g.fillStyle(0x7a9a3a); g.fillCircle(20, 20, 16);
    g.fillStyle(0x2a3510); g.fillCircle(27, 14, 3); g.fillCircle(27, 26, 3);
    g.fillStyle(0x5d7a28); g.fillCircle(13, 22, 5);
    g.generateTexture('zombie', 40, 40); g.clear();

    g.fillStyle(0x0b0f14); g.fillCircle(14, 14, 14);
    g.fillStyle(0xe08a3c); g.fillCircle(14, 14, 11);
    g.fillStyle(0x2a1a0c); g.fillCircle(20, 11, 2); g.fillCircle(20, 17, 2);
    g.generateTexture('hound', 28, 28); g.clear();

    g.fillStyle(0xfff2a8); g.fillCircle(5, 5, 5); g.generateTexture('bullet', 10, 10); g.clear();
    g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); g.generateTexture('dot', 8, 8); g.clear();
    g.fillStyle(0x222831); g.fillRect(0, 0, 24, 9); g.fillStyle(0x9aa4ad); g.fillRect(2, 2, 20, 5);
    g.generateTexture('gun', 24, 9); g.clear();

    g.fillStyle(0x3a2e22); g.fillRect(0, 0, 64, 64); g.fillStyle(0x6b5238); g.fillRect(4, 4, 56, 56);
    g.lineStyle(4, 0x3a2e22); g.lineBetween(4, 4, 60, 60); g.lineBetween(60, 4, 4, 60);
    g.generateTexture('crate', 64, 64); g.clear();

    g.fillStyle(0x1d2228); g.fillRoundedRect(0, 0, 140, 70, 14);
    g.fillStyle(0x7a3b2e); g.fillRoundedRect(5, 5, 130, 60, 12);
    g.fillStyle(0x2b3540); g.fillRoundedRect(38, 12, 58, 46, 8);
    g.fillStyle(0x5a2a20); g.fillRect(10, 10, 16, 50); g.fillStyle(0x3d1d16); g.fillRect(108, 14, 20, 42);
    g.generateTexture('car', 140, 70); g.clear();
    g.destroy();
  }

  // =====================================================================
  class GameScene extends Phaser.Scene {
    constructor() { super('game'); }

    create() {
      makeTextures(this);
      Object.assign(HUD, { hp: T.heroHp, ammo: T.ammoMax, reload: 0, dashCd: 0, cd1: 0, cd2: 0, wave: 0, kills: 0, dead: false, banner: { text: 'THE ROOM', t: 1.6 } });
      Ctl.queue.length = 0; Ctl.aim = null; Ctl.aimAbility = null; Ctl.twin = null;

      this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);
      this.drawFloor();

      this.walls = this.physics.add.staticGroup();
      [['car', 420, 300], ['car', 1080, 640], ['car', 760, 740], ['crate', 750, 210], ['crate', 814, 210],
       ['crate', 300, 690], ['crate', 1210, 250], ['crate', 1210, 314]]
        .forEach(([k, x, y]) => this.walls.create(x, y, k).refreshBody());

      this.hero = this.physics.add.image(WORLD.w / 2, WORLD.h / 2, 'hero').setDepth(10);
      this.hero.body.setCircle(16, 4, 4);
      this.hero.setCollideWorldBounds(true);
      this.gun = this.add.image(0, 0, 'gun').setOrigin(0, 0.5).setDepth(11);
      this.facing = new V(1, 0);
      this.dashT = 0; this.dashDir = new V(1, 0); this.inv = 0; this.gunCdT = 0; this.swordCdT = 0;
      this.kbT = 0; this.kb = new V(); this.gunKick = 0; this.faceLock = 0; this.ghostT = 0;

      this.hound = this.physics.add.image(this.hero.x - 40, this.hero.y + 30, 'hound').setDepth(9);
      this.hound.body.setCircle(11, 3, 3);
      this.hound.setCollideWorldBounds(true);
      this.hound.mode = 'follow'; this.hound.biteT = 0;

      this.zombies = this.physics.add.group();
      this.bullets = this.physics.add.group();
      this.physics.add.collider(this.hero, this.walls);
      this.physics.add.collider(this.hound, this.walls);
      this.physics.add.collider(this.zombies, this.walls);
      this.physics.add.collider(this.zombies, this.zombies);
      this.physics.add.collider(this.bullets, this.walls, (b) => { this.spark(b.x, b.y, 0xfff2a8, 4); b.destroy(); });
      this.physics.add.overlap(this.bullets, this.zombies, (b, z) => this.bulletHit(b, z));

      this.fx = this.add.graphics().setDepth(12);

      const cam = this.cameras.main;
      cam.setBounds(0, 0, WORLD.w, WORLD.h);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setBackgroundColor('#0e1013');
      this.fitZoom();
      this.scale.on('resize', this.fitZoom, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,E');
      this.hitstop = 0; this.blockedPause = false;
      this.spawnQueue = 0; this.spawnT = 0; this.waveDelay = 1.6;

      if (!this.scene.isActive('ui')) this.scene.launch('ui');
    }

    fitZoom() {
      const z = Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / 520, 0.55, 2.4);
      this.cameras.main.setZoom(z);
    }

    drawFloor() {
      const g = this.add.graphics().setDepth(0);
      const R = Phaser.Math;
      g.fillStyle(0x1b1e22); g.fillRect(0, 0, WORLD.w, WORLD.h);
      for (let i = 0; i < 70; i++) { g.fillStyle(0x15171a, R.FloatBetween(0.4, 0.9)); g.fillCircle(R.Between(0, WORLD.w), R.Between(0, WORLD.h), R.Between(20, 80)); }
      g.lineStyle(1, 0x23272d, 1);
      for (let x = 0; x <= WORLD.w; x += 80) g.lineBetween(x, 0, x, WORLD.h);
      for (let y = 0; y <= WORLD.h; y += 80) g.lineBetween(0, y, WORLD.w, y);
      g.fillStyle(0x8a7a2a, 0.3);
      for (let x = 40; x < WORLD.w; x += 120) g.fillRect(x, WORLD.h / 2 + 60, 60, 8);
      g.lineStyle(2, 0x0f1113, 0.9);
      for (let i = 0; i < 28; i++) {
        let x = R.Between(0, WORLD.w), y = R.Between(0, WORLD.h);
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += R.Between(-40, 40); y += R.Between(-40, 40); g.lineTo(x, y); }
        g.strokePath();
      }
      g.lineStyle(14, 0x2e333a, 1); g.strokeRect(7, 7, WORLD.w - 14, WORLD.h - 14);
    }

    // ---------------------------------------------------------------- loop
    update(time, dms) {
      const dt = Math.min(dms / 1000, 0.05);

      if (Ctl.blocked) { if (!this.blockedPause) { this.physics.world.pause(); this.blockedPause = true; } return; }
      if (this.blockedPause) { this.blockedPause = false; this.physics.world.resume(); }

      if (this.hitstop > 0) {
        this.hitstop -= dt;
        if (this.hitstop <= 0) this.physics.world.resume();
        return;
      }

      const hero = this.hero;

      // --- movement input (touch stick, or keyboard)
      const mv = new V(Ctl.move.x, Ctl.move.y);
      const k = this.keys;
      const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      if (kx || ky) mv.set(kx, ky).normalize();
      if (mv.length() > 1) mv.normalize();
      if (Phaser.Input.Keyboard.JustDown(k.SPACE)) Ctl.queue.push({ type: 'dash' });
      if (Phaser.Input.Keyboard.JustDown(k.Q)) Ctl.queue.push({ type: 'ab', i: 1, dir: null });
      if (Phaser.Input.Keyboard.JustDown(k.E)) Ctl.queue.push({ type: 'ab', i: 2, dir: null });

      // --- queued actions
      while (Ctl.queue.length) {
        const ev = Ctl.queue.shift();
        if (ev.type === 'restart') { this.scene.restart(); return; }
        if (HUD.dead) continue;
        if (ev.type === 'attack') this.attack(ev.dir, false);
        else if (ev.type === 'dash') this.tryDash(mv);
        else if (ev.type === 'ab') this.ability(ev.i, ev.dir);
      }
      if (Ctl.mode === 'twin' && Ctl.twin && !HUD.dead) this.attack(Ctl.twin.dir, true);

      // --- timers
      this.inv = Math.max(0, this.inv - dt);
      this.gunCdT = Math.max(0, this.gunCdT - dt);
      this.swordCdT = Math.max(0, this.swordCdT - dt);
      this.faceLock = Math.max(0, this.faceLock - dt);
      HUD.dashCd = Math.max(0, HUD.dashCd - dt);
      HUD.cd1 = Math.max(0, HUD.cd1 - dt);
      HUD.cd2 = Math.max(0, HUD.cd2 - dt);
      if (HUD.ammo < T.ammoMax) {
        HUD.reload += dt;
        if (HUD.reload >= T.reloadTime) { HUD.ammo++; HUD.reload = 0; }
      } else HUD.reload = 0;

      // --- hero motion
      if (HUD.dead) hero.setVelocity(0, 0);
      else if (this.kbT > 0) { this.kbT -= dt; hero.setVelocity(this.kb.x, this.kb.y); this.kb.scale(0.85); }
      else if (this.dashT > 0) {
        this.dashT -= dt;
        hero.setVelocity(this.dashDir.x * T.dashSpeed, this.dashDir.y * T.dashSpeed);
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.025;
          const gh = this.add.image(hero.x, hero.y, 'hero').setAlpha(0.45).setTint(0x3fd0c9).setDepth(9);
          this.tweens.add({ targets: gh, alpha: 0, scale: 0.7, duration: 220, onComplete: () => gh.destroy() });
        }
      } else hero.setVelocity(mv.x * T.heroSpeed, mv.y * T.heroSpeed);

      // --- facing + gun
      if (Ctl.aim) this.facing.copy(Ctl.aim);
      else if (this.faceLock <= 0 && mv.length() > 0.2) this.facing.copy(mv).normalize();
      this.gunKick *= 0.8;
      const gd = 14 - this.gunKick;
      this.gun.setPosition(hero.x + this.facing.x * gd, hero.y + this.facing.y * gd).setRotation(this.facing.angle());
      hero.setAlpha(this.inv > 0 && this.dashT <= 0 ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1);
      this.gun.setAlpha(hero.alpha);

      this.updateHound(dt);
      this.updateZombies(dt, time);

      this.bullets.getChildren().slice().forEach(b => {
        if (b.active && Phaser.Math.Distance.Between(b.x, b.y, b.sx, b.sy) > T.bulletRange) b.destroy();
      });

      // --- waves
      if (!HUD.dead) {
        if (this.spawnQueue > 0) {
          this.spawnT -= dt;
          if (this.spawnT <= 0) { this.spawnZombie(); this.spawnQueue--; this.spawnT = Math.max(0.25, 0.7 - HUD.wave * 0.03); }
        } else if (this.zombies.countActive(true) === 0) {
          this.waveDelay -= dt;
          if (this.waveDelay <= 0) {
            HUD.wave++;
            this.spawnQueue = 2 + HUD.wave * 2;
            this.spawnT = 0.3; this.waveDelay = 2.0;
            HUD.banner = { text: 'WAVE ' + HUD.wave, t: 1.6 };
          }
        }
      }

      this.drawFx(time);
    }

    // ---------------------------------------------------------------- combat
    nearestZombie(x, y, range) {
      let best = null, bd = range;
      this.zombies.getChildren().slice().forEach(z => {
        if (!z.active) return;
        const d = Phaser.Math.Distance.Between(x, y, z.x, z.y);
        if (d < bd) { bd = d; best = z; }
      });
      return best;
    }

    meleeTargets(dir) {
      const out = [], h = this.hero, a = dir.angle();
      this.zombies.getChildren().slice().forEach(z => {
        if (!z.active) return;
        const d = Phaser.Math.Distance.Between(h.x, h.y, z.x, z.y);
        if (d > T.meleeRange + 16) return;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(z.y - h.y, z.x - h.x) - a));
        if (diff < T.meleeHalfArc || d < 30) out.push(z);
      });
      return out;
    }

    attack(dir, fromTwin) {
      const h = this.hero;
      if (!dir) {
        const z = this.nearestZombie(h.x, h.y, T.autoRange);
        dir = z ? new V(z.x - h.x, z.y - h.y).normalize() : this.facing.clone();
      } else dir = new V(dir.x, dir.y).normalize();

      const mt = this.meleeTargets(dir);
      if (mt.length) {
        if (this.swordCdT > 0) return false;
        this.swordCdT = T.swordCd;
        this.facing.copy(dir); this.faceLock = 0.3;
        this.swing(dir, mt);
        return true;
      }
      if (this.gunCdT > 0) return false;
      if (!fromTwin) {
        if (HUD.ammo < 1) { this.dryFire(); return false; }
        HUD.ammo--;
      }
      this.gunCdT = fromTwin ? T.twinFireRate : T.gunCd;
      this.facing.copy(dir); this.faceLock = 0.3;
      this.shoot(dir);
      return true;
    }

    shoot(dir) {
      const h = this.hero;
      const b = this.bullets.create(h.x + dir.x * 26, h.y + dir.y * 26, 'bullet');
      b.body.setCircle(5);
      b.setVelocity(dir.x * T.bulletSpeed, dir.y * T.bulletSpeed);
      b.sx = b.x; b.sy = b.y; b.setDepth(8);
      this.gunKick = 7;
      const fl = this.add.image(h.x + dir.x * 34, h.y + dir.y * 34, 'dot').setTint(0xffd166).setScale(2.6).setDepth(13);
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
      const g = this.add.graphics().setDepth(11);
      g.fillStyle(0xffffff, 0.85);
      g.beginPath(); g.slice(h.x, h.y, T.meleeRange + 12, a - T.meleeHalfArc, a + T.meleeHalfArc, false); g.fillPath();
      g.fillStyle(0x1b1e22, 1);
      g.beginPath(); g.slice(h.x, h.y, T.meleeRange - 18, a - T.meleeHalfArc - 0.1, a + T.meleeHalfArc + 0.1, false); g.fillPath();
      this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
      targets.forEach(z => {
        const d = new V(z.x - h.x, z.y - h.y).normalize();
        this.damage(z, T.swordDmg, d, T.swordKb, true);
      });
      this.freeze(0.065);
      this.cameras.main.shake(90, 0.006);
    }

    bulletHit(b, z) {
      if (!b.active || !z.active) return;
      const d = new V(b.body.velocity.x, b.body.velocity.y).normalize();
      this.spark(b.x, b.y, 0xfff2a8, 3);
      b.destroy();
      this.damage(z, T.gunDmg, d, T.gunKb, false);
      this.freeze(0.025);
    }

    damage(z, dmg, dir, kb, interrupt) {
      if (!z.active) return;
      z.hp -= dmg;
      z.kbx = dir.x * kb; z.kby = dir.y * kb; z.kbT = 0.12;
      if (interrupt && z.mode === 'windup') this.cancelWindup(z);
      flash(z, 0xffffff);
      this.time.delayedCall(70, () => {
        if (!z.active) return;
        if (z.mode === 'windup') z.setTint(0xff5555); else z.clearTint();
      });
      this.floatText(z.x, z.y - 22, String(dmg), dmg >= 3 ? '#ffd166' : '#ffffff', dmg >= 3 ? 22 : 17);
      if (z.hp <= 0) this.killZombie(z);
    }

    cancelWindup(z) {
      this.tweens.killTweensOf(z);
      z.setScale(1); z.clearTint();
      z.mode = 'recover'; z.t = T.zRecover;
    }

    killZombie(z) {
      HUD.kills++;
      this.spark(z.x, z.y, 0x9acd32, 12);
      this.add.circle(z.x, z.y, Phaser.Math.Between(12, 20), 0x2c3a14, 0.55).setDepth(1);
      this.cameras.main.shake(70, 0.004);
      z.destroy();
    }

    tryDash(mv) {
      if (HUD.dashCd > 0) return;
      HUD.dashCd = T.dashCd;
      this.dashDir.copy(mv.length() > 0.1 ? mv : this.facing).normalize();
      this.dashT = T.dashTime;
      this.inv = Math.max(this.inv, T.dashTime + 0.06);
      this.kbT = 0;
    }

    hurtHero(dx, dy) {
      if (this.inv > 0 || this.dashT > 0 || HUD.dead) return;
      HUD.hp--;
      this.inv = T.iframes;
      this.kb.set(dx * 520, dy * 520); this.kbT = 0.12;
      flash(this.hero, 0xff4444);
      this.time.delayedCall(110, () => this.hero.active && this.hero.clearTint());
      this.cameras.main.shake(200, 0.012);
      this.freeze(0.09);
      if (HUD.hp <= 0) this.die();
    }

    die() {
      HUD.dead = true;
      Ctl.twin = null;
      this.spark(this.hero.x, this.hero.y, 0x3fd0c9, 20);
      this.hero.setTint(0x555555);
      this.gun.setVisible(false);
    }

    freeze(s) {
      if (this.hitstop <= 0) this.physics.world.pause();
      this.hitstop = Math.max(this.hitstop, s);
    }

    // ---------------------------------------------------------------- Scrap Hound
    ability(i, dir) {
      const h = this.hero;
      if (i === 1) {
        const hd = this.hound;
        if (HUD.cd1 > 0 || hd.mode === 'pounce') return;
        HUD.cd1 = T.pounceCd;
        let lx, ly;
        if (dir) { lx = h.x + dir.x * T.pounceDist; ly = h.y + dir.y * T.pounceDist; }
        else {
          const z = this.nearestZombie(h.x, h.y, T.pounceAuto);
          if (z) { lx = z.x; ly = z.y; } else { lx = h.x + this.facing.x * T.pounceDist; ly = h.y + this.facing.y * T.pounceDist; }
        }
        lx = Phaser.Math.Clamp(lx, 30, WORLD.w - 30); ly = Phaser.Math.Clamp(ly, 30, WORLD.h - 30);
        const dur = 0.28;
        hd.mode = 'pounce'; hd.t = dur; hd.vx = (lx - hd.x) / dur; hd.vy = (ly - hd.y) / dur;
        hd.body.checkCollision.none = true;
        hd.setRotation(Math.atan2(hd.vy, hd.vx));
        this.tweens.add({ targets: hd, scale: 1.8, duration: dur * 500, yoyo: true, ease: 'Sine.out' });
      }
      if (i === 2) {
        if (HUD.cd2 > 0) return;
        HUD.cd2 = T.howlCd;
        this.ring(h.x, h.y, T.howlRadius, 0xe08a3c);
        this.ring(this.hound.x, this.hound.y, 60, 0xffd166);
        this.zombies.getChildren().slice().forEach(z => {
          if (!z.active) return;
          const d = Phaser.Math.Distance.Between(h.x, h.y, z.x, z.y);
          if (d > T.howlRadius) return;
          const dir2 = new V(z.x - h.x, z.y - h.y).normalize();
          this.damage(z, 1, dir2, T.howlKb, true);
          if (z.active) { z.stun = T.howlStun; z.kbT = 0.2; }
        });
        this.cameras.main.shake(160, 0.008);
        this.freeze(0.05);
      }
    }

    pounceLand() {
      const hd = this.hound;
      hd.mode = 'follow'; hd.body.checkCollision.none = false; hd.setVelocity(0, 0);
      this.ring(hd.x, hd.y, T.pounceRadius, 0xe08a3c);
      this.spark(hd.x, hd.y, 0xe08a3c, 8);
      let hit = false;
      this.zombies.getChildren().slice().forEach(z => {
        if (!z.active) return;
        if (Phaser.Math.Distance.Between(hd.x, hd.y, z.x, z.y) > T.pounceRadius) return;
        hit = true;
        const dir = new V(z.x - hd.x, z.y - hd.y); if (dir.lengthSq() < 1) dir.set(1, 0); dir.normalize();
        this.damage(z, T.pounceDmg, dir, 260, true);
        if (z.active) z.stun = T.pounceStun;
      });
      this.cameras.main.shake(120, hit ? 0.008 : 0.003);
      if (hit) this.freeze(0.06);
    }

    updateHound(dt) {
      const hd = this.hound, h = this.hero;
      hd.biteT -= dt;
      if (hd.mode === 'pounce') {
        hd.t -= dt;
        hd.setVelocity(hd.vx, hd.vy);
        if (hd.t <= 0) this.pounceLand();
        return;
      }
      if (Phaser.Math.Distance.Between(hd.x, hd.y, h.x, h.y) > 520) hd.setPosition(h.x - 30, h.y + 30);
      const target = HUD.dead ? null : this.nearestZombie(hd.x, hd.y, 230);
      if (target && Phaser.Math.Distance.Between(h.x, h.y, target.x, target.y) < 320) {
        const d = new V(target.x - hd.x, target.y - hd.y); const dist = d.length(); d.normalize();
        if (dist > T.houndBiteRange * 0.7) hd.setVelocity(d.x * 270, d.y * 270); else hd.setVelocity(0, 0);
        hd.setRotation(d.angle());
        if (dist < T.houndBiteRange && hd.biteT <= 0) {
          hd.biteT = T.houndBiteCd;
          this.damage(target, 1, d, 140, false);
          this.tweens.add({ targets: hd, scale: 1.25, duration: 70, yoyo: true });
        }
      } else {
        const tx = h.x - this.facing.x * 46 + this.facing.y * 18, ty = h.y - this.facing.y * 46 - this.facing.x * 18;
        const d = new V(tx - hd.x, ty - hd.y); const dist = d.length();
        if (dist > 12) { d.normalize(); const sp = Math.min(330, dist * 5); hd.setVelocity(d.x * sp, d.y * sp); hd.setRotation(d.angle()); }
        else hd.setVelocity(0, 0);
      }
    }

    // ---------------------------------------------------------------- zombies
    spawnZombie() {
      let x, y, tries = 0;
      do {
        const side = Phaser.Math.Between(0, 3);
        if (side === 0) { x = Phaser.Math.Between(40, WORLD.w - 40); y = 40; }
        else if (side === 1) { x = WORLD.w - 40; y = Phaser.Math.Between(40, WORLD.h - 40); }
        else if (side === 2) { x = Phaser.Math.Between(40, WORLD.w - 40); y = WORLD.h - 40; }
        else { x = 40; y = Phaser.Math.Between(40, WORLD.h - 40); }
        tries++;
      } while (Phaser.Math.Distance.Between(x, y, this.hero.x, this.hero.y) < 380 && tries < 12);
      const z = this.zombies.create(x, y, 'zombie');
      z.body.setCircle(16, 4, 4);
      z.setDepth(7);
      z.hp = T.zHp + Math.floor(HUD.wave / 4);
      z.mode = 'chase'; z.t = 0; z.kbT = 0; z.stun = 0;
      z.spd = T.zSpeed * Phaser.Math.FloatBetween(0.85, 1.2) * (1 + HUD.wave * 0.03);
      z.setScale(0);
      this.tweens.add({ targets: z, scale: 1, duration: 260, ease: 'Back.out' });
    }

    updateZombies(dt, time) {
      const h = this.hero;
      this.zombies.getChildren().slice().forEach(z => {
        if (!z.active) return;
        const dx = h.x - z.x, dy = h.y - z.y, d = Math.hypot(dx, dy) || 1;
        if (z.kbT > 0) { z.kbT -= dt; z.setVelocity(z.kbx, z.kby); z.kbx *= 0.85; z.kby *= 0.85; return; }
        if (z.stun > 0) {
          z.stun -= dt; z.setVelocity(0, 0);
          z.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time * 0.015)));
          if (z.stun <= 0) { z.setAlpha(1); z.mode = 'chase'; }
          return;
        }
        switch (z.mode) {
          case 'chase':
            z.setVelocity(dx / d * z.spd, dy / d * z.spd);
            z.setRotation(Math.atan2(dy, dx));
            if (d < T.zWindupRange && !HUD.dead) {
              z.mode = 'windup'; z.t = T.zWindup; z.setVelocity(0, 0);
              z.ldx = dx / d; z.ldy = dy / d;
              z.setTint(0xff5555);
              this.tweens.add({ targets: z, scale: 1.25, duration: T.zWindup * 1000, ease: 'Quad.in' });
            }
            break;
          case 'windup':
            z.t -= dt; z.setVelocity(0, 0);
            if (z.t > T.zWindup * 0.45) { z.ldx = dx / d; z.ldy = dy / d; z.setRotation(Math.atan2(dy, dx)); } // stops tracking near the end — dodge window
            if (z.t <= 0) { z.mode = 'lunge'; z.t = T.zLunge; z.clearTint(); this.tweens.killTweensOf(z); z.setScale(1); z.hitDone = false; }
            break;
          case 'lunge':
            z.t -= dt;
            z.setVelocity(z.ldx * T.zLungeSpeed, z.ldy * T.zLungeSpeed);
            if (!z.hitDone && d < 34) { z.hitDone = true; this.hurtHero(z.ldx, z.ldy); }
            if (z.t <= 0) { z.mode = 'recover'; z.t = T.zRecover; }
            break;
          case 'recover':
            z.t -= dt;
            z.setVelocity(dx / d * z.spd * 0.3, dy / d * z.spd * 0.3);
            if (z.t <= 0) z.mode = 'chase';
            break;
        }
      });
    }

    // ---------------------------------------------------------------- visuals
    drawFx(time) {
      const g = this.fx, h = this.hero;
      g.clear();
      if (!HUD.dead) { g.lineStyle(2, 0xffffff, 0.07); g.strokeCircle(h.x, h.y, T.meleeRange); }

      // zombie attack telegraphs
      this.zombies.getChildren().slice().forEach(z => {
        if (!z.active || z.mode !== 'windup') return;
        const p = 1 - z.t / T.zWindup, L = 95, W = 17;
        const nx = -z.ldy, ny = z.ldx;
        g.fillStyle(0xff3b3b, 0.15 + 0.35 * p);
        g.fillPoints([
          { x: z.x + nx * W, y: z.y + ny * W },
          { x: z.x + z.ldx * L + nx * W, y: z.y + z.ldy * L + ny * W },
          { x: z.x + z.ldx * L - nx * W, y: z.y + z.ldy * L - ny * W },
          { x: z.x - nx * W, y: z.y - ny * W },
        ], true);
      });

      // aim indicator (turns into a sword arc when the sword would be used)
      if (Ctl.aim && !HUD.dead) {
        const d = Ctl.aim, a = d.angle();
        if (this.meleeTargets(d).length) {
          g.fillStyle(0xffffff, 0.22);
          g.beginPath(); g.slice(h.x, h.y, T.meleeRange + 12, a - T.meleeHalfArc, a + T.meleeHalfArc, false); g.fillPath();
        } else {
          g.lineStyle(9, 0xffffff, 0.16);
          g.lineBetween(h.x + d.x * 26, h.y + d.y * 26, h.x + d.x * T.bulletRange, h.y + d.y * T.bulletRange);
        }
      }
      if (Ctl.aimAbility && !HUD.dead) {
        const d = Ctl.aimAbility.dir;
        const lx = h.x + d.x * T.pounceDist, ly = h.y + d.y * T.pounceDist;
        g.lineStyle(3, 0xe08a3c, 0.7); g.strokeCircle(lx, ly, T.pounceRadius);
        g.lineStyle(2, 0xe08a3c, 0.3); g.lineBetween(this.hound.x, this.hound.y, lx, ly);
      }

      // ammo pips over the hero (tap/drag mode only)
      if (Ctl.mode === 'brawl' && !HUD.dead) {
        const w = 15, gap = 4, total = T.ammoMax * w + (T.ammoMax - 1) * gap;
        const x0 = h.x - total / 2, y = h.y - 36;
        for (let i = 0; i < T.ammoMax; i++) {
          const x = x0 + i * (w + gap);
          g.fillStyle(0x000000, 0.6); g.fillRect(x - 1, y - 1, w + 2, 8);
          let f = i < HUD.ammo ? 1 : (i === HUD.ammo ? HUD.reload / T.reloadTime : 0);
          g.fillStyle(i < HUD.ammo ? 0xff8c42 : 0x7a4a2a, 1); g.fillRect(x, y, w * f, 6);
        }
      }
    }

    floatText(x, y, str, color, size) {
      const t = this.add.text(x, y, str, { fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 550, ease: 'Quad.out', onComplete: () => t.destroy() });
    }

    spark(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const p = this.add.image(x, y, 'dot').setTint(color).setDepth(14).setScale(Phaser.Math.FloatBetween(0.5, 1.2));
        const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(18, 55);
        this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.1, duration: Phaser.Math.Between(220, 420), ease: 'Quad.out', onComplete: () => p.destroy() });
      }
    }

    ring(x, y, r, color) {
      const g = this.add.graphics().setDepth(6);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 320, ease: 'Quad.out',
        onUpdate: tw => { const v = tw.getValue(); g.clear(); g.lineStyle(8 * (1 - v) + 1, color, 1 - v); g.strokeCircle(x, y, r * v); },
        onComplete: () => g.destroy(),
      });
    }
  }

  // =====================================================================
  //  UI + TOUCH CONTROLS (drawn on top, not affected by camera zoom)
  // =====================================================================
  class UIScene extends Phaser.Scene {
    constructor() { super('ui'); }

    create() {
      this.input.addPointer(4);
      this.input.mouse && this.input.mouse.disableContextMenu();
      this.g = this.add.graphics();
      this.ptr = {}; this.st = { atk: {}, a1: {}, a2: {}, dash: {} };
      this.moveBase = null; this.moveKnob = null;
      this.touchUI = !this.sys.game.device.os.desktop;
      this.mouseMode = !this.touchUI; this.mouseHeld = false; this.deadT = 0;

      const S = (size, extra = {}) => Object.assign({ fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: size + 'px', fontStyle: 'bold', color: '#ffffff', stroke: '#000', strokeThickness: 3 }, extra);
      this.S = S;
      this.waveText = this.add.text(0, 0, '', S(16)).setOrigin(0.5, 0);
      this.modeText = this.add.text(0, 0, '', S(13)).setOrigin(0.5);
      this.hintText = this.add.text(0, 0, '', S(11, { color: '#c9d1d9' })).setOrigin(1, 0).setAlpha(0.75);
      this.lbl = {
        atk: this.add.text(0, 0, 'ATTACK', S(12)).setOrigin(0.5),
        dash: this.add.text(0, 0, 'DASH', S(11)).setOrigin(0.5),
        a1: this.add.text(0, 0, 'POUNCE', S(10)).setOrigin(0.5),
        a2: this.add.text(0, 0, 'HOWL', S(10)).setOrigin(0.5),
      };
      this.banner = this.add.text(0, 0, '', S(40, { strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
      this.over = this.add.text(0, 0, '', S(26, { align: 'center', strokeThickness: 5 })).setOrigin(0.5).setVisible(false);
      this.rotateText = this.add.text(0, 0, 'Turn your phone sideways ↻', S(22, { align: 'center' })).setOrigin(0.5).setVisible(false);
      this.deskHelp = this.add.text(0, 0, 'WASD move · mouse aim · click attack · Space / right-click dash · Q pounce · E howl', S(12, { color: '#c9d1d9' })).setOrigin(0.5, 1).setAlpha(0.8);

      this.layout();
      this.scale.on('resize', this.layout, this);
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
        mode: { x: w - u * 0.27, y: u * 0.075, w: u * 0.46, h: u * 0.085 },
        exit: { x: u * 0.07, y: u * 0.075, r: u * 0.045 },
        fs:   { x: u * 0.18, y: u * 0.075, r: u * 0.045 },
      };
      const fs = n => Math.max(10, Math.round(u * n)) + 'px';
      this.waveText.setPosition(w / 2, u * 0.035).setFontSize(fs(0.042));
      this.modeText.setPosition(this.B.mode.x, this.B.mode.y).setFontSize(fs(0.032));
      this.hintText.setPosition(this.B.mode.x + this.B.mode.w / 2, this.B.mode.y + this.B.mode.h * 0.75).setFontSize(fs(0.026));
      for (const k of ['atk', 'dash', 'a1', 'a2']) this.lbl[k].setPosition(this.B[k].x, this.B[k].y + this.B[k].r + u * 0.025).setFontSize(fs(k === 'atk' ? 0.03 : 0.026));
      this.banner.setPosition(w / 2, h * 0.3).setFontSize(fs(0.1));
      this.over.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.rotateText.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
      this.deskHelp.setPosition(w / 2, h - 10).setFontSize(fs(0.024));
    }

    inRect(x, y, r) { return Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2; }
    near(x, y, b, mult) { return Math.hypot(x - b.x, y - b.y) < b.r * mult; }

    mouseDir() {
      const gs = this.scene.get('game');
      if (!gs || !gs.hero || !gs.hero.active) return null;
      const p = this.input.activePointer;
      const wp = gs.cameras.main.getWorldPoint(p.x, p.y);
      const v = new V(wp.x - gs.hero.x, wp.y - gs.hero.y);
      return v.lengthSq() > 4 ? v.normalize() : null;
    }

    down(p) {
      if (p.wasTouch) { this.touchUI = true; this.mouseMode = false; } else if (!this.touchUI) this.mouseMode = true;
      if (HUD.dead) { if (this.deadT > 0.8) Ctl.queue.push({ type: 'restart' }); return; }
      if (Ctl.blocked) return;
      const B = this.B;
      if (this.inRect(p.x, p.y, B.mode) || this.near(p.x, p.y, B.fs, 1.4) || this.near(p.x, p.y, B.exit, 1.4)) return; // handled on release

      if (!p.wasTouch && this.mouseMode) {
        if (p.rightButtonDown()) { Ctl.queue.push({ type: 'dash' }); return; }
        this.mouseHeld = true;
        if (Ctl.mode === 'brawl') Ctl.queue.push({ type: 'attack', dir: this.mouseDir() });
        else Ctl.twin = { dir: this.mouseDir() };
        return;
      }

      for (const k of ['atk', 'dash', 'a1', 'a2']) {
        if (!this.ptr[k] && this.near(p.x, p.y, B[k], 1.35)) {
          this.ptr[k] = p.id;
          this.st[k] = { drag: false, dir: null, sx: p.x, sy: p.y };
          if (k === 'dash') Ctl.queue.push({ type: 'dash' });
          if (k === 'atk' && Ctl.mode === 'twin') Ctl.twin = { dir: null };
          return;
        }
      }
      if (p.x < this.scale.width * 0.5 && !this.ptr.move) {
        this.ptr.move = p.id;
        this.moveBase = { x: p.x, y: p.y }; this.moveKnob = { x: p.x, y: p.y };
      }
    }

    move(p) {
      if (p.id === this.ptr.move && this.moveBase) {
        const R = this.u * 0.12, b = this.moveBase;
        let dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        if (d > R) { b.x = p.x - dx / d * R; b.y = p.y - dy / d * R; dx = p.x - b.x; dy = p.y - b.y; d = R; } // base follows thumb
        this.moveKnob = { x: p.x, y: p.y };
        const mag = d < R * 0.12 ? 0 : d / R;
        Ctl.move.x = d ? dx / d * mag : 0; Ctl.move.y = d ? dy / d * mag : 0;
      }
      for (const k of ['atk', 'a1', 'a2']) {
        if (p.id !== this.ptr[k]) continue;
        const s = this.st[k];
        const dx = p.x - s.sx, dy = p.y - s.sy, d = Math.hypot(dx, dy), dead = this.u * 0.04;
        if (d > dead) { s.drag = true; s.dir = new V(dx / d, dy / d); }
        else if (s.drag) s.dir = null; // dragged back to centre = cancel
        if (k === 'atk') {
          Ctl.aim = s.dir ? s.dir.clone() : null;
          if (Ctl.mode === 'twin') Ctl.twin = { dir: s.dir ? s.dir.clone() : null };
        } else if (k === 'a1') Ctl.aimAbility = s.dir ? { i: 1, dir: s.dir.clone() } : null;
      }
    }

    up(p) {
      const B = this.B;
      // taps on the mode toggle / fullscreen button
      if (this.inRect(p.downX, p.downY, B.mode) && this.inRect(p.x, p.y, B.mode)) {
        Ctl.mode = Ctl.mode === 'brawl' ? 'twin' : 'brawl'; Ctl.twin = null; return;
      }
      if (this.near(p.downX, p.downY, B.exit, 1.4) && this.near(p.x, p.y, B.exit, 1.4)) {
        if (onExit) onExit();
        return;
      }
      if (this.near(p.downX, p.downY, B.fs, 1.4) && this.near(p.x, p.y, B.fs, 1.4)) {
        try { this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(); } catch (e) {}
        return;
      }
      if (!p.wasTouch && this.mouseHeld) { this.mouseHeld = false; Ctl.twin = null; }

      if (p.id === this.ptr.move) { this.ptr.move = null; this.moveBase = null; Ctl.move.x = 0; Ctl.move.y = 0; }
      if (p.id === this.ptr.atk) {
        const s = this.st.atk;
        if (Ctl.mode === 'brawl') {
          if (!s.drag) Ctl.queue.push({ type: 'attack', dir: null });       // tap = auto-aim
          else if (s.dir) Ctl.queue.push({ type: 'attack', dir: s.dir });   // drag + release = aimed
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
      const b = this.B[key], g = this.g, held = this.ptr[key] != null, s = this.st[key];
      g.fillStyle(color, held ? 0.32 : 0.16); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(3, color, held ? 0.95 : 0.55); g.strokeCircle(b.x, b.y, b.r);
      if (held && s.drag && s.dir) {
        g.fillStyle(color, 0.8); g.fillCircle(b.x + s.dir.x * b.r * 0.55, b.y + s.dir.y * b.r * 0.55, b.r * 0.38);
      } else if (held && s.drag && !s.dir) {
        const q = b.r * 0.35; g.lineStyle(4, 0xff4444, 0.9);
        g.lineBetween(b.x - q, b.y - q, b.x + q, b.y + q); g.lineBetween(b.x + q, b.y - q, b.x - q, b.y + q);
      } else {
        g.fillStyle(color, held ? 0.7 : 0.4); g.fillCircle(b.x, b.y, b.r * 0.3);
      }
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

      const portrait = this.touchUI && h > w;
      Ctl.blocked = portrait;
      this.rotateText.setVisible(portrait);
      if (portrait) { g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, w, h); }

      // mouse aiming on desktop
      if (this.mouseMode && !this.touchUI && !HUD.dead) {
        const dir = this.mouseDir();
        Ctl.aim = dir;
        if (this.mouseHeld && Ctl.mode === 'twin') Ctl.twin = { dir };
      }

      // hearts
      for (let i = 0; i < T.heroHp; i++) {
        const x = u * 0.28 + i * u * 0.06, y = u * 0.075, r = u * 0.022;
        if (i < HUD.hp) { g.fillStyle(0xff4d6d, 1); g.fillCircle(x, y, r); }
        g.lineStyle(2, 0x000000, 0.8); g.strokeCircle(x, y, r);
      }
      this.waveText.setText(`WAVE ${HUD.wave}   ·   ${HUD.kills} KILLS`);

      // exit button (X)
      const ex = B.exit, q = ex.r * 0.5;
      g.lineStyle(3, 0xffffff, 0.6);
      g.lineBetween(ex.x - q, ex.y - q, ex.x + q, ex.y + q); g.lineBetween(ex.x + q, ex.y - q, ex.x - q, ex.y + q);
      // fullscreen button
      const f = B.fs;
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeRect(f.x - f.r * 0.6, f.y - f.r * 0.6, f.r * 1.2, f.r * 1.2);

      // control mode toggle
      const m = B.mode;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      g.lineStyle(2, 0xffffff, 0.35); g.strokeRoundedRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, m.h / 2);
      this.modeText.setText(Ctl.mode === 'brawl' ? 'MODE: TAP / DRAG  ⇄' : 'MODE: TWIN-STICK  ⇄');
      this.hintText.setText(this.touchUI
        ? (Ctl.mode === 'brawl' ? 'tap: auto-aim · drag: aim · drag back: cancel' : 'hold: auto-fire · drag: aim')
        : (Ctl.mode === 'brawl' ? 'click = aimed shot (3 ammo)' : 'hold click = auto-fire, no ammo'));

      // touch controls
      const showTouch = this.touchUI && !portrait;
      for (const k in this.lbl) this.lbl[k].setVisible(showTouch);
      this.deskHelp.setVisible(!this.touchUI);
      if (showTouch) {
        const R = u * 0.12;
        if (this.moveBase) {
          g.fillStyle(0xffffff, 0.08); g.fillCircle(this.moveBase.x, this.moveBase.y, R);
          g.lineStyle(2, 0xffffff, 0.3); g.strokeCircle(this.moveBase.x, this.moveBase.y, R);
          const kx = this.moveBase.x + Ctl.move.x * R, ky = this.moveBase.y + Ctl.move.y * R;
          g.fillStyle(0xffffff, 0.4); g.fillCircle(kx, ky, R * 0.45);
        } else {
          g.lineStyle(2, 0xffffff, 0.1); g.strokeCircle(u * 0.26, h - u * 0.26, R);
          g.fillStyle(0xffffff, 0.06); g.fillCircle(u * 0.26, h - u * 0.26, R * 0.45);
        }
        this.drawBtn('atk', 0xff8c42, 0);
        this.drawBtn('dash', 0x3fd0c9, HUD.dashCd / T.dashCd);
        this.drawBtn('a1', 0xe08a3c, HUD.cd1 / T.pounceCd);
        this.drawBtn('a2', 0xffd166, HUD.cd2 / T.howlCd);
        if (Ctl.mode === 'brawl') { // ammo arc around attack button
          const b = B.atk;
          for (let i = 0; i < T.ammoMax; i++) {
            const a0 = -Math.PI * 0.95 + i * 0.36, a1 = a0 + 0.3;
            g.lineStyle(5, i < HUD.ammo ? 0xff8c42 : 0x3a2a1e, 0.95);
            g.beginPath(); g.arc(b.x, b.y, b.r + 9, a0, a1, false); g.strokePath();
          }
        }
      }

      // wave banner
      if (HUD.banner) {
        HUD.banner.t -= dt;
        this.banner.setText(HUD.banner.text).setAlpha(Math.max(0, Math.min(1, HUD.banner.t * 2)));
        if (HUD.banner.t <= 0) HUD.banner = null;
      } else this.banner.setAlpha(0);

      // death screen
      if (HUD.dead) {
        this.deadT += dt;
        g.fillStyle(0x000000, Math.min(0.6, this.deadT)); g.fillRect(0, 0, w, h);
        this.over.setVisible(true).setText(`YOU DIED\nWave ${HUD.wave} · ${HUD.kills} kills${this.deadT > 0.8 ? '\n\ntap to try again' : ''}`);
      } else { this.deadT = 0; this.over.setVisible(false); }
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0e1013',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 5 },
    scene: [GameScene, UIScene],
  });
}