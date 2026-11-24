// src/Pages/Arcade/games/walk-3d/sfx.js
//
// Cartoon sound effects made in code with the Web Audio API — no sound files.
// Browsers only allow sound after the player taps/clicks/presses a key, so
// call unlockSfx() from a user gesture (we do it on the first pointerdown/keydown).
//
//   sfx.boing(strength)  bump!            sfx.whoosh()   dash
//   sfx.whistle()        falling off      sfx.pop()      power-up
//   sfx.beep(high)       countdown        sfx.crack()    tile crumbling
//   sfx.slip()           banana peel      sfx.fanfare()  winner
//   sfx.honk()           just for fun     sfx.tick()     bomb fuse
//   sfx.boom()           KABOOM

let ctx = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem("arcade_sfx_muted") === "1"; } catch { /* storage blocked */ }

export function unlockSfx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* no audio on this device */ }
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem("arcade_sfx_muted", m ? "1" : "0"); } catch { /* storage blocked */ }
  if (master) master.gain.value = m ? 0 : 0.5;
}

// one oscillator note with a pitch sweep and a quick fade
function tone({ type = "sine", from = 440, to = from, dur = 0.2, vol = 0.4, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
// burst of filtered noise (cracks, whooshes)
function noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, type = "bandpass", sweepTo = null, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

export const sfx = {
  boing(strength = 1) {
    const s = Math.min(2, Math.max(0.4, strength));
    tone({ type: "sine", from: 180 + 60 * s, to: 520 + 120 * s, dur: 0.12, vol: 0.35 });
    tone({ type: "sine", from: 520 + 120 * s, to: 160, dur: 0.25, vol: 0.25, delay: 0.1 });
  },
  whoosh() { noise({ dur: 0.25, vol: 0.25, freq: 600, sweepTo: 2400, q: 0.8 }); },
  whistle() { tone({ type: "triangle", from: 1400, to: 220, dur: 1.1, vol: 0.25 }); },
  pop() { tone({ type: "square", from: 500, to: 1400, dur: 0.09, vol: 0.18 }); tone({ type: "sine", from: 900, to: 1800, dur: 0.12, vol: 0.2, delay: 0.06 }); },
  beep(high = false) { tone({ type: "square", from: high ? 880 : 520, dur: high ? 0.35 : 0.15, vol: 0.15 }); },
  crack() { noise({ dur: 0.18, vol: 0.25, freq: 300, type: "lowpass", q: 2 }); },
  slip() { tone({ type: "sawtooth", from: 300, to: 1200, dur: 0.35, vol: 0.12 }); tone({ type: "sine", from: 1200, to: 400, dur: 0.3, vol: 0.15, delay: 0.3 }); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: "triangle", from: f, dur: 0.22, vol: 0.25, delay: i * 0.14 })); },
  honk() { tone({ type: "sawtooth", from: 220, to: 200, dur: 0.25, vol: 0.2 }); },
  tick() { tone({ type: "square", from: 1800, to: 1600, dur: 0.03, vol: 0.08 }); },
  boom() {
    noise({ dur: 0.9, vol: 0.6, freq: 900, type: "lowpass", q: 0.7, sweepTo: 80 });
    tone({ type: "sine", from: 140, to: 35, dur: 0.8, vol: 0.5 });
  },
};