// src/Pages/Firefly/PlayerOneView.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { useFireflyRoom } from "./useFireflyRoom";
import { generateMap, updateFireflies, moveWithSlide, circleOverlap, randomOpenPos } from "./gameEngine";

const WORLD           = 2400;
const PLAYER_SPEED    = 180;
const ZOMBIE_SPEED    = 90;
const COLLECT_R       = 18;
const ZOMBIE_HIT_R    = 28;
const PLAYER_R        = 10;
const GAME_DURATION   = 180;
const ZOMBIE_SPAWN    = 90;    // halfway through
const FIREFLY_LIGHT   = 72;
const MOVE_THROTTLE   = 50;
const MAX_HP          = 3;
const INVINCIBLE_SECS = 1.5;
const MUSHROOM_SECS   = 4;
const ZOMBIE_RESPAWN  = 15;
const SPIKE_PENALTY   = 1;

function makeRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ── Sound engine (Web Audio, no files needed) ─────────────────────────────────
function createSoundEngine() {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Pre-warm the AudioContext on first user gesture so growl works immediately
  function unlock() {
    try { getCtx(); } catch {}
  }

  function playCollect() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.4);
    } catch {}
  }

  function playPing() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.15);
      gain.gain.setValueAtTime(0.14, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
    } catch {}
  }

  function playHit() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.3);
      gain.gain.setValueAtTime(0.22, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.3);
    } catch {}
  }

  let growlNodes = null;
  function updateGrowl(proximity) {
    try {
      const ac = getCtx();
      if (!growlNodes) {
        const osc1 = ac.createOscillator(), osc2 = ac.createOscillator();
        const gain = ac.createGain(), lfo = ac.createOscillator(), lfoGain = ac.createGain();
        // Softer: sine + triangle instead of sawtooth + square, lower frequencies
        osc1.type = "sine";     osc1.frequency.value = 42;
        osc2.type = "triangle"; osc2.frequency.value = 44;
        // Slower, gentler LFO — more "distant rumble" than "buzz"
        lfo.type  = "sine";     lfo.frequency.value  = 1.2;
        lfoGain.gain.value = 4;
        lfo.connect(lfoGain); lfoGain.connect(osc1.frequency);
        osc1.connect(gain); osc2.connect(gain); gain.connect(ac.destination);
        gain.gain.value = 0;
        osc1.start(); osc2.start(); lfo.start();
        growlNodes = { osc1, osc2, gain, lfo };
      }
      // Max volume 0.18 with slower attack (0.6s time constant)
      growlNodes.gain.gain.setTargetAtTime(proximity * 0.18, getCtx().currentTime, 0.6);
    } catch {}
  }

  function stopGrowl() {
    try {
      if (growlNodes) {
        growlNodes.osc1.stop(); growlNodes.osc2.stop(); growlNodes.lfo.stop();
        growlNodes = null;
      }
    } catch {}
  }

  return { playCollect, playPing, playHit, updateGrowl, stopGrowl, unlock,
    playZombieKill() {
      try {
        const ac = getCtx();
        // Descending zap — high to low, short and punchy
        const osc  = ac.createOscillator(), gain = ac.createGain();
        const osc2 = ac.createOscillator(), gain2 = ac.createGain();
        osc.connect(gain);   gain.connect(ac.destination);
        osc2.connect(gain2); gain2.connect(ac.destination);
        osc.type  = "sawtooth";
        osc.frequency.setValueAtTime(480, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.35);
        gain.gain.setValueAtTime(0.18, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
        osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.35);
        // Layered shimmer
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(900, ac.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.25);
        gain2.gain.setValueAtTime(0.10, ac.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
        osc2.start(ac.currentTime); osc2.stop(ac.currentTime + 0.25);
      } catch {}
    },
  };
}

