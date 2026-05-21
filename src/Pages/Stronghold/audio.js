// src/Pages/Stronghold/audio.js
// Web Audio API sound engine — cozy build phase, tense wave phase.
// Background loops use AudioBufferSourceNode for gapless looping.
// One-shot SFX are synthesized.

let ctx = null;
let masterGain = null;
let currentMood = null; // "cozy" | "tense"
let initialized = false;

// ── Buffers & active loop nodes ───────────────────────────────────────────────

const buffers = { cozy: null, tense: null };
const loopNodes = { cozy: null, tense: null };   // { source, gain }
const loadPromises = {};

const TRACKS = {
  cozy:  "/audio/build_phase.mp3",
  tense: "/audio/combat_phase.mp3",
};

const FADE_DURATION = 2; // seconds
const TARGET_VOLUME = 0.5;

// ── Web Audio context ─────────────────────────────────────────────────────────

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

// ── Buffer loading ────────────────────────────────────────────────────────────

function loadTrack(key) {
  if (loadPromises[key]) return loadPromises[key];
  loadPromises[key] = fetch(TRACKS[key])
    .then(r => r.arrayBuffer())
    .then(ab => getCtx().decodeAudioData(ab))
    .then(buf => { buffers[key] = buf; return buf; })
    .catch(e => console.warn(`Stronghold audio: failed to load ${key}`, e));
  return loadPromises[key];
}

// ── Loop playback ─────────────────────────────────────────────────────────────

function startLoop(key, fadeIn = true) {
  const c = getCtx();
  const buf = buffers[key];
  if (!buf) return;

  // Stop any existing node for this key immediately
  stopLoop(key, 0);

  const source = c.createBufferSource();
  const gainNode = c.createGain();

  source.buffer = buf;
  source.loop = true;                    // ← gapless loop handled by Web Audio
  source.connect(gainNode);
  gainNode.connect(masterGain);

  if (fadeIn) {
    gainNode.gain.setValueAtTime(0, c.currentTime);
    gainNode.gain.linearRampToValueAtTime(TARGET_VOLUME, c.currentTime + FADE_DURATION);
  } else {
    gainNode.gain.setValueAtTime(TARGET_VOLUME, c.currentTime);
  }

  source.start(0);
  loopNodes[key] = { source, gain: gainNode };
}

function stopLoop(key, fadeDuration = FADE_DURATION) {
  const node = loopNodes[key];
  if (!node) return;
  const c = getCtx();
  try {
    if (fadeDuration > 0) {
      node.gain.gain.setValueAtTime(node.gain.gain.value, c.currentTime);
      node.gain.gain.linearRampToValueAtTime(0, c.currentTime + fadeDuration);
      node.source.stop(c.currentTime + fadeDuration + 0.05);
    } else {
      node.source.stop();
    }
  } catch {}
  loopNodes[key] = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initAudio() {
  if (initialized) return;
  initialized = true;
  getCtx();
  // Pre-fetch and decode both tracks in the background
  loadTrack("cozy");
  loadTrack("tense");
}

export async function setMood(mood) {
  if (mood === currentMood) return;
  const prev = currentMood;
  currentMood = mood;

  // Fade out whichever track was playing
  if (prev) stopLoop(prev, FADE_DURATION);

  if (!mood) return;

  // If buffer isn't ready yet, wait for it then play
  if (!buffers[mood]) {
    await loadTrack(mood);
  }
  // Only start if mood hasn't changed while we were waiting
  if (currentMood === mood) startLoop(mood, true);
}

export function stopAllAudio() {
  stopLoop("cozy",  FADE_DURATION);
  stopLoop("tense", FADE_DURATION);
  currentMood = null;
}

// ── Low-level synth helpers (SFX) ─────────────────────────────────────────────

function osc(freq, type = "sine", gainVal = 0.3, duration = null) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gainVal;
  o.connect(g); g.connect(masterGain);
  o.start();
  if (duration) {
    g.gain.setTargetAtTime(0, c.currentTime + duration * 0.8, duration * 0.1);
    o.stop(c.currentTime + duration + 0.1);
  }
  return { osc: o, gain: g };
}

// ── One-shot SFX ──────────────────────────────────────────────────────────────

export function sfxKill() {
  const c = getCtx();
  const n = osc(120, "square", 0.25, 0.12);
  n.osc.frequency.setTargetAtTime(40, c.currentTime, 0.04);
}

export function sfxBuildingHit() {
  const c = getCtx();
  const n = osc(200, "sawtooth", 0.15, 0.18);
  n.osc.frequency.setTargetAtTime(80, c.currentTime, 0.06);
}

export function sfxBuildingFall() {
  const c = getCtx();
  [60, 80, 100, 55].forEach((freq, i) => {
    setTimeout(() => {
      const n = osc(freq, "sawtooth", 0.2, 0.35);
      n.osc.frequency.setTargetAtTime(20, c.currentTime, 0.1);
    }, i * 30);
  });
}

export function sfxPlaceBuilding() {
  osc(180, "triangle", 0.2, 0.15);
  setTimeout(() => osc(660, "sine", 0.08, 0.3), 60);
}

export function sfxPurchaseUpgrade() {
  osc(330, "sine", 0.12, 0.2);
  setTimeout(() => osc(440, "sine", 0.1, 0.25), 100);
  setTimeout(() => osc(550, "sine", 0.08, 0.3), 200);
}

export function sfxWaveStart() {
  const c = getCtx();
  const n = osc(220, "sawtooth", 0.3, 0.6);
  n.osc.frequency.setTargetAtTime(110, c.currentTime + 0.1, 0.2);
}

export function sfxWaveClear() {
  [330, 440, 550, 660].forEach((freq, i) => {
    setTimeout(() => osc(freq, "sine", 0.1, 0.4), i * 80);
  });
}

export function sfxWorkerDeath() {
  osc(280, "sine", 0.15, 0.2);
}

export function sfxBuilderDanger() {
  const c = getCtx();
  const n = osc(880, "square", 0.1, 0.1);
  n.osc.frequency.setTargetAtTime(440, c.currentTime + 0.05, 0.04);
}

export function sfxHeal() {
  osc(440, "sine", 0.05, 0.25);
}

export function sfxPing() {
  const c = getCtx();
  // Two-tone sonar blip
  osc(880, "sine", 0.12, 0.08);
  setTimeout(() => {
    const n = osc(1320, "sine", 0.07, 0.18);
    n.osc.frequency.setTargetAtTime(660, c.currentTime + 0.05, 0.06);
  }, 55);
}