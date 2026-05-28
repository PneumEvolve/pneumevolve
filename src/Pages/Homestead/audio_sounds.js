// src/Pages/Homestead/audio_sounds.js
// One WebAudio sound factory shared by every run.
// Each scene passes its own palette of named beeps; the factory returns
// a `{ unlock, name1, name2, … }` object so call sites stay terse.
//
// Previously this exact pattern was copy-pasted into FishingRun, ForestRun,
// MiningRun, and FruitRun with only the palette differing.

const SOUND_PALETTES = {
  forest: {
    hit:    ["sawtooth", 180, 40,  0.25, 0.18],
    swing:  ["sine",     400, 200, 0.08, 0.10],
    pickup: ["sine",     600, 900, 0.10, 0.08],
    hurt:   ["sawtooth", 220, 60,  0.30, 0.22],
    drop:   ["sine",     300, 180, 0.10, 0.07],
    deny:   ["square",   220, 180, 0.10, 0.06],
  },
  mining: {
    hit:    ["square",   120, 60,   0.18, 0.20],
    swing:  ["sine",     300, 150,  0.10, 0.12],
    pickup: ["sine",     800, 1200, 0.12, 0.10],
    hurt:   ["sawtooth", 200, 50,   0.28, 0.20],
    chip:   ["square",   200, 100,  0.08, 0.15],
    deny:   ["square",   220, 180,  0.10, 0.06],
    drop:   ["sine",     300, 180,  0.10, 0.07],
  },
  fruit: {
    pluck:   ["sine",   880, 660, 0.15, 0.12],
    collect: ["sine",   660, 880, 0.10, 0.10],
    pickup:  ["sine",   600, 900, 0.10, 0.08],
    deny:    ["square", 220, 180, 0.10, 0.06],
    drop:    ["sine",   300, 180, 0.10, 0.07],
  },
  fishing: {
    splash: ["sine",     600, 200, 0.18, 0.15],
    nibble: ["sine",     900, 600, 0.12, 0.12],
    catch_: ["triangle", 440, 880, 0.35, 0.18],
    miss:   ["sawtooth", 300, 80,  0.22, 0.12],
    pickup: ["sine",     660, 900, 0.10, 0.10],
  },
};

export function makeSounds(paletteName) {
  const palette = SOUND_PALETTES[paletteName];
  if (!palette) {
    console.warn(`[sounds] unknown palette: ${paletteName}`);
    return { unlock: () => {} };
  }

  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const beep = (type, f0, f1, dur, vol) => {
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g);
      g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch {}
  };

  const sounds = {
    unlock: () => { try { getCtx(); } catch {} },
  };
  for (const [name, args] of Object.entries(palette)) {
    sounds[name] = () => beep(...args);
  }
  return sounds;
}

export const SOUND_PALETTE_NAMES = Object.keys(SOUND_PALETTES);
