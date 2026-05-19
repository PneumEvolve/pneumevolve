// src/Pages/Stronghold/audio.js
// Web Audio API sound engine — cozy build phase, tense wave phase.
// No files needed — everything is synthesized.

let ctx = null;
let masterGain = null;
let ambienceNodes = null;
let currentMood = null; // "cozy" | "tense"
let initialized = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

// ── Low-level synth helpers ───────────────────────────────────────────────────

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

function stopNode(node, fadeTime = 1.5) {
  if (!node) return;
  try {
    const c = getCtx();
    node.gain.gain.setTargetAtTime(0, c.currentTime, fadeTime * 0.3);
    node.osc.stop(c.currentTime + fadeTime);
  } catch {}
}

// ── Cozy ambience — warm pad, gentle and pleasant ────────────────────────────

function buildCozyAmbience() {
  const c = getCtx();
  const nodes = [];

  // Root pad — soft sine at a comfortable mid register (not sub-bass)
  const root = osc(220, "sine", 0.10);
  nodes.push(root);

  // Perfect fifth above root — always consonant, never beating annoyingly
  const fifth = osc(330, "sine", 0.07);
  nodes.push(fifth);

  // Octave — very soft, adds body
  const octave = osc(440, "sine", 0.04);
  nodes.push(octave);

  // Very slow volume swell on root (0.12 Hz = ~8 sec cycle) — barely perceptible
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(root.gain);
  lfo.start();
  nodes.push({ osc: lfo, gain: lfoGain });

  // Soft high shimmer — very quiet, adds air
  const shimmer = osc(880, "sine", 0.008);
  nodes.push(shimmer);

  return nodes;
}

// ── Tense ambience — rumble + dissonant upper tone ────────────────────────────

function buildTenseAmbience() {
  const c = getCtx();
  const nodes = [];

  // Low rumble — slightly detuned unison
  const r1 = osc(40, "sawtooth", 0.08);
  const r2 = osc(41.2, "sawtooth", 0.07);
  nodes.push(r1, r2);

  // Dissonant mid — tritone above root
  const mid = osc(56.6, "triangle", 0.05); // tritone (40 * 2^(6/12))
  nodes.push(mid);

  // Fast tremolo on mid — urgency
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 6;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(mid.gain);
  lfo.start();
  nodes.push({ osc: lfo, gain: lfoGain });

  // High nervous shimmer
  const shimmer = osc(880, "sine", 0.008);
  const shimmerLfo = c.createOscillator();
  const shimmerLfoGain = c.createGain();
  shimmerLfo.frequency.value = 3.5;
  shimmerLfoGain.gain.value = 0.006;
  shimmerLfo.connect(shimmerLfoGain);
  shimmerLfoGain.connect(shimmer.gain);
  shimmerLfo.start();
  nodes.push(shimmer, { osc: shimmerLfo, gain: shimmerLfoGain });

  return nodes;
}

function stopAmbience() {
  if (!ambienceNodes) return;
  ambienceNodes.forEach(n => stopNode(n, 1.2));
  ambienceNodes = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initAudio() {
  if (initialized) return;
  initialized = true;
  getCtx();
}

export function setMood(mood) {
  if (mood === currentMood) return;
  currentMood = mood;
  stopAmbience();
  if (mood === "cozy")  ambienceNodes = buildCozyAmbience();
  if (mood === "tense") ambienceNodes = buildTenseAmbience();
}

export function stopAllAudio() {
  stopAmbience();
  currentMood = null;
}

// ── One-shot SFX ──────────────────────────────────────────────────────────────

export function sfxKill() {
  // Short percussive thud
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
  // Rumbling crash — low noise burst
  const c = getCtx();
  [60, 80, 100, 55].forEach((freq, i) => {
    setTimeout(() => {
      const n = osc(freq, "sawtooth", 0.2, 0.35);
      n.osc.frequency.setTargetAtTime(20, c.currentTime, 0.1);
    }, i * 30);
  });
}

export function sfxPlaceBuilding() {
  // Warm thunk + short high chime
  const c = getCtx();
  osc(180, "triangle", 0.2, 0.15);
  setTimeout(() => osc(660, "sine", 0.08, 0.3), 60);
}

export function sfxPurchaseUpgrade() {
  // Ascending two-tone
  const c = getCtx();
  osc(330, "sine", 0.12, 0.2);
  setTimeout(() => osc(440, "sine", 0.1, 0.25), 100);
  setTimeout(() => osc(550, "sine", 0.08, 0.3), 200);
}

export function sfxWaveStart() {
  // Harsh descending horn
  const c = getCtx();
  const n = osc(220, "sawtooth", 0.3, 0.6);
  n.osc.frequency.setTargetAtTime(110, c.currentTime + 0.1, 0.2);
}

export function sfxWaveClear() {
  // Soft ascending bells
  [330, 440, 550, 660].forEach((freq, i) => {
    setTimeout(() => osc(freq, "sine", 0.1, 0.4), i * 80);
  });
}

export function sfxWorkerDeath() {
  // Soft hollow pop
  osc(280, "sine", 0.15, 0.2);
}

export function sfxBuilderDanger() {
  // Sharp alarm ping
  const c = getCtx();
  const n = osc(880, "square", 0.1, 0.1);
  n.osc.frequency.setTargetAtTime(440, c.currentTime + 0.05, 0.04);
}

export function sfxHeal() {
  // Gentle ascending sine
  osc(440, "sine", 0.05, 0.25);
}