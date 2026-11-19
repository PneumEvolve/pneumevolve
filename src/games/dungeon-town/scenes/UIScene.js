import Phaser from 'phaser';
import { FONT, V } from '../util';
import { BLD, CIV_ITEMS, ITEMS, MIL_ITEMS, SP, SP_COLOR, T } from '../tuning';
import { Ctl, HUD, ammoMax, countB, dashCd, typeCap } from '../state';

// ===================================================================
//  UI + TOUCH CONTROLS (on top, not zoomed)
// ===================================================================
export class UIScene extends Phaser.Scene {
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
    for (let i = 0; i < 9; i++) {
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
    this.panelNew = this.add.text(0, 0, 'NEW GAME', S(11)).setOrigin(0.5).setColor('#ff8c8c');
    // the city map
    this.mapTitle = this.add.text(0, 0, 'THE CITY', S(22, { color: '#f2d14b' })).setOrigin(0.5).setVisible(false);
    this.mapHint = this.add.text(0, 0, 'Tap a district', S(11, { color: '#9aa4ad' })).setOrigin(0.5).setVisible(false);
    this.mapClose = this.add.text(0, 0, 'CLOSE', S(13)).setOrigin(0.5).setVisible(false);
    this.mapNames = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', S(13)).setOrigin(0.5).setVisible(false));
    this.mapLines = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', S(10, { color: '#c9d1d9' })).setOrigin(0.5).setVisible(false));
    this.mapIcons = [0, 1, 2, 3].map(() => this.add.image(0, 0, 'hatch').setVisible(false));
    this.mapTown = this.add.image(0, 0, 'hall').setVisible(false);
    this.mapReact = this.add.text(0, 0, '', S(11, { color: '#f2d14b', align: 'center' })).setOrigin(0.5).setVisible(false);

    this.banner = this.add.text(0, 0, '', S(40, { strokeThickness: 6, align: 'center' })).setOrigin(0.5).setAlpha(0);
    this.bannerSub = this.add.text(0, 0, '', S(16, { color: '#c9d1d9', align: 'center', stroke: '#000', strokeThickness: 4 })).setOrigin(0.5, 0).setAlpha(0);
    this.over = this.add.text(0, 0, '', S(26, { align: 'center', strokeThickness: 5 })).setOrigin(0.5).setVisible(false);
    this.rotateText = this.add.text(0, 0, 'Turn your phone sideways ↻', S(22, { align: 'center' })).setOrigin(0.5).setVisible(false);
    this.deskHelp = this.add.text(0, 0, '', S(12, { color: '#c9d1d9' })).setOrigin(0.5, 1).setAlpha(0.8);
    // squad portraits (left side) + squad panel
    this.tBtn.squad = this.add.text(0, 0, '🐾 SQUAD', S(13)).setOrigin(0.5);
    this.portraits = [];
    for (let i = 0; i < 4; i++) this.portraits.push({ icon: this.add.image(0, 0, 'hound').setVisible(false), num: this.add.text(0, 0, '', S(10, { color: '#ffd166' })).setOrigin(0.5).setVisible(false) });
    this.sqCards = [];
    for (let i = 0; i < 12; i++) this.sqCards.push({
      icon: this.add.image(0, 0, 'hound').setVisible(false),
      name: this.add.text(0, 0, '', S(11)).setOrigin(0, 0).setVisible(false),
      info: this.add.text(0, 0, '', S(9, { color: '#c9d1d9', lineSpacing: 1 })).setOrigin(0, 0).setVisible(false),
      badge: this.add.text(0, 0, '', S(12, { color: '#f2d14b' })).setOrigin(0, 0).setVisible(false),
    });
    this.sqTitle = this.add.text(0, 0, 'YOUR CREATURES', S(18, { color: '#f2d14b' })).setOrigin(0.5).setVisible(false);
    this.sqSub = this.add.text(0, 0, '', S(11, { color: '#c9d1d9', align: 'center' })).setOrigin(0.5).setVisible(false);
    this.sqClose = this.add.text(0, 0, 'DONE', S(14)).setOrigin(0.5).setVisible(false);
    this.pgPrev = this.add.text(0, 0, '◀', S(18)).setOrigin(0.5).setVisible(false);
    this.pgNext = this.add.text(0, 0, '▶', S(18)).setOrigin(0.5).setVisible(false);
    this.pgText = this.add.text(0, 0, '', S(11, { color: '#c9d1d9' })).setOrigin(0.5).setVisible(false);
    this.swapSel = -1; this.sqSel = -1; this.bTouch = {}; this.bDragged = false; this.bPinched = false;
    this.tBtn.stash = this.add.text(0, 0, 'STASH', S(13)).setOrigin(0.5);
    this.itemTxt = ['medkit', 'treat', 'lure'].map(() => this.add.text(0, 0, '', S(12)).setOrigin(0.5).setVisible(false));
    this.itemBtnTxt = this.add.text(0, 0, '', S(12)).setOrigin(0.5).setVisible(false);
    this.zTxt = [this.add.text(0, 0, '+', S(20)).setOrigin(0.5).setVisible(false), this.add.text(0, 0, '−', S(20)).setOrigin(0.5).setVisible(false)];
    this.sqStrip = [0, 1, 2, 3].map(() => ({ icon: this.add.image(0, 0, 'hound').setVisible(false), num: this.add.text(0, 0, '', S(11, { color: '#ffd166' })).setOrigin(0.5).setVisible(false) }));
    this.sqOrderLbl = this.add.text(0, 0, 'ORDER (tap 2 to swap)', S(10, { color: '#c9d1d9' })).setOrigin(1, 0.5).setVisible(false);
    this.input.on('wheel', (pointer, over, dx, dy) => { if (HUD.building) { const gs = this.gs(); if (gs && gs.buildZoom) gs.buildZoom(dy > 0 ? 0.9 : 1.1); } });
    this.heroLv = this.add.text(0, 0, '', S(11, { color: '#f2d14b' })).setOrigin(0, 0.5);
    this.portLv = [0, 1, 2, 3].map(() => this.add.text(0, 0, '', S(9, { color: '#e8e6df' })).setOrigin(0.5, 0).setVisible(false));
    this.detIcon = this.add.image(0, 0, 'hero').setVisible(false);
    this.detName = this.add.text(0, 0, '', S(18, { color: '#f2d14b' })).setOrigin(0, 0).setVisible(false);
    this.detBody = this.add.text(0, 0, '', S(11, { color: '#e8e6df', lineSpacing: 3 })).setOrigin(0, 0).setVisible(false);
    this.detBtns = [0, 1, 2, 3, 4, 5, 6, 7].map(() => this.add.text(0, 0, '', S(12)).setOrigin(0.5).setVisible(false));

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
    this.B.pNew = { x: P.x + P.w / 2 - u * 0.14, y: P.y - P.h / 2 + u * 0.075, w: u * 0.22, h: u * 0.075 };
    const fs = n => Math.max(10, Math.round(u * n)) + 'px';
    this.topText.setPosition(w / 2, u * 0.035).setFontSize(fs(0.042));
    this.cageText.setPosition(u * 0.265, u * 0.18).setFontSize(fs(0.028));
    this.modeText.setPosition(this.B.mode.x, this.B.mode.y).setFontSize(fs(0.032));
    for (const k of ['atk', 'dash', 'a1', 'a2', 'cap']) this.lbl[k].setPosition(this.B[k].x, this.B[k].y + this.B[k].r + u * 0.025).setFontSize(fs(k === 'atk' || k === 'cap' ? 0.03 : 0.026));
    for (const k of ['build', 'endDay', 'prompt', 'done', 'tabMil', 'tabCiv']) this.tBtn[k].setPosition(this.B[k].x, this.B[k].y).setFontSize(fs(k === 'prompt' ? 0.036 : 0.032));
    this.buildMsg.setPosition(w / 2 + u * 0.16, this.B.bar.y - this.B.bar.h / 2 - u * 0.015).setFontSize(fs(0.03));
    this.cards.forEach(c => { c.name.setFontSize(fs(0.026)); c.cost.setFontSize(fs(0.026)); });
    this.panelTitle.setPosition(w / 2, P.y - P.h / 2 + u * 0.08).setFontSize(fs(0.055));
    this.panelBody.setPosition(w / 2, P.y - u * 0.04).setFontSize(fs(0.033));
    this.panelUp.setPosition(this.B.pUp.x, this.B.pUp.y).setFontSize(fs(0.033));
    this.panelClose.setPosition(this.B.pClose.x, this.B.pClose.y).setFontSize(fs(0.033));
    this.panelNew.setPosition(this.B.pNew.x, this.B.pNew.y).setFontSize(fs(0.024));
    this.banner.setPosition(w / 2, h * 0.3).setFontSize(fs(0.08));
    this.bannerSub.setPosition(w / 2, h * 0.3 + u * 0.05).setFontSize(fs(0.032));
    this.over.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
    this.rotateText.setPosition(w / 2, h / 2).setFontSize(fs(0.06));
    this.deskHelp.setPosition(w / 2, h - 10).setFontSize(fs(0.024));
    this.B.squadBtn = { x: u * 0.2, y: u * 0.3, w: u * 0.3, h: u * 0.085 };
    this.B.stashBtn = { x: w / 2 + u * 0.36, y: u * 0.16, w: u * 0.3, h: u * 0.085 };
    this.B.itemBtn = { x: w / 2, y: u * 0.2, w: u * 0.42, h: u * 0.075 };
    this.B.itm = [0, 1, 2].map(i => ({ x: w / 2 + (i - 1) * u * 0.28, y: u * 0.29, w: u * 0.26, h: u * 0.075 }));
    this.B.zIn = { x: w - u * 0.48, y: u * 0.075, r: u * 0.042 };
    this.B.zOut = { x: w - u * 0.37, y: u * 0.075, r: u * 0.042 };
    this.tBtn.stash.setPosition(this.B.stashBtn.x, this.B.stashBtn.y).setFontSize(fs(0.032));
    this.itemTxt.forEach((t, i) => t.setPosition(this.B.itm[i].x, this.B.itm[i].y).setFontSize(fs(0.028)));
    this.itemBtnTxt.setPosition(this.B.itemBtn.x, this.B.itemBtn.y).setFontSize(fs(0.028));
    this.zTxt[0].setPosition(this.B.zIn.x, this.B.zIn.y).setFontSize(fs(0.06)); this.zTxt[1].setPosition(this.B.zOut.x, this.B.zOut.y).setFontSize(fs(0.06));
    this.B.port = [0, 1, 2, 3].map(i => ({ x: u * 0.065, y: u * 0.44 + i * u * 0.115, r: u * 0.046 }));
    const SQ = { x: w / 2, y: h / 2, w: Math.min(w * 0.94, u * 1.55), h: u * 0.9 };
    this.B.sq = SQ;
    {
      const SQm = this.B.sq, cx = SQm.x - SQm.w * 0.05, cy = SQm.y + u * 0.03;
      const off = { W: [-SQm.w * 0.3, 0], E: [SQm.w * 0.3, 0], N: [0, -u * 0.26], S: [0, u * 0.26] };
      this.B.mapC = { x: cx, y: cy };
      this.B.mapN = ['W', 'E', 'N', 'S'].map(k => ({ x: cx + off[k][0], y: cy + off[k][1], r: u * 0.065 }));
      this.B.mapR = { x: SQm.x + SQm.w * 0.37, y: SQm.y - u * 0.2, r: u * 0.06 };
      this.B.mapClose = { x: SQm.x + SQm.w * 0.37, y: SQm.y + SQm.h / 2 - u * 0.08, w: u * 0.24, h: u * 0.075 };
      this.mapTitle.setPosition(SQm.x - SQm.w * 0.36, SQm.y - SQm.h / 2 + u * 0.06).setFontSize(fs(0.042));
      this.mapHint.setPosition(SQm.x - SQm.w * 0.36, SQm.y - SQm.h / 2 + u * 0.11).setFontSize(fs(0.024));
      this.mapClose.setPosition(this.B.mapClose.x, this.B.mapClose.y).setFontSize(fs(0.03));
      this.mapNames.forEach((t, i) => t.setPosition(this.B.mapN[i].x, this.B.mapN[i].y + u * 0.09).setFontSize(fs(0.03)));
      this.mapLines.forEach((t, i) => t.setPosition(this.B.mapN[i].x, this.B.mapN[i].y + u * 0.13).setFontSize(fs(0.022)));
      this.mapIcons.forEach((t, i) => t.setPosition(this.B.mapN[i].x, this.B.mapN[i].y));
      this.mapTown.setPosition(cx, cy).setScale(u / 300 * 0.55);
      this.mapReact.setPosition(this.B.mapR.x, this.B.mapR.y + u * 0.11).setFontSize(fs(0.024));
    }
    this.B.sqClose = { x: w / 2, y: SQ.y + SQ.h / 2 - u * 0.065, w: u * 0.3, h: u * 0.085 };
    this.tBtn.squad.setPosition(this.B.squadBtn.x, this.B.squadBtn.y).setFontSize(fs(0.032));
    this.sqTitle.setPosition(w / 2, SQ.y - SQ.h / 2 + u * 0.05).setFontSize(fs(0.045));
    this.sqSub.setPosition(w / 2, SQ.y - SQ.h / 2 + u * 0.105).setFontSize(fs(0.027));
    this.sqClose.setPosition(this.B.sqClose.x, this.B.sqClose.y).setFontSize(fs(0.035));
    this.B.pgPrev = { x: SQ.x - SQ.w / 2 + u * 0.13, y: this.B.sqClose.y, w: u * 0.16, h: u * 0.085 };
    this.B.pgNext = { x: SQ.x + SQ.w / 2 - u * 0.13, y: this.B.sqClose.y, w: u * 0.16, h: u * 0.085 };
    this.pgPrev.setPosition(this.B.pgPrev.x, this.B.pgPrev.y).setFontSize(fs(0.045));
    this.pgNext.setPosition(this.B.pgNext.x, this.B.pgNext.y).setFontSize(fs(0.045));
    this.pgText.setPosition(SQ.x - SQ.w / 2 + u * 0.32, this.B.sqClose.y).setFontSize(fs(0.026));
    this.sqCards.forEach(c => { c.name.setFontSize(fs(0.03)); c.info.setFontSize(fs(0.025)); c.badge.setFontSize(fs(0.034)); });
    this.portraits.forEach(pp => pp.num.setFontSize(fs(0.03)));
    this.B.strip = [0, 1, 2, 3].map(i => ({ x: SQ.x + u * 0.36 + i * u * 0.095, y: SQ.y - SQ.h / 2 + u * 0.055, r: u * 0.036 }));
    this.sqOrderLbl.setPosition(SQ.x + u * 0.31, SQ.y - SQ.h / 2 + u * 0.055).setFontSize(fs(0.024));
    this.sqStrip.forEach(st => st.num.setFontSize(fs(0.026)));
    this.heroLv.setPosition(u * 0.265, u * 0.125).setFontSize(fs(0.028));
    this.portLv.forEach(t => t.setFontSize(fs(0.024)));
    this.detName.setFontSize(fs(0.045)); this.detBodyFs = fs(0.028); this.detBody.setFontSize(this.detBodyFs).setWordWrapWidth(SQ.w * 0.45);
    this.detFs = fs(0.029);
    this.detBtns.forEach(t => t.setFontSize(this.detFs));
  }
  detBtnRect(i) {
    const SQ = this.B.sq, u = this.u, n = Math.max(6, ((HUD.detail && HUD.detail.buttons) || []).length);
    const step = u * Math.min(0.105, 0.7 / n);
    return { x: SQ.x + SQ.w * 0.24, y: SQ.y - SQ.h / 2 + u * 0.14 + i * step, w: SQ.w * 0.44, h: step * 0.84 };
  }