export default function PlayerOneView({ room, onGameOver }) {
  const canvasRef          = useRef(null);
  const stateRef           = useRef(null);
  const keysRef            = useRef({});
  const joystickRef        = useRef({ active: false, vec: { x: 0, y: 0 }, origin: { x: 0, y: 0 } });
  const rafRef             = useRef(null);
  const lastMoveRef        = useRef(0);
  const lastZombieRef      = useRef(0);
  const lastFireflySyncRef = useRef(0);
  const lightCanvasRef     = useRef(null);
  const soundRef           = useRef(null);

  // ── Realtime handlers ─────────────────────────────────────────────────────
  const handlers = useCallback({
    onPing: ({ x, y }) => {
      if (!stateRef.current) return;
      stateRef.current.pings.push({ x, y, expiresAt: Date.now() + 3000 });
      soundRef.current?.playPing();
    },
    onChat: ({ text, from }) => {
      if (!stateRef.current) return;
      stateRef.current.chatMessages.unshift({ text, from, ts: Date.now() });
      if (stateRef.current.chatMessages.length > 20) stateRef.current.chatMessages.pop();
    },
    onZombieKill: () => {
      if (!stateRef.current) return;
      stateRef.current.zombie = null;
      stateRef.current.zombieRespawnIn = ZOMBIE_RESPAWN;
      stateRef.current.savedFlash = 1;
      soundRef.current?.playZombieKill();
      soundRef.current?.updateGrowl(0);
    },
  }, []);

  const { sendPlayerMove, sendFireflySync, sendZombieUpdate, sendScoreUpdate, sendGameOver } =
    useFireflyRoom(room?.id ?? null, handlers);

  // ── Init ──────────────────────────────────────────────────────────────────
  function initState() {
    const map = generateMap(room.map_seed);
    return {
      player:          { x: WORLD / 2, y: WORLD / 2 },
      zombie:          null,
      zombieRespawnIn: 0,
      walls:           map.walls,
      fireflies:       map.fireflies,
      mushrooms:       map.mushrooms,
      holes:           map.holes,
      spikes:          map.spikes,
      score:           0,
      timeLeft:        GAME_DURATION,
      lastTime:        performance.now(),
      hp:              MAX_HP,
      invincible:      0,
      mushroomEffect:  0,
      hitFlash:        0,
      mushroomFlash:   0,
      holeFlash:       0,
      zombieSpawned:   false,
      pings:           [],
      chatMessages:    [],
      over:            false,
      savedFlash:      0,   // brief "navigator saved you!" message
      teleportRand:    makeRand(room.map_seed + 99),
    };
  }

  // ── Light map ─────────────────────────────────────────────────────────────
  function buildLightMap(lightCtx, fireflies, player, t, W, H) {
    lightCtx.fillStyle = "rgba(8,12,20,1)";
    lightCtx.fillRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "destination-out";

    const pg = lightCtx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 18);
    pg.addColorStop(0, "rgba(0,0,0,0.35)");
    pg.addColorStop(1, "rgba(0,0,0,0)");
    lightCtx.fillStyle = pg;
    lightCtx.beginPath(); lightCtx.arc(W/2, H/2, 18, 0, Math.PI * 2); lightCtx.fill();

    fireflies.forEach(f => {
      if (f.collected) return;
      const sx = W/2 + (f.x - player.x);
      const sy = H/2 + (f.y - player.y);
      if (sx < -FIREFLY_LIGHT || sx > W + FIREFLY_LIGHT || sy < -FIREFLY_LIGHT || sy > H + FIREFLY_LIGHT) return;
      const pulsed = 0.7 + 0.3 * Math.sin(t * 2.5 + f.pulse);
      const r = FIREFLY_LIGHT * pulsed;
      const grad = lightCtx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, "rgba(0,0,0,0.92)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.7)");
      grad.addColorStop(0.75, "rgba(0,0,0,0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      lightCtx.fillStyle = grad;
      lightCtx.beginPath(); lightCtx.arc(sx, sy, r, 0, Math.PI * 2); lightCtx.fill();
    });

    lightCtx.globalCompositeOperation = "source-over";
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(ctx, lightCtx, state, t, W, H) {
    const { player, zombie, walls, fireflies, spikes, holes, hitFlash, mushroomFlash, holeFlash, pings, hp, mushroomEffect } = state;

    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, W, H);

    walls.forEach(w => {
      const sx = W/2 + (w.x - player.x);
      const sy = H/2 + (w.y - player.y);
      if (sx > W+10 || sy > H+10 || sx+w.w < -10 || sy+w.h < -10) return;
      ctx.fillStyle = "#1a2235";
      ctx.fillRect(sx, sy, w.w, w.h);
      ctx.strokeStyle = "#2e4060"; ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, w.w, w.h);
    });

    spikes.forEach(s => {
      const sx = W/2 + (s.x - player.x);
      const sy = H/2 + (s.y - player.y);
      if (sx < -30 || sx > W+30 || sy < -30 || sy > H+30) return;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.translate(sx, sy);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
        ctx.strokeStyle = "#cc4444"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5555"; ctx.fill();
      ctx.restore();
    });

    holes.forEach(h => {
      const sx = W/2 + (h.x - player.x);
      const sy = H/2 + (h.y - player.y);
      if (sx < -40 || sx > W+40 || sy < -40 || sy > H+40) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(sx, sy, h.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#000000"; ctx.fill();
      ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, h.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    });

    fireflies.forEach(f => {
      if (f.collected) return;
      const sx = W/2 + (f.x - player.x);
      const sy = H/2 + (f.y - player.y);
      if (sx < -20 || sx > W+20 || sy < -20 || sy > H+20) return;
      const pulsed = 0.55 + 0.45 * Math.sin(t * 2.5 + f.pulse);
      ctx.save();
      ctx.globalAlpha = 0.22 * pulsed;
      ctx.beginPath(); ctx.arc(sx, sy, f.size+6, 0, Math.PI*2);
      ctx.fillStyle = "rgba(180,255,100,1)"; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.9 * pulsed;
      ctx.beginPath(); ctx.arc(sx, sy, f.size, 0, Math.PI*2);
      ctx.fillStyle = "rgba(220,255,160,1)"; ctx.fill();
      ctx.restore();
    });

    if (zombie) {
      const sx = W/2 + (zombie.x - player.x);
      const sy = H/2 + (zombie.y - player.y);
      if (sx > -20 && sx < W+20 && sy > -20 && sy < H+20) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,60,60,0.25)"; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2);
        ctx.fillStyle = "#ff4444"; ctx.fill();
        ctx.restore();
      }
    }

    const now = Date.now();
    state.pings = pings.filter(p => p.expiresAt > now);

    state.pings.forEach(p => {
      const sx = W/2 + (p.x - player.x);
      const sy = H/2 + (p.y - player.y);
      const age = 1 - (p.expiresAt - now) / 3000;
      const lightR = 55 * (1 - age * 0.4);
      lightCtx.globalCompositeOperation = "destination-out";
      const grad = lightCtx.createRadialGradient(sx, sy, 0, sx, sy, lightR);
      grad.addColorStop(0, "rgba(0,0,0,0.85)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      lightCtx.fillStyle = grad;
      lightCtx.beginPath(); lightCtx.arc(sx, sy, lightR, 0, Math.PI*2); lightCtx.fill();
      lightCtx.globalCompositeOperation = "source-over";
    });

    buildLightMap(lightCtx, fireflies, player, t, W, H);
    ctx.drawImage(lightCtx.canvas, 0, 0);

    state.pings.forEach(p => {
      const sx = W/2 + (p.x - player.x);
      const sy = H/2 + (p.y - player.y);
      const age = 1 - (p.expiresAt - now) / 3000;
      const onScreen = sx > -20 && sx < W+20 && sy > -20 && sy < H+20;
      if (onScreen) {
        const radius = 10 + age * 22;
        ctx.save();
        ctx.globalAlpha = (1 - age) * 0.95;
        ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255,220,80,1)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,220,80,1)"; ctx.fill();
        ctx.restore();
      } else {
        const margin = 28;
        const dx = sx - W/2, dy = sy - H/2;
        const angle = Math.atan2(dy, dx);
        const ex = Math.max(margin, Math.min(W-margin, W/2 + Math.cos(angle) * (W/2 - margin)));
        const ey = Math.max(margin, Math.min(H-margin, H/2 + Math.sin(angle) * (H/2 - margin)));
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - age * 0.5);
        ctx.translate(ex, ey); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-6,-6); ctx.lineTo(-6,6); ctx.closePath();
        ctx.fillStyle = "rgba(255,220,80,1)"; ctx.fill();
        ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    });

    const cx2 = W/2, cy2 = H/2;
    if (hitFlash > 0) {
      ctx.save(); ctx.globalAlpha = hitFlash * 0.4;
      ctx.beginPath(); ctx.arc(cx2, cy2, 40, 0, Math.PI*2);
      ctx.fillStyle = "#ff3333"; ctx.fill(); ctx.restore();
    }
    if (holeFlash > 0) {
      ctx.save(); ctx.globalAlpha = holeFlash * 0.5;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (mushroomFlash > 0 || mushroomEffect > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.35, mushroomFlash * 0.5 + (mushroomEffect > 0 ? 0.15 : 0));
      const grad = ctx.createRadialGradient(cx2, cy2, W*0.2, cx2, cy2, W*0.8);
      grad.addColorStop(0, "rgba(120,0,180,0)");
      grad.addColorStop(1, "rgba(120,0,180,1)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    const pulse = 0.8 + 0.2 * Math.sin(t * 3);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx2, cy2, 10 * pulse, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, Math.PI*2);
    ctx.fillStyle = mushroomEffect > 0 ? "rgba(200,100,255,0.95)" : "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${state.score} ✦`, 18, 36);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    const m = Math.floor(state.timeLeft / 60);
    const s = Math.floor(state.timeLeft % 60);
    ctx.fillText(`${m}:${String(s).padStart(2,"0")}`, 18, 56);
    for (let i = 0; i < MAX_HP; i++) {
      ctx.beginPath(); ctx.arc(18 + i * 16, 72, 5, 0, Math.PI*2);
      ctx.fillStyle = i < hp ? "rgba(100,220,255,0.9)" : "rgba(255,255,255,0.15)";
      ctx.fill();
    }
    ctx.restore();

    if (mushroomEffect > 0) {
      ctx.save();
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(200,100,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(`controls reversed — ${mushroomEffect.toFixed(1)}s`, W/2, H - 55);
      ctx.restore();
    }

    if (state.zombieRespawnIn > 0) {
      ctx.save();
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "center";
      ctx.fillText(`zombie respawns in ${Math.ceil(state.zombieRespawnIn)}s`, W/2, H - 38);
      ctx.restore();
    }

    if (zombie) {
      const dx = zombie.x - player.x, dy = zombie.y - player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 220) {
        ctx.save();
        ctx.font = "12px sans-serif";
        ctx.fillStyle = `rgba(255,80,80,${Math.max(0, 1 - dist/220) * 0.9})`;
        ctx.textAlign = "right";
        ctx.fillText("⚠ zombie nearby", W - 18, 32);
        ctx.restore();
      }
    }

    if (state.chatMessages.length > 0) {
      const msg = state.chatMessages[0];
      const age = (Date.now() - msg.ts) / 1000;
      if (age < 5) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age/5);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "center";
        ctx.fillText(`${msg.from}: ${msg.text}`, W/2, H - 30);
        ctx.restore();
      }
    }

    if (state.savedFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.savedFlash * 1.5);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "rgba(255,120,120,0.95)";
      ctx.textAlign = "center";
      ctx.fillText("navigator killed the zombie ✦", W/2, H/2 - 40);
      ctx.restore();
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!stateRef.current || !canvasRef.current) return;
    const state = stateRef.current;
    if (state.over) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const t = ts / 1000;

    if (!lightCanvasRef.current || lightCanvasRef.current.width !== W) {
      const lc = document.createElement("canvas");
      lc.width = W; lc.height = H;
      lightCanvasRef.current = lc;
    }
    const lightCtx = lightCanvasRef.current.getContext("2d");

    const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
    state.lastTime = ts;
    state.timeLeft = Math.max(0, state.timeLeft - dt);

    if (state.hitFlash > 0)       state.hitFlash      = Math.max(0, state.hitFlash - dt * 3);
    if (state.mushroomFlash > 0)  state.mushroomFlash = Math.max(0, state.mushroomFlash - dt * 3);
    if (state.holeFlash > 0)      state.holeFlash     = Math.max(0, state.holeFlash - dt * 4);
    if (state.invincible > 0)     state.invincible    = Math.max(0, state.invincible - dt);
    if (state.mushroomEffect > 0) state.mushroomEffect = Math.max(0, state.mushroomEffect - dt);
    if (state.savedFlash > 0)     state.savedFlash    = Math.max(0, state.savedFlash - dt * 0.4);

    if (state.zombieRespawnIn > 0) {
      state.zombieRespawnIn = Math.max(0, state.zombieRespawnIn - dt);
      if (state.zombieRespawnIn === 0) {
        state.zombie = {
          x: state.player.x + (Math.random() > 0.5 ? 420 : -420),
          y: state.player.y + (Math.random() > 0.5 ? 420 : -420),
        };
      }
    }

    if (!state.zombieSpawned && state.timeLeft <= ZOMBIE_SPAWN) {
      state.zombieSpawned = true;
      state.zombie = {
        x: state.player.x + (Math.random() > 0.5 ? 400 : -400),
        y: state.player.y + (Math.random() > 0.5 ? 400 : -400),
      };
    }

    if (state.timeLeft <= 0) {
      state.over = true;
      soundRef.current?.stopGrowl();
      onGameOver(state.score);
      return;
    }

    // ── Player movement ──────────────────────────────────────────────────
    const keys = keysRef.current;
    const joy  = joystickRef.current;
    let vx = 0, vy = 0;
    if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
    if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
    if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
    if (joy.active) { vx += joy.vec.x; vy += joy.vec.y; }
    if (state.mushroomEffect > 0) { vx = -vx; vy = -vy; }

    const len = Math.sqrt(vx*vx + vy*vy);
    if (len > 0) {
      vx /= len; vy /= len;
      state.player = moveWithSlide(state.player.x, state.player.y, vx, vy, dt, PLAYER_SPEED, PLAYER_R, state.walls);
    }

    if (ts - lastMoveRef.current > MOVE_THROTTLE) {
      sendPlayerMove(state.player.x, state.player.y);
      lastMoveRef.current = ts;
    }

    // ── Fireflies ────────────────────────────────────────────────────────
    const prevScore = state.score;
    updateFireflies(state.fireflies, state.player, dt, COLLECT_R);
    state.score = state.fireflies.filter(f => f.collected).length;
    if (state.score !== prevScore) {
      soundRef.current?.playCollect();
      sendScoreUpdate(state.score, state.score - prevScore);
    }
    if (ts - lastFireflySyncRef.current > 100) {
      sendFireflySync(state.fireflies.map(f => ({ id: f.id, x: f.x, y: f.y, pulse: f.pulse, size: f.size, collected: f.collected })));
      lastFireflySyncRef.current = ts;
    }

    // ── Zombie ───────────────────────────────────────────────────────────
    if (state.zombie) {
      const dx = state.player.x - state.zombie.x;
      const dy = state.player.y - state.zombie.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist > 0) {
        state.zombie.x += (dx / dist) * ZOMBIE_SPEED * dt;
        state.zombie.y += (dy / dist) * ZOMBIE_SPEED * dt;
      }

      if (ts - lastZombieRef.current > MOVE_THROTTLE) {
        sendZombieUpdate(state.zombie.x, state.zombie.y);
        lastZombieRef.current = ts;
      }

      // Proximity growl — 0 at 600px, full at 80px
      const proximity = Math.max(0, Math.min(1, (600 - dist) / 520));
      soundRef.current?.updateGrowl(proximity);

      // Zombie hits player
      if (dist < ZOMBIE_HIT_R && state.invincible === 0) {
        state.hitFlash   = 1;
        state.invincible = INVINCIBLE_SECS;
        state.hp         = 0;
        soundRef.current?.playHit();
      }

      // ── Zombie falls in hole ────────────────────────────────────────────
      // Use for...of + break so we stop the moment zombie is nulled.
      // A forEach would keep iterating and crash reading .x on null.
      for (const h of state.holes) {
        if (!state.zombie) break;                          // ← guard: already fell in
        if (circleOverlap(state.zombie.x, state.zombie.y, 8, h.x, h.y, h.radius)) {
          state.zombie = null;
          state.zombieRespawnIn = ZOMBIE_RESPAWN;
          soundRef.current?.updateGrowl(0);
          break;                                           // ← stop iterating immediately
        }
      }
    } else {
      soundRef.current?.updateGrowl(0);
    }

    // ── Mushrooms ────────────────────────────────────────────────────────
    if (state.invincible === 0) {
      state.mushrooms.forEach(m => {
        if (circleOverlap(state.player.x, state.player.y, PLAYER_R, m.x, m.y, m.radius)) {
          state.mushroomEffect = MUSHROOM_SECS;
          state.mushroomFlash  = 1;
          state.invincible     = INVINCIBLE_SECS;
          soundRef.current?.playHit();
        }
      });
    }

    // ── Holes (player) ───────────────────────────────────────────────────
    if (state.invincible === 0) {
      for (const h of state.holes) {
        if (circleOverlap(state.player.x, state.player.y, PLAYER_R * 0.6, h.x, h.y, h.radius * 0.7)) {
          const pos = randomOpenPos(state.walls, state.teleportRand);
          state.player     = pos;
          state.holeFlash  = 1;
          state.hp         = Math.max(0, state.hp - 1);
          state.invincible = INVINCIBLE_SECS;
          soundRef.current?.playHit();
          break;
        }
      }
    }

    // ── Spike traps ──────────────────────────────────────────────────────
    if (state.invincible === 0) {
      for (const s of state.spikes) {
        if (circleOverlap(state.player.x, state.player.y, PLAYER_R, s.x, s.y, s.radius)) {
          state.hp         = Math.max(0, state.hp - SPIKE_PENALTY);
          state.hitFlash   = 1;
          state.invincible = INVINCIBLE_SECS;
          soundRef.current?.playHit();
          break;
        }
      }
    }

    // ── Zombie hits spikes ────────────────────────────────────────────────
    if (state.zombie) {
      for (const s of state.spikes) {
        if (!state.zombie) break;
        if (circleOverlap(state.zombie.x, state.zombie.y, 10, s.x, s.y, s.radius)) {
          state.zombie = null;
          state.zombieRespawnIn = ZOMBIE_RESPAWN;
          soundRef.current?.playZombieKill();
          soundRef.current?.updateGrowl(0);
          break;
        }
      }
    }

    // ── HP = 0 ───────────────────────────────────────────────────────────
    if (state.hp <= 0) {
      state.hp         = MAX_HP;
      state.hitFlash   = 1;
      state.invincible = INVINCIBLE_SECS;
      state.score      = Math.max(0, state.score - 3);
      sendScoreUpdate(state.score, -3);
      let toRestore = 3;
      for (let i = state.fireflies.length - 1; i >= 0 && toRestore > 0; i--) {
        if (state.fireflies[i].collected) { state.fireflies[i].collected = false; toRestore--; }
      }
      state.player = { x: WORLD / 2, y: WORLD / 2 };
      if (state.zombie) {
        state.zombie = {
          x: WORLD / 2 + (Math.random() > 0.5 ? 450 : -450),
          y: WORLD / 2 + (Math.random() > 0.5 ? 450 : -450),
        };
      }
    }

    draw(ctx, lightCtx, state, t, W, H);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Setup / teardown ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;

    soundRef.current = createSoundEngine();

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (lightCanvasRef.current) {
        lightCanvasRef.current.width  = canvas.width;
        lightCanvasRef.current.height = canvas.height;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    rafRef.current = requestAnimationFrame(loop);

    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    }
    function onKeyUp(e) { keysRef.current[e.key] = false; }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      soundRef.current?.stopGrowl();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [room]);

  // ── Touch joystick ────────────────────────────────────────────────────────
  function onTouchStart(e) {
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundRef.current?.unlock();
    if (touch.clientX > canvas.offsetWidth / 2 || touch.clientY < canvas.offsetHeight / 2) return;
    e.preventDefault();
    joystickRef.current = { active: true, origin: { x: touch.clientX, y: touch.clientY }, vec: { x: 0, y: 0 } };
  }
  function onTouchMove(e) {
    if (!joystickRef.current.active) return;
    e.preventDefault();
    const touch  = e.touches[0];
    const origin = joystickRef.current.origin;
    const dx = touch.clientX - origin.x, dy = touch.clientY - origin.y;
    const dist = Math.sqrt(dx*dx + dy*dy), maxR = 40, angle = Math.atan2(dy, dx);
    joystickRef.current.vec = {
      x: Math.cos(angle) * Math.min(dist, maxR) / maxR,
      y: Math.sin(angle) * Math.min(dist, maxR) / maxR,
    };
  }
  function onTouchEnd(e) {
    e.preventDefault();
    joystickRef.current = { active: false, vec: { x: 0, y: 0 }, origin: { x: 0, y: 0 } };
  }

  return (
    <div style={{ width: "100%", height: "100svh", background: "#080c14", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    </div>
  );
}