  sqCardRect(i) {
    const SQ = this.B.sq, u = this.u, gap = u * 0.015, cols = 4, rows = 3;
    const top = SQ.y - SQ.h / 2 + u * 0.14, bottom = this.B.sqClose.y - this.B.sqClose.h / 2 - u * 0.02;
    const cw = (SQ.w - u * 0.06 - gap * (cols - 1)) / cols, ch = (bottom - top - gap * (rows - 1)) / rows;
    const c = i % cols, r = Math.floor(i / cols);
    return { x: SQ.x - SQ.w / 2 + u * 0.03 + cw / 2 + c * (cw + gap), y: top + ch / 2 + r * (ch + gap), w: cw, h: ch };
  }
  portHit(x, y) { if (!HUD.canSwap || !HUD.squad) return -1; return this.B.port.findIndex((b, i) => i < HUD.squad.length && this.near(x, y, b, 1.25)); }

  inRect(x, y, r) { return Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2; }
  near(x, y, b, mult) { return Math.hypot(x - b.x, y - b.y) < b.r * mult; }
  gs() { const s = this.scene.get(HUD.scene); return s && s.sys.isActive() ? s : null; }
  town() { return HUD.scene === 'town'; }
  cardItems() { return HUD.buildTab === 'civ' ? CIV_ITEMS.concat(['recipe', 'upgrade', 'remove']) : MIL_ITEMS.concat(['upgrade', 'remove']); }
  cardRect(i, n) {
    const bar = this.B.bar, gap = this.u * 0.012;
    const cw = Math.min(this.u * 0.2, (bar.x1 - bar.x0 - gap * (n - 1)) / n);
    return { x: bar.x0 + cw / 2 + i * (cw + gap), y: bar.y, w: cw, h: bar.h };
  }
  itemsVisible() { return !!HUD.items && (!this.town() || !!HUD.night) && !HUD.panel && !HUD.building && !HUD.dead; }
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
    if (HUD.building && !HUD.panel) { // build camera: one finger pans, two fingers zoom
      const B2 = this.B;
      if (p.y < B2.bar.y - B2.bar.h / 2 && !this.inRect(p.x, p.y, B2.done) && !this.near(p.x, p.y, B2.zIn, 1.3) && !this.near(p.x, p.y, B2.zOut, 1.3)) {
        this.bTouch[p.id] = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
        const ids = Object.keys(this.bTouch);
        if (ids.length === 2) { const [a, b] = ids.map(id => this.bTouch[id]); const gs = this.gs(); this.pinch = { d: Math.hypot(a.cx - b.cx, a.cy - b.cy) || 1, z: gs ? gs.cameras.main.zoom : 1 }; this.bPinched = true; }
      }
      return;
    }
    if (HUD.panel || HUD.building) return; // handled on release
    if (this.itemsVisible() && (this.inRect(p.x, p.y, this.B.itemBtn) || (HUD.itemsOpen && this.B.itm.some(r => this.inRect(p.x, p.y, r))))) return;
    if (!this.town() || !HUD.building) { if (this.inRect(p.x, p.y, B.mode)) return; }
    if (this.townButtonsVisible() && (this.inRect(p.x, p.y, B.build) || this.inRect(p.x, p.y, B.endDay) || this.inRect(p.x, p.y, B.squadBtn) || this.inRect(p.x, p.y, B.stashBtn))) return;
    if (this.portHit(p.x, p.y) >= 0) return;
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
    if (HUD.building && this.bTouch[p.id]) {
      const t = this.bTouch[p.id], gs = this.gs();
      const ids = Object.keys(this.bTouch);
      const dx = p.x - t.cx, dy = p.y - t.cy;
      t.cx = p.x; t.cy = p.y;
      if (!gs || !gs.buildPan) return;
      if (ids.length >= 2 && this.pinch) {
        const [a, b] = ids.slice(0, 2).map(id => this.bTouch[id]);
        const d = Math.hypot(a.cx - b.cx, a.cy - b.cy) || 1, cam = gs.cameras.main;
        gs.buildZoom((this.pinch.z * d / this.pinch.d) / cam.zoom);
      } else {
        if (Math.hypot(p.x - t.sx, p.y - t.sy) > 12) this.bDragged = true;
        if (this.bDragged) gs.buildPan(dx, dy);
      }
      return;
    }
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
      } else Ctl.aimAbility = s.dir ? { i: k === 'a1' ? 1 : 2, dir: s.dir.clone() } : null;
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
    if (HUD.panel === 'map') {
      if (tapIn(B.mapClose) || !this.inRect(p.x, p.y, B.sq)) { Ctl.queue.push({ type: 'closePanel' }); return; }
      for (let i = 0; i < 4; i++) if (this.near(p.x, p.y, B.mapN[i], 1.5)) { Ctl.queue.push({ type: 'district', d: i }); return; }
      return;
    }
    if (HUD.panel === 'detail') {
      if (!this.inRect(p.x, p.y, B.sq)) { Ctl.queue.push({ type: 'closePanel' }); return; }
      const btns = (HUD.detail && HUD.detail.buttons) || [];
      for (let i = 0; i < Math.min(8, btns.length); i++) if (tapIn(this.detBtnRect(i))) { Ctl.queue.push(btns[i].ev); return; }
      return;
    }
    if (HUD.panel === 'squad') {
      if (tapIn(B.sqClose) || !this.inRect(p.x, p.y, B.sq)) { Ctl.queue.push({ type: 'closePanel' }); return; }
      const nSq = (HUD.squad || []).length;
      for (let i = 0; i < nSq; i++) {
        if (this.near(p.downX, p.downY, B.strip[i], 1.3) && this.near(p.x, p.y, B.strip[i], 1.3)) {
          if (this.sqSel < 0) this.sqSel = i; else if (this.sqSel === i) this.sqSel = -1; else { Ctl.queue.push({ type: 'swapOrder', a: this.sqSel, b: i }); this.sqSel = -1; }
          return;
        }
      }
      const roster = HUD.roster || [], pages = Math.ceil(roster.length / 12), pg = Math.min(HUD.rosterPage || 0, pages - 1);
      if (pages > 1 && tapIn(B.pgPrev) && pg > 0) { Ctl.queue.push({ type: 'page', d: -1 }); return; }
      if (pages > 1 && tapIn(B.pgNext) && pg < pages - 1) { Ctl.queue.push({ type: 'page', d: 1 }); return; }
      const view = roster.slice(pg * 12, pg * 12 + 12);
      for (let i = 0; i < view.length; i++) if (tapIn(this.sqCardRect(i))) { Ctl.queue.push({ type: 'openDetail', id: view[i].id }); return; }
      return;
    }
    if (HUD.panel) {
      if (HUD.panel === 'hall' && tapIn(B.pNew)) Ctl.queue.push({ type: 'newGameAsk' });
      else if (tapIn(B.pUp)) Ctl.queue.push({ type: 'hallUpgrade' });
      else if (tapIn(B.pClose) || !this.inRect(p.x, p.y, B.panel)) Ctl.queue.push({ type: 'closePanel' });
      return;
    }
    // build mode
    if (HUD.building) {
      const wasDrag = this.bDragged || this.bPinched;
      delete this.bTouch[p.id];
      if (!Object.keys(this.bTouch).length) { this.bDragged = false; this.bPinched = false; this.pinch = null; }
      if (this.near(p.downX, p.downY, B.zIn, 1.3) && this.near(p.x, p.y, B.zIn, 1.3)) { const gs = this.gs(); if (gs) gs.buildZoom(1.25); return; }
      if (this.near(p.downX, p.downY, B.zOut, 1.3) && this.near(p.x, p.y, B.zOut, 1.3)) { const gs = this.gs(); if (gs) gs.buildZoom(0.8); return; }
      if (wasDrag) return;
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
      if (tapIn(B.squadBtn)) { this.releaseAll(); Ctl.queue.push({ type: 'openSquad' }); return; }
      if (tapIn(B.stashBtn)) { this.releaseAll(); Ctl.queue.push({ type: 'openStash' }); return; }
    }
    if (this.itemsVisible()) {
      const ks = ['medkit', 'treat', 'lure'];
      if (tapIn(B.itemBtn)) { if (HUD.lureArmed) Ctl.queue.push({ type: 'item', k: 'lure' }); else HUD.itemsOpen = !HUD.itemsOpen; return; }
      if (HUD.itemsOpen) for (let i = 0; i < 3; i++) if (tapIn(B.itm[i])) { Ctl.queue.push({ type: 'item', k: ks[i] }); HUD.itemsOpen = false; return; }
    }
    {
      const a = this.portHit(p.downX, p.downY), b = this.portHit(p.x, p.y);
      if (a >= 0 && a === b) {
        if (this.swapSel < 0) this.swapSel = a;
        else if (this.swapSel === a) this.swapSel = -1;
        else { Ctl.queue.push({ type: 'swapSlots', a: this.swapSel, b: a }); this.swapSel = -1; }
        return;
      }
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
      if (!s.drag) Ctl.queue.push({ type: 'ab', i: 2, dir: null });
      else if (s.dir) Ctl.queue.push({ type: 'ab', i: 2, dir: s.dir });
      Ctl.aimAbility = null; this.ptr.a2 = null;
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
      const sp = u * Math.min(0.05, 0.32 / maxHp), x = u * 0.28 + i * sp, y = u * 0.075, r = sp * 0.38;
      if (i < HUD.hp) { g.fillStyle(0xff4d6d, 1); g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.lineStyle(2, 0x000000, 0.8); g.strokeRect(x - r, y - r, r * 2, r * 2);
    }
    this.cageText.setVisible(!town && !panel).setText(`CAGES ×${HUD.cages ?? 0}`);
    const hv = HUD.hero;
    this.heroLv.setVisible(!!hv && !panel);
    if (hv && !panel) {
      const maxed = hv.lvl >= hv.cap;
      this.heroLv.setText(`LV ${hv.lvl}${maxed ? ' MAX' : ''}`);
      const bx = u * 0.265 + this.heroLv.width + 6, by = u * 0.12, bw = u * 0.16;
      g.fillStyle(0x000000, 0.6); g.fillRect(bx - 1, by - 1, bw + 2, u * 0.014 + 2);
      g.fillStyle(0xf2d14b, 1); g.fillRect(bx, by, bw * (maxed ? 1 : Math.min(1, hv.xp / hv.need)), u * 0.014);
    }
    HUD.scrapPop = Math.max(0, (HUD.scrapPop || 0) - dt);

    // top text
    let top;
    if (HUD.scene === 'raid') top = HUD.topText || '';
    else if (!town) top = `${HUD.dungeonName || 'RUINS'} ${HUD.room}/${T.rooms}   ·   ⚙ ${HUD.scrap ?? 0}${HUD.parts ? `   ·   🔩 ${HUD.parts}` : ''}`;
    else if (building) top = `MILITARY ${HUD.points.mil}/${HUD.points.milMax}   ·   CIVIC ${HUD.points.civ}/${HUD.points.civMax}`;
    else if (HUD.night) { const s = Math.ceil(HUD.night.t); top = `NIGHT ${HUD.day}   ·   ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}   ·   ⚙ ${HUD.scrap}`; }
    else top = `DAY ${HUD.day}  ·  ⚙${HUD.scrap}  ·  🌾${HUD.food || 0} (${(HUD.foodNet || 0) >= 0 ? '+' : ''}${HUD.foodNet || 0})  ·  🔩${HUD.parts || 0}  ·  HALL ${HUD.townLevel}${HUD.raidWarn ? '   ·   ⚠ BANDITS TONIGHT' : ''}`;
    this.topText.setText(top).setScale(1 + (HUD.scrapPop || 0) * 0.6).setVisible(!panel);
    if (town && HUD.night) {
      const bw = u * 0.5, bx = w / 2 - bw / 2, by = u * 0.1;
      g.fillStyle(0x000000, 0.6); g.fillRect(bx - 2, by - 2, bw + 4, u * 0.025 + 4);
      g.fillStyle(HUD.night.gen / HUD.night.genMax > 0.35 ? 0x5fd3ff : 0xff4d6d, 1); g.fillRect(bx, by, bw * HUD.night.gen / HUD.night.genMax, u * 0.025);
    }

    // mode toggle (hidden in build mode)
    this.modeText.setVisible(!building && !panel);
    if (!building && !panel) {
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

    // squad button + portraits
    this.tBtn.stash.setVisible(showTown);
    if (showTown) { this.pill(B.stashBtn, 0x9aa4ad, 0.55, false); this.tBtn.stash.setText(`STASH ${HUD.stashTot ?? ''}`); }
    // item buttons (dungeon + night)
    const showItemBtn = this.itemsVisible() && !portrait, showItems = showItemBtn && !!HUD.itemsOpen && !HUD.lureArmed;
    this.itemBtnTxt.setVisible(showItemBtn);
    if (showItemBtn) {
      const tot = ['medkit', 'treat', 'lure'].reduce((m, k) => m + (HUD.items[k] || 0), 0);
      this.pill(B.itemBtn, HUD.lureArmed ? 0xf2d14b : 0x9aa4ad, HUD.lureArmed ? 0.8 : 0.55, !!HUD.lureArmed);
      this.itemBtnTxt.setText(HUD.lureArmed ? '🎯 LURE READY (tap to cancel)' : `🎒 ITEMS ×${tot}  ${HUD.itemsOpen ? '▲' : '▼'}`);
    }
    ['medkit', 'treat', 'lure'].forEach((k, i) => {
      const t = this.itemTxt[i]; t.setVisible(showItems);
      if (!showItems) return;
      const n = HUD.items[k] || 0, r = B.itm[i];
      this.pill(r, [0x8ef0a0, 0xff8c9e, 0xf2d14b][i], n ? 0.55 : 0.3, false);
      t.setText(`${['MED KIT', 'TREAT', 'LURE'][i]} ×${n}`).setAlpha(n ? 1 : 0.4);
    });
    this.tBtn.squad.setVisible(showTown);
    if (showTown) { this.pill(B.squadBtn, 0xff8c9e, 0.55, !!HUD.picksPending); if (HUD.picksPending) { g.lineStyle(2, 0xf2d14b, 0.5 + 0.5 * Math.sin(time * 0.01)); g.strokeRoundedRect(B.squadBtn.x - B.squadBtn.w / 2 - 3, B.squadBtn.y - B.squadBtn.h / 2 - 3, B.squadBtn.w + 6, B.squadBtn.h + 6, B.squadBtn.h / 2); } }
    this.tBtn.squad.setText(HUD.picksPending ? '🐾 SQUAD ★' : '🐾 SQUAD');
    const sq = HUD.squad || [];
    const showPorts = !building && !panel && !portrait && sq.length > 0;
    if (!HUD.canSwap) this.swapSel = -1;
    this.portraits.forEach((pp, i) => {
      const e = sq[i], b = B.port[i], vis = showPorts && !!e;
      this.portLv[i].setVisible(vis);
      pp.icon.setVisible(vis); pp.num.setVisible(vis && e.slot >= 0);
      if (!vis) return;
      const sel = this.swapSel === i;
      const col = e.ko ? 0x555555 : (e.slot >= 0 ? 0xff8c42 : 0x9aa4ad);
      g.fillStyle(sel ? 0x8ef0a0 : 0x000000, sel ? 0.3 : 0.55); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(sel ? 4 : 2, sel ? 0x8ef0a0 : col, e.slot >= 0 || sel ? 1 : 0.6); g.strokeCircle(b.x, b.y, b.r);
      if (HUD.canSwap && !sel) { g.lineStyle(1, 0x8ef0a0, 0.25 + 0.2 * Math.sin(time * 0.006)); g.strokeCircle(b.x, b.y, b.r + 4); }
      pp.icon.setTexture(e.sp).setPosition(b.x, b.y - b.r * 0.08).setScale(b.r / 26).setAlpha(e.ko ? 0.3 : (e.slot >= 0 ? 1 : 0.65));
      if (e.ko) { const q = b.r * 0.5; g.lineStyle(3, 0xff4d6d, 0.9); g.lineBetween(b.x - q, b.y - q, b.x + q, b.y + q); g.lineBetween(b.x + q, b.y - q, b.x - q, b.y + q); }
      pp.num.setText(String(e.slot + 1)).setPosition(b.x + b.r * 0.85, b.y - b.r * 0.85);
      this.portLv[i].setText('Lv' + (e.lvl || 1)).setPosition(b.x, b.y + b.r + 9);
      const pw = b.r * 1.7 / e.maxHp;
      for (let k = 0; k < e.maxHp; k++) { g.fillStyle(k < e.hp ? 0xff8c9e : 0x3a2a2e, 1); g.fillRect(b.x - b.r * 0.85 + k * pw + 1, b.y + b.r + 3, pw - 2, 4); }
    });

    // squad panel
    const showSq = panel === 'squad';
    [this.sqTitle, this.sqSub, this.sqClose].forEach(t => t.setVisible(showSq));
    if (showSq) {
      const SQ = B.sq;
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, w, h);
      g.fillStyle(0x14161a, 0.97); g.fillRoundedRect(SQ.x - SQ.w / 2, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      g.lineStyle(3, 0xff8c9e, 0.8); g.strokeRoundedRect(SQ.x - SQ.w / 2, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      this.sqSub.setText(HUD.rosterMsg || 'Tap one to upgrade it, add it to your squad, or give it a job  ·  #1 and #2 fight  ·  all 4 give passives');
      this.pill(B.sqClose, 0x8ef0a0, 0.6, false);
    }
    const sqList = showSq ? (HUD.squad || []) : [];
    this.sqOrderLbl.setVisible(showSq && sqList.length > 1);
    if (!showSq) this.sqSel = -1;
    this.sqStrip.forEach((st, i) => {
      const e = sqList[i], vis = showSq && !!e;
      st.icon.setVisible(vis); st.num.setVisible(vis);
      if (!vis) return;
      const b = B.strip[i], sel = this.sqSel === i;
      g.fillStyle(sel ? 0x8ef0a0 : 0x000000, sel ? 0.35 : 0.6); g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(sel ? 3 : 2, sel ? 0x8ef0a0 : (i < 2 ? 0xff8c42 : 0x9aa4ad), 1); g.strokeCircle(b.x, b.y, b.r);
      st.icon.setTexture(e.sp).setPosition(b.x, b.y).setScale(b.r / 28);
      st.num.setText(String(i + 1)).setPosition(b.x + b.r * 0.9, b.y - b.r * 0.9);
    });
    const fullRoster = showSq ? (HUD.roster || []) : [];
    const pages = Math.max(1, Math.ceil(fullRoster.length / 12)), pg = Math.min(HUD.rosterPage || 0, pages - 1);
    const roster = fullRoster.slice(pg * 12, pg * 12 + 12);
    const showPg = showSq && pages > 1;
    [this.pgPrev, this.pgNext, this.pgText].forEach(t => t.setVisible(showPg));
    if (showPg) {
      this.pill(B.pgPrev, 0xffffff, 0.6, false); this.pill(B.pgNext, 0xffffff, 0.6, false);
      this.pgPrev.setAlpha(pg > 0 ? 1 : 0.3); this.pgNext.setAlpha(pg < pages - 1 ? 1 : 0.3);
      this.pgText.setText(`page ${pg + 1}/${pages}`);
    }
    this.sqCards.forEach((c, i) => {
      const e = roster[i], vis = showSq && !!e;
      [c.icon, c.name, c.info, c.badge].forEach(o => o.setVisible(vis));
      if (!vis) return;
      const r = this.sqCardRect(i), d = e.hero ? null : SP[e.sp], inSq = e.inSquad >= 0;
      g.fillStyle(inSq ? 0xff8c42 : 0x000000, inSq ? 0.22 : 0.5); g.fillRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 8);
      g.lineStyle(2, inSq ? 0xff8c42 : 0xffffff, inSq ? 0.9 : 0.25); g.strokeRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 8);
      c.icon.setTexture(e.sp).setPosition(r.x - r.w / 2 + r.h * 0.42, r.y).setScale(r.h / 62);
      const up = (n) => '▲'.repeat(Math.max(0, (n || 1) - 1));
      c.name.setText(e.hero ? 'You' : d.name).setPosition(r.x - r.w / 2 + r.h * 0.85, r.y - r.h * 0.42);
      c.info.setText(e.hero ? `Lv ${e.lvl} / ${HUD.capNow}\nPerks + hearts` : `Lv ${e.lvl} · ${e.job ? '⚒ ' + e.job : '♥'.repeat(e.hearts)}\nA: ${d.activeName} ${up(e.ar)}\nP: ${d.passiveName} ${up(e.pr)}`).setPosition(r.x - r.w / 2 + r.h * 0.85, r.y - r.h * 0.14);
      c.badge.setText(`${inSq ? '#' + (e.inSquad + 1) : ''}${e.job ? '⚒' : ''}${e.picks ? ' ★' : ''}`).setPosition(r.x - r.w / 2 + 6, r.y - r.h / 2 + 4);
      if (e.picks) { g.lineStyle(2, 0xf2d14b, 0.6 + 0.4 * Math.sin(time * 0.01)); g.strokeRoundedRect(r.x - r.w / 2 - 2, r.y - r.h / 2 - 2, r.w + 4, r.h + 4, 9); }
    });

    // detail page
    const D = panel === 'detail' ? HUD.detail : null;
    [this.detIcon, this.detName, this.detBody].forEach(o => o.setVisible(!!D));
    const dbtns = D ? D.buttons : [];
    this.detBtns.forEach((t, i) => t.setVisible(i < dbtns.length));
    if (D) {
      const SQ = B.sq, x0 = SQ.x - SQ.w / 2;
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, w, h);
      g.fillStyle(0x14161a, 0.97); g.fillRoundedRect(x0, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      g.lineStyle(3, 0xf2d14b, 0.8); g.strokeRoundedRect(x0, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      this.detIcon.setTexture(D.icon).setPosition(x0 + u * 0.1, SQ.y - SQ.h / 2 + u * 0.11).setScale(u / 300 * 48 / Math.max(48, this.detIcon.frame.width));
      this.detName.setText(D.name).setPosition(x0 + u * 0.2, SQ.y - SQ.h / 2 + u * 0.04);
      const bx = x0 + u * 0.2, by = SQ.y - SQ.h / 2 + u * 0.115, bw = SQ.w * 0.32;
      g.fillStyle(0x000000, 0.7); g.fillRect(bx - 1, by - 1, bw + 2, u * 0.02 + 2);
      g.fillStyle(0xf2d14b, 1); g.fillRect(bx, by, bw * Math.min(1, D.xpFrac || 0), u * 0.02);
      this.detBody.setFontSize(D.small ? Math.round(parseFloat(this.detBodyFs) * 0.85) + 'px' : this.detBodyFs).setText(D.body + (HUD.rosterMsg ? `\n\n${HUD.rosterMsg}` : '')).setPosition(x0 + u * 0.04, SQ.y - SQ.h / 2 + u * 0.2);
      dbtns.forEach((bt, i) => {
        const r = this.detBtnRect(i), back = bt.ev.type === 'back', upg = bt.ev.type === 'upgrade' || bt.ev.type === 'perk';
        this.pill(r, back ? 0xffffff : upg ? 0xf2d14b : 0xff8c9e, 0.6, upg);
        const tx = this.detBtns[i]; tx.setFontSize(this.detFs).setText(bt.label).setPosition(r.x, r.y);
        if (tx.width > r.w * 0.92) tx.setFontSize(Math.max(9, Math.floor(parseFloat(this.detFs) * r.w * 0.92 / tx.width)) + 'px');
      });
    }

    // build mode UI
    this.tBtn.done.setVisible(building); this.zTxt.forEach(t => t.setVisible(building)); this.tBtn.tabMil.setVisible(building); this.tBtn.tabCiv.setVisible(building);
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
      if (def) { c.icon.setTexture(it).setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 70).setAlpha(1); c.name.setText(def.name); const cst = def.upg ? def.upg[0] : def.cost, mx = typeCap(it); c.cost.setText(`${cst} pt${cst > 1 ? 's' : ''}${mx ? `  ·  ${countB(it)}/${mx}` : ''}`); }
      else if (it === 'recipe') { c.icon.setTexture('medkit').setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 40).setAlpha(0.9); c.name.setText('RECIPE'); c.cost.setText('⇄'); }
      else if (it === 'upgrade') { const civ = HUD.buildTab === 'civ'; c.icon.setTexture(civ ? 'part' : 'turret').setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / (civ ? 26 : 70)).setAlpha(civ ? 0.9 : 0.6); c.name.setText('UPGRADE'); c.cost.setText(civ ? '🔩' : '▲'); }
      else { c.icon.setTexture('rubble').setPosition(r.x, r.y - r.h * 0.16).setScale(Math.min(r.w, r.h) / 70).setAlpha(0.6); c.name.setText('REMOVE'); c.cost.setText('refund'); }
      c.name.setPosition(r.x, r.y + r.h * 0.12); c.cost.setPosition(r.x, r.y + r.h * 0.28);
    });
    if (building) {
      g.fillStyle(0x000000, 0.55); g.fillRect(0, B.bar.y - B.bar.h / 2 - u * 0.01, w, B.bar.h + u * 0.02);
      this.pill(B.done, 0x8ef0a0, 0.6, false);
      [B.zIn, B.zOut].forEach(z => { g.fillStyle(0x000000, 0.55); g.fillCircle(z.x, z.y, z.r); g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(z.x, z.y, z.r); });
      this.pill(B.tabMil, 0xff8c42, 0.6, HUD.buildTab === 'mil');
      this.pill(B.tabCiv, 0x5fd3ff, 0.6, HUD.buildTab === 'civ');
      this.buildMsg.setText(HUD.buildMsg || '');
    }

    // the city map
    const showMap = panel === 'map' && HUD.map;
    [this.mapTitle, this.mapHint, this.mapClose, this.mapTown, this.mapReact].concat(this.mapNames, this.mapLines, this.mapIcons).forEach(o => o.setVisible(!!showMap));
    if (showMap) {
      const SQ = B.sq, M = HUD.map, C = B.mapC;
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, w, h);
      g.fillStyle(0x15171b, 0.98); g.fillRoundedRect(SQ.x - SQ.w / 2, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      g.lineStyle(3, 0xf2d14b, 0.8); g.strokeRoundedRect(SQ.x - SQ.w / 2, SQ.y - SQ.h / 2, SQ.w, SQ.h, 14);
      const col = { done: 0x5fd36b, open: 0xff4d6d, locked: 0x4a5058 };
      // roads + ground tint
      M.nodes.forEach((n, i) => {
        const N = B.mapN[i];
        g.fillStyle(col[n.state], 0.12); g.fillCircle(N.x, N.y, N.r * 2.1);
        g.lineStyle(u * 0.018, 0x3a3f46, 1); g.lineBetween(C.x, C.y, N.x, N.y);
        g.lineStyle(u * 0.006, n.state === 'locked' ? 0x2a2e33 : 0x8a7a5a, 0.8); g.lineBetween(C.x, C.y, N.x, N.y);
      });
      // the reactor: far-off goal
      const R = B.mapR, pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
      g.lineStyle(u * 0.006, 0x3a3f46, 1); g.lineBetween(B.mapN[2].x, B.mapN[2].y, R.x, R.y);
      g.fillStyle(0x1b1d10, 1); g.fillCircle(R.x, R.y, R.r);
      g.lineStyle(3, 0xf2d14b, 0.5 + 0.4 * pulse); g.strokeCircle(R.x, R.y, R.r);
      g.fillStyle(0xf2d14b, 0.9);
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 - Math.PI / 2 + time * 0.0006; g.slice(R.x, R.y, R.r * 0.8, a - 0.45, a + 0.45, false); g.fillPath(); }
      g.fillStyle(0x1b1d10, 1); g.fillCircle(R.x, R.y, R.r * 0.22); g.fillStyle(0xf2d14b, 1); g.fillCircle(R.x, R.y, R.r * 0.12);
      this.mapReact.setText(`THE REACTOR\nReclaim all 4 + cure ${M.cure}%`);
      // town
      g.fillStyle(0x23262b, 1); g.fillRoundedRect(C.x - u * 0.07, C.y - u * 0.07, u * 0.14, u * 0.14, 10);
      g.lineStyle(3, 0xf2d14b, 0.9); g.strokeRoundedRect(C.x - u * 0.07, C.y - u * 0.07, u * 0.14, u * 0.14, 10);
      // districts
      M.nodes.forEach((n, i) => {
        const N = B.mapN[i];
        g.fillStyle(0x0d0e10, 1); g.fillCircle(N.x, N.y, N.r);
        g.lineStyle(4, col[n.state], 1); g.strokeCircle(N.x, N.y, N.r);
        if (n.state === 'open') { g.lineStyle(2, col.open, 0.6 * (1 - pulse)); g.strokeCircle(N.x, N.y, N.r * (1.15 + 0.35 * pulse)); }
        this.mapIcons[i].setTexture(n.icon).setScale(N.r * 1.2 / Math.max(16, this.mapIcons[i].frame.width)).setAlpha(n.state === 'locked' ? 0.35 : 1);
        this.mapNames[i].setText(n.name.toUpperCase()).setColor(n.state === 'done' ? '#5fd36b' : n.state === 'open' ? '#ff8c9e' : '#6b737c');
        this.mapLines[i].setText(n.line);
      });
      this.pill(B.mapClose, 0xffffff, 0.6, false);
    }

    // Town Hall panel
    const showPanel = panel === 'hall';
    [this.panelTitle, this.panelBody, this.panelUp, this.panelClose, this.panelNew].forEach(t => t.setVisible(showPanel));
    if (showPanel) {
      const P = B.panel, H = HUD.hall;
      g.fillStyle(0x000000, 0.5); g.fillRect(0, 0, w, h);
      g.fillStyle(0x14161a, 0.97); g.fillRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
      g.lineStyle(3, 0xf2d14b, 0.8); g.strokeRoundedRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h, 14);
      this.panelTitle.setText(`TOWN HALL — LEVEL ${H.level}`);
      const now = `Now: ${H.mil} military pts · ${H.civ} civic pts`;
      const nxt = H.next ? `Level ${H.level + 1}: ${H.next.mil} military · ${H.next.civ} civic · level cap ${(H.level + 1) * 5} · stronger generator` : 'Max level (for now)';
      const msg = HUD.hallMsg ? `\n\n${HUD.hallMsg}` : '';
      this.panelBody.setText(`${now}\n${nxt}\n\nYou have ⚙ ${HUD.scrap} scrap${msg}`);
      const can = H.next && HUD.scrap >= H.next.cost;
      this.pill(B.pUp, can ? 0x8ef0a0 : 0x6b737c, 0.6, can);
      this.panelUp.setText(H.next ? `UPGRADE  ⚙ ${H.next.cost}` : 'MAXED').setColor(can ? '#ffffff' : '#9aa4ad');
      this.pill(B.pClose, 0xffffff, 0.6, false);
      this.pill(B.pNew, 0xff8c8c, 0.5, false);
    }

    // combat controls
    const showTouch = this.touchUI && !portrait && !building && !panel;
    for (const k in this.lbl) this.lbl[k].setVisible(showTouch);
    this.lbl.a1.setText(HUD.ab1Label || '').setVisible(showTouch && !!HUD.ab1Label);
    this.lbl.a2.setText(HUD.ab2Label || '').setVisible(showTouch && !!HUD.ab2Label);
    this.deskHelp.setVisible(!this.touchUI && !building && !panel);
    this.deskHelp.setText(town
      ? 'WASD move · mouse aim · click attack · Space dash · Q/E pet abilities · B build · N end day · R use · click pets on the left to swap'
      : 'WASD move · mouse aim · click attack · Space dash · Q/E pet abilities · F cage · 1/2/3 items');
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
      this.drawBtn('dash', 0x3fd0c9, HUD.dashCd / dashCd());
      if (HUD.ab1Label) this.drawBtn('a1', SP_COLOR[HUD.ab1Sp] || 0xe08a3c, HUD.cd1 / (HUD.cd1Max || 1));
      if (HUD.ab2Label) this.drawBtn('a2', SP_COLOR[HUD.ab2Sp] || 0xe08a3c, HUD.cd2 / (HUD.cd2Max || 1));
      if (Ctl.mode === 'brawl') {
        const b = B.atk;
        for (let i = 0; i < ammoMax(); i++) {
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