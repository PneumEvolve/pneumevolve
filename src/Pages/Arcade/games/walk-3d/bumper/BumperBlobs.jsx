// src/Pages/Arcade/games/walk-3d/bumper/BumperBlobs.jsx
//
// Bumper Blobs (and Hot Potato) — 3D party games started from game pads in the 3D Tester world.
//
// mode="potato" turns it into Hot Potato: no crumbling, a fizzing bomb starts
// with one blob, bumping passes it, and whoever holds it at BOOM loses the round.
// Falling off just pops you back in the middle — holding the bomb.
// Your customized blob vs your partner's (or a CPU blob when you're alone) on a
// floating hexagon platform that crumbles from the outside in. Slide, DASH and
// bump each other off. First to 3 rounds wins.
//
//   bumperSim.js   the rules (arena, crumbling, sliding, dashing, bumps, CPU)
//   this file      3D scene, controls, netcode, scoreboard
//
// Props (from Walk3D):
//   net, host (true on the device that started it), look, partnerLook,
//   myName, partnerName, myColor, partnerColor, onExit
//
// Netcode (like Critter Stampede: everyone moves their own blob, the host decides the rest)
//   guest → host  bb_join { look } · bb_me {...} ~20/s volatile · bb_fell { rd } · bb_leave
//   host → guest  bb_state {...} ~15/s volatile · bb_bump { vx, vz, px, pz } · bb_fx { k, dur }
//   (Hot Potato adds to bb_state: ho = bomb holder slot, fz = how close the fuse is, bm = boomed)
//
// Controls: WASD / arrows + Space (or Shift) to dash · touch: joystick + DASH button.

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useArcadeEvent } from "../../../net/useArcadeRoom";
import { C } from "../../../ui";
import { makeAvatar, DEFAULT_LOOK } from "../avatar3d";
import { sfx, unlockSfx, isMuted, setMuted } from "../sfx";
import {
  T, makeArena, tileAt, tileSolid, tileShaking, safeSpot, makeBlob, stepBlob, bump, cpuInput, cpuPotatoInput,
  mulberry, radiusOf, SPAWNS,
} from "./bumperSim";

const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;
const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
};
const TILE_COLORS = ["#ffd65a", "#ff9ec4", "#9fe0ff", "#b9f5a0", "#d7b8ff", "#ffc48a"];

export default function BumperBlobs({ net, host, look, partnerLook, myName, partnerName, myColor, partnerColor, onExit, mode = "bumper" }) {
  const mySlot = host ? 0 : 1;
  const POTATO = mode === "potato";
  const EV = POTATO ? "hp_" : "bb_";        // separate message names so the two games never mix
  const ev = (name) => EV + name;
  const [ui, setUi] = useState({ ph: "ready", rd: 1, sc: [0, 0], countdown: 0, banner: null, win: null, opp: "cpu", guestJoined: false, oppName: partnerName });
  const [muted, setMutedUi] = useState(isMuted());

  const keysRef = useRef({});
  const stickRef = useRef({ x: 0, y: 0, active: false });
  const dashRef = useRef(false);
  const mountRef = useRef(null);

  // Host-only match state. Guests mirror it from bb_state.
  const matchRef = useRef({
    ph: "ready", t: 0, rt: 0, rd: 1, sc: [0, 0], seed: 1, opp: "cpu", win: null, roundWin: null,
    pu: [], bn: [], nextId: 1, puCd: T.POWERUP_FIRST, bnCd: T.BANANA_FIRST, bumpCd: 0,
    holder: 0, fuse: 15, fuseT: 0, passCd: 0, boom: false,           // Hot Potato
  });
  const guestRef = useRef({ joined: false, look: partnerLook || null, blob: null, seenAt: 0 });
  const blobsRef = useRef([makeBlob(0), makeBlob(1)]);     // [slot0, slot1] — mine is blobsRef[mySlot]
  const arenaRef = useRef(makeArena(1));
  const viewRef = useRef({ got: false, rtAt: 0 });          // guest: when the last state arrived

  const live = useRef({});
  live.current = { net, host, mySlot, look, partnerName, POTATO };

  // ── Match flow (host) ──────────────────────────────────────────────────────
  const resetRound = (m) => {
    arenaRef.current = makeArena(m.seed + m.rd * 101, { crumble: !POTATO });
    blobsRef.current = [makeBlob(0), makeBlob(1)];
    m.t = 0; m.rt = 0; m.pu = []; m.bn = []; m.puCd = T.POWERUP_FIRST; m.bnCd = T.BANANA_FIRST; m.roundWin = null;
    if (POTATO) {
      const r = mulberry(m.seed + m.rd * 7);
      m.holder = r() < 0.5 ? 0 : 1; m.fuse = T.FUSE_MIN + r() * (T.FUSE_MAX - T.FUSE_MIN); m.fuseT = 0; m.passCd = 0; m.boom = false;
    }
  };
  const startMatch = (opp) => {
    const m = matchRef.current;
    Object.assign(m, { opp, sc: [0, 0], rd: 1, seed: Math.floor(Math.random() * 1e9), win: null, ph: "countdown" });
    resetRound(m);
  };
  const endRound = (winner) => {
    const m = matchRef.current;
    if (m.ph !== "play") return;
    m.sc = m.sc.map((v, i) => (i === winner ? v + 1 : v));
    m.roundWin = winner; m.ph = "roundover"; m.t = 0;
  };

  // ── Network ────────────────────────────────────────────────────────────────
  useArcadeEvent(net, ev("join"), (m) => {
    if (!live.current.host) return;
    const G = guestRef.current;
    const was = G.joined;
    G.joined = true; G.look = m.look || G.look; G.seenAt = performance.now();
    if (!was && matchRef.current.opp === "cpu" && matchRef.current.ph !== "ready") matchRef.current.ph = "ready";   // partner arrived mid CPU match: back to the start screen
  });
  useArcadeEvent(net, ev("me"), (m) => {
    if (!live.current.host) return;
    const G = guestRef.current;
    G.joined = true; G.seenAt = performance.now();
    G.blob = { x: m.x, y: m.y, z: m.z, vx: m.vx, vz: m.vz, face: m.f, dashT: m.d ? 0.1 : 0, giantT: m.g ? 1 : 0, zoomT: 0, slipT: m.sl ? 1 : 0, falling: !!m.fa, out: !!m.o, spin: m.s || 0 };
  });
  useArcadeEvent(net, ev("fell"), (m) => {
    const M = matchRef.current;
    if (!live.current.host || m.rd !== M.rd) return;
    if (POTATO) { if (M.ph === "play") { M.holder = 1; M.passCd = T.PASS_COOLDOWN; } }   // fell off → comes back holding the bomb
    else endRound(0);
  });
  useArcadeEvent(net, ev("leave"), () => {
    if (!live.current.host) return;
    guestRef.current.joined = false; guestRef.current.blob = null;
    if (matchRef.current.opp === "guest") { matchRef.current.ph = "ready"; matchRef.current.opp = "cpu"; }
  });
  useArcadeEvent(net, "partner_disconnected", () => {
    if (!live.current.host) return;
    guestRef.current.joined = false; guestRef.current.blob = null;
    if (matchRef.current.opp === "guest") { matchRef.current.ph = "ready"; matchRef.current.opp = "cpu"; }
  });
  // guest side
  useArcadeEvent(net, ev("state"), (s) => {
    if (live.current.host) return;
    const M = matchRef.current, V = viewRef.current;
    const newRound = s.rd !== M.rd || s.sd !== M.seed || (s.ph === "countdown" && M.ph !== "countdown");
    Object.assign(M, { ph: s.ph, t: s.t, rt: s.rt, rd: s.rd, sc: s.sc, seed: s.sd, opp: s.opp, win: s.win, roundWin: s.rw, pu: s.pu, bn: s.bn, holder: s.ho ?? 0, fuseFrac: s.fz || 0, boom: !!s.bm });
    if (newRound) { arenaRef.current = makeArena(s.sd + s.rd * 101, { crumble: !POTATO }); blobsRef.current[1] = makeBlob(1); }
    const h = s.h;
    if (h) {
      const b = blobsRef.current[0];
      Object.assign(b, { tx: h[0], ty: h[1], tz: h[2], face: h[3], giantT: h[4] ? 1 : 0, zoomT: h[5] ? 1 : 0, slipT: h[6] ? 1 : 0, dashT: h[7] ? 0.1 : 0, falling: !!h[8], out: !!h[9], spin: h[10] });
      if (!V.got || newRound) { b.x = h[0]; b.y = h[1]; b.z = h[2]; }
    }
    V.got = true; V.rtAt = performance.now();
  });
  useArcadeEvent(net, ev("bump"), (m) => {
    if (live.current.host) return;
    const b = blobsRef.current[1];
    b.vx += m.vx; b.vz += m.vz; b.x += m.px; b.z += m.pz;
    sfx.boing(m.s || 1);
    burst(b.x, b.z, 8, "#ffe14d");
  });
  useArcadeEvent(net, ev("fx"), (m) => {
    if (live.current.host) return;
    const b = blobsRef.current[1];
    if (m.k === "giant") { b.giantT = m.dur; sfx.pop(); }
    if (m.k === "zoom") { b.zoomT = m.dur; sfx.pop(); }
    if (m.k === "slip") { b.slipT = m.dur; sfx.slip(); }
  });

  // guest: say hi (repeat until the host is clearly sending states)
  useEffect(() => {
    if (host) return;
    const hi = () => live.current.net.send(ev("join"), { look: live.current.look });
    hi();
    const id = setInterval(() => { if (matchRef.current.ph === "ready" || !viewRef.current.got) hi(); }, 2000);
    return () => { clearInterval(id); live.current.net.send(ev("leave")); };
  }, [host]);

  // ── Keyboard + sound unlock ────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      unlockSfx();
      if (e.key === " " || e.key === "Shift") { e.preventDefault(); dashRef.current = true; return; }
      const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
    const up = (e) => { const k = KEYMAP[e.key]; if (k) delete keysRef.current[k]; };
    const blur = () => { keysRef.current = {}; };
    const tap = () => unlockSfx();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    window.addEventListener("pointerdown", tap);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur);
      window.removeEventListener("pointerdown", tap);
    };
  }, []);

  // particles live outside React; burst() is used by handlers above and the loop below
  const fxRef = useRef(null);
  const burst = (x, z, n, color, y = 0.6) => fxRef.current?.(x, z, n, color, y);

  // ── 3D scene + game loop ───────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(isTouch() ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#8fd0ff");
    scene.fog = new THREE.Fog("#8fd0ff", 30, 70);
    scene.add(new THREE.HemisphereLight("#ffffff", "#7aa0c0", 1.0));
    const sun = new THREE.DirectionalLight("#fff4e0", 1.5);
    sun.position.set(8, 20, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    // clouds drifting below and around the platform
    const cloudMat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
    const clouds = [];
    const crng = mulberry(77);
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + crng() * 1.2, 12, 10), cloudMat);
        puff.position.set(k * 1.5 - 2, crng() * 0.6, crng() * 1.2);
        g.add(puff);
      }
      const a = crng() * Math.PI * 2, d = 10 + crng() * 18;
      g.position.set(Math.cos(a) * d, -7 - crng() * 6, Math.sin(a) * d);
      g.userData.speed = 0.3 + crng() * 0.5;
      scene.add(g); clouds.push(g);
    }

    // hexagon tiles: dirt base + coloured top (rebuilt colours each round, same layout)
    const baseGeo = new THREE.CylinderGeometry(T.TILE * 0.95, T.TILE * 0.8, 0.7, 6);
    const topGeo = new THREE.CylinderGeometry(T.TILE * 0.96, T.TILE * 0.96, 0.14, 6);
    const dirtMat = new THREE.MeshLambertMaterial({ color: "#8a6440" });
    const tileMeshes = arenaRef.current.tiles.map((tl) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, dirtMat); base.position.y = -0.42; base.receiveShadow = true;
      const top = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ color: TILE_COLORS[tl.ring % TILE_COLORS.length] }));
      top.position.y = -0.07; top.receiveShadow = true;
      g.add(base, top);
      g.position.set(tl.x, 0, tl.z);
      scene.add(g);
      return { g, top, base: TILE_COLORS[tl.ring % TILE_COLORS.length], vy: 0, y: 0 };
    });

    // blobs (your 3D Tester characters)
    const avatars = [0, 1].map(slot => {
      const a = makeAvatar(DEFAULT_LOOK);
      scene.add(a.group);
      return a;
    });
    const setupAvatars = () => {
      const M = matchRef.current, L = live.current;
      const lookFor = (slot) => (slot === L.mySlot ? L.look : (M.opp === "cpu" ? { color: "#9a9a9a", hat: "tophat", eyes: "sleepy" } : (L.host ? guestRef.current.look : partnerLook) || DEFAULT_LOOK));
      const nameFor = (slot) => (slot === L.mySlot ? myName : M.opp === "cpu" ? "CPU Blob" : partnerName);
      const colorFor = (slot) => (slot === L.mySlot ? myColor : M.opp === "cpu" ? "#cccccc" : partnerColor);
      for (const slot of [0, 1]) { avatars[slot].setLook(lookFor(slot)); avatars[slot].setName(nameFor(slot), colorFor(slot)); }
    };
    let avatarKey = "";

    // power-ups + bananas (meshes keyed by id)
    const itemMeshes = new Map();
    const makeMushroom = () => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 10), new THREE.MeshLambertMaterial({ color: "#fff4e0" }));
      stem.position.y = 0.2;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#e04848", emissive: "#401010" }));
      cap.position.y = 0.38;
      g.add(stem, cap);
      for (let i = 0; i < 4; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: "#ffffff" }));
        const a = i / 4 * Math.PI * 2;
        dot.position.set(Math.cos(a) * 0.28, 0.6, Math.sin(a) * 0.28);
        g.add(dot);
      }
      return g;
    };
    const makeBolt = () => {
      const sh = new THREE.Shape();
      sh.moveTo(0.1, 0.6); sh.lineTo(-0.25, 0); sh.lineTo(0.02, 0); sh.lineTo(-0.1, -0.6); sh.lineTo(0.28, 0.08); sh.lineTo(0, 0.08); sh.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: "#6fd3ff", emissive: "#103a50" }));
      m.position.y = 0.7;
      const g = new THREE.Group(); g.add(m);
      return g;
    };
    const makeBanana = () => {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: "#ffe14d" });
      for (let i = 0; i < 3; i++) {
        const peel = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
        const a = i / 3 * Math.PI * 2;
        peel.scale.set(0.5, 0.25, 1.4);
        peel.position.set(Math.sin(a) * 0.25, 0.06, Math.cos(a) * 0.25);
        peel.rotation.y = a;
        g.add(peel);
      }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshLambertMaterial({ color: "#6b4426" }));
      tip.position.y = 0.12; g.add(tip);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      return g;
    };

    // Hot Potato bomb: black ball, fuse, flickering spark — rides above the holder's head
    const bomb = new THREE.Group();
    const bombMat = new THREE.MeshLambertMaterial({ color: "#2a2a35", emissive: "#000000" });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), bombMat); ball.castShadow = true;
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), new THREE.MeshLambertMaterial({ color: "#777" }));
    capM.position.y = 0.38;
    const fuseM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshLambertMaterial({ color: "#c9a26b" }));
    fuseM.position.set(0.05, 0.52, 0); fuseM.rotation.z = -0.4;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd65a" }));
    spark.position.set(0.12, 0.65, 0);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5 }));
    shine.position.set(-0.13, 0.15, 0.28);
    bomb.add(ball, capM, fuseM, spark, shine);
    bomb.visible = false;
    scene.add(bomb);
    let nextTick = 0, lastBoom = false;

    // particle pool
    const parts = [];
    const partGeo = new THREE.SphereGeometry(0.12, 6, 5);
    fxRef.current = (x, z, n, color, y = 0.6) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        m.position.set(x, y, z);
        m.userData = { vx: Math.cos(a) * sp, vy: 2 + Math.random() * 3, vz: Math.sin(a) * sp, life: 0.6 };
        scene.add(m); parts.push(m);
      }
    };

    if (window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.bumper = { match: matchRef, blobs: blobsRef, guest: guestRef, arena: arenaRef, renderer, startMatch, endRound };

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      // pull back on narrow/portrait screens so the whole platform fits
      const back = camera.aspect < 1 ? 1 / camera.aspect : 1;
      camera.position.set(0, 21 * back, 15 * back);
      camera.lookAt(0, -1, 1.6);
      // haze starts just past the platform, however far back the camera is
      // (in portrait the camera sits much farther away, which used to put the whole arena in the fog)
      const camDist = camera.position.distanceTo(new THREE.Vector3(0, -1, 1.6));
      scene.fog.near = camDist + 6; scene.fog.far = camDist + 45;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    let raf = 0, last = performance.now(), lastSend = 0, lastUi = 0, lastBeep = -1, lastPh = "";
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const L = live.current, M = matchRef.current, arena = arenaRef.current, blobs = blobsRef.current;
      const me = blobs[L.mySlot];
      const tSec = now / 1000;

      // ── my input (stick/keys → ground direction; camera looks toward -z)
      const k = keysRef.current, st = stickRef.current;
      let ix, iz;
      if (st.active) { ix = st.x; iz = st.y; } else { ix = (k.right ? 1 : 0) - (k.left ? 1 : 0); iz = (k.down ? 1 : 0) - (k.up ? 1 : 0); }
      const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
      const input = { x: ix, z: iz, dash: dashRef.current };
      dashRef.current = false;

      // ── host: run the match
      if (L.host) {
        M.t += dt;
        if (M.ph === "countdown" && M.t >= T.COUNTDOWN) { M.ph = "play"; M.t = 0; M.rt = 0; }
        if (M.ph === "roundover" && M.t >= T.ROUND_OVER) {
          if (Math.max(...M.sc) >= T.WIN_ROUNDS) { M.ph = "matchover"; M.win = M.sc[0] > M.sc[1] ? 0 : 1; M.t = 0; sfx.fanfare(); }
          else { M.rd += 1; M.ph = "countdown"; resetRound(M); }
        }
        if (M.ph === "play") {
          M.rt += dt;
          const rng = Math.random;
          // power-ups + bananas appear on tiles that won't fall soon
          M.puCd -= dt; M.bnCd -= dt;
          if (M.puCd <= 0) {
            if (M.pu.length < T.POWERUP_MAX) { const s = safeSpot(arena, M.rt, rng, 8); if (s) M.pu.push({ id: M.nextId++, kind: rng() < 0.5 ? "giant" : "zoom", ...s }); }
            M.puCd = T.POWERUP_EVERY;
          }
          if (M.bnCd <= 0) {
            if (M.bn.length < T.BANANA_MAX) { const s = safeSpot(arena, M.rt, rng, 6); if (s) M.bn.push({ id: M.nextId++, x: s.x + (rng() - 0.5), z: s.z + (rng() - 0.5) }); }
            M.bnCd = T.BANANA_EVERY;
          }
          // Hot Potato: the bomb holder is a bit faster; the fuse burns down
          if (POTATO) {
            blobs[0].speedMul = M.holder === 0 ? T.HOLDER_SPEED : 1;
            blobs[1].speedMul = M.holder === 1 ? T.HOLDER_SPEED : 1;
            M.fuseT += dt; M.passCd -= dt;
            if (M.fuseT >= M.fuse) {
              M.boom = true; sfx.boom();
              const lb = blobs[M.holder]; burst(lb.x, lb.z, 26, "#ff8a3d", 1); burst(lb.x, lb.z, 14, "#333333", 1);
              endRound(1 - M.holder);
            }
          }
          // move my blob, plus the CPU (or mirror the guest's)
          for (const e of stepBlob(blobs[0], input, dt, arena, M.rt, true)) { if (e === "dash") { sfx.whoosh(); burst(blobs[0].x, blobs[0].z, 5, "#ffffff", 0.3); } if (e === "fall") sfx.whistle(); }
          if (M.opp === "cpu") {
            const cpuIn = POTATO ? cpuPotatoInput(blobs[1], blobs[0], arena, M.rt, rng, M.holder === 1) : cpuInput(blobs[1], blobs[0], arena, M.rt, rng);
            for (const e of stepBlob(blobs[1], cpuIn, dt, arena, M.rt, true)) { if (e === "dash") sfx.whoosh(); if (e === "fall") sfx.whistle(); }
          } else if (guestRef.current.blob) {
            const g = guestRef.current.blob, b = blobs[1];
            const a = 1 - Math.exp(-dt * 15);
            b.x += (g.x - b.x) * a; b.z += (g.z - b.z) * a; b.y += (g.y - b.y) * a;
            Object.assign(b, { vx: g.vx, vz: g.vz, face: g.face, dashT: g.dashT, giantT: g.giantT, slipT: g.slipT, falling: g.falling, out: g.out, spin: g.spin });
          }
          // bumps
          M.bumpCd -= dt;
          if (M.bumpCd <= 0) {
            const h = bump(blobs[0], blobs[1]);
            if (h) {
              blobs[0].vx += h.a.vx; blobs[0].vz += h.a.vz; blobs[0].x += h.a.px; blobs[0].z += h.a.pz;
              if (M.opp === "cpu") { blobs[1].vx += h.b.vx; blobs[1].vz += h.b.vz; blobs[1].x += h.b.px; blobs[1].z += h.b.pz; }
              else L.net.send(ev("bump"), { vx: +h.b.vx.toFixed(2), vz: +h.b.vz.toFixed(2), px: +h.b.px.toFixed(2), pz: +h.b.pz.toFixed(2), s: +h.strength.toFixed(2) });
              sfx.boing(h.strength); burst(h.x, h.z, 8, "#ffe14d");
              M.bumpCd = 0.2;
              if (POTATO && M.passCd <= 0 && M.ph === "play") { M.holder = 1 - M.holder; M.passCd = T.PASS_COOLDOWN; sfx.pop(); burst(h.x, h.z, 10, "#ff8a3d", 1.6); }
            }
          }
          // pick-ups
          for (const slot of [0, 1]) {
            const b = blobs[slot];
            if (b.out || b.falling) continue;
            M.pu = M.pu.filter(p => {
              if (Math.hypot(b.x - p.x, b.z - p.z) > radiusOf(b) + 0.5) return true;
              if (slot === 0 || M.opp === "cpu") { if (p.kind === "giant") b.giantT = T.POWERUP_TIME; else b.zoomT = T.POWERUP_TIME; }
              else L.net.send(ev("fx"), { k: p.kind, dur: T.POWERUP_TIME });
              if (slot === 0 || M.opp === "cpu") sfx.pop();
              burst(p.x, p.z, 10, p.kind === "giant" ? "#ff5d73" : "#6fd3ff");
              return false;
            });
            M.bn = M.bn.filter(p => {
              if (Math.hypot(b.x - p.x, b.z - p.z) > radiusOf(b) * 0.8 + 0.3) return true;
              if (slot === 0 || M.opp === "cpu") { b.slipT = T.SLIP_TIME; b.vx *= 1.4; b.vz *= 1.4; sfx.slip(); }
              else L.net.send(ev("fx"), { k: "slip", dur: T.SLIP_TIME });
              return false;
            });
          }
          // falls end the round (Hot Potato: pop back in the middle holding the bomb)
          if (POTATO) {
            for (const slot of [0, 1]) {
              const b = blobs[slot];
              if (!b.out || (slot === 1 && M.opp !== "cpu")) continue;
              b.respawnIn = (b.respawnIn ?? T.RESPAWN_TIME) - dt;
              if (b.respawnIn <= 0) {
                blobs[slot] = Object.assign(makeBlob(slot), { x: 0, z: 0, y: 3, falling: true, vy: 0 });
                M.holder = slot; M.passCd = T.PASS_COOLDOWN;
              }
            }
          } else if (blobs[0].out) endRound(1);
          else if (M.opp === "cpu" && blobs[1].out) endRound(0);
        }
        // tell the guest
        if (L.net.partnerOnline && now - lastSend > 66) {
          const b = blobs[0];
          L.net.send(ev("state"), {
            ph: M.ph, t: +M.t.toFixed(2), rt: +M.rt.toFixed(2), rd: M.rd, sc: M.sc, sd: M.seed, opp: M.opp, win: M.win, rw: M.roundWin, gj: guestRef.current.joined,
            ...(POTATO ? { ho: M.holder, fz: +Math.min(1, M.fuseT / M.fuse).toFixed(2), bm: M.boom ? 1 : 0 } : {}),
            pu: M.pu, bn: M.bn,
            h: [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2), +b.face.toFixed(2), b.giantT > 0 ? 1 : 0, b.zoomT > 0 ? 1 : 0, b.slipT > 0 ? 1 : 0, b.dashT > 0 ? 1 : 0, b.falling ? 1 : 0, b.out ? 1 : 0, +b.spin.toFixed(1)],
          }, { volatile: true });
          lastSend = now;
        }
      } else {
        // ── guest: my blob moves here; the host's blob glides to where the host says
        const V = viewRef.current;
        const rt = M.ph === "play" ? M.rt + (now - V.rtAt) / 1000 : M.ph === "roundover" ? (M.drawRt || 0) : 0;
        if (M.ph === "play") {
          if (POTATO) me.speedMul = M.holder === 1 ? T.HOLDER_SPEED : 1;
          for (const e of stepBlob(me, input, dt, arena, rt, true)) {
            if (e === "dash") { sfx.whoosh(); burst(me.x, me.z, 5, "#ffffff", 0.3); }
            if (e === "fall") sfx.whistle();
          }
          if (me.out && !me.reported) { me.reported = true; L.net.send(ev("fell"), { rd: M.rd }); }
          if (POTATO && me.out) {
            me.respawnIn = (me.respawnIn ?? T.RESPAWN_TIME) - dt;
            if (me.respawnIn <= 0) blobsRef.current[1] = Object.assign(makeBlob(1), { x: 0, z: 0, y: 3, falling: true, vy: 0 });
          }
        }
        const hb = blobs[0];
        if (hb.tx != null) { const a = 1 - Math.exp(-dt * 12); hb.x += (hb.tx - hb.x) * a; hb.y += (hb.ty - hb.y) * a; hb.z += (hb.tz - hb.z) * a; }
        if (now - lastSend > 50) {
          L.net.send(ev("me"), { x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), vx: +me.vx.toFixed(2), vz: +me.vz.toFixed(2), f: +me.face.toFixed(2), d: me.dashT > 0 ? 1 : 0, g: me.giantT > 0 ? 1 : 0, sl: me.slipT > 0 ? 1 : 0, fa: me.falling ? 1 : 0, o: me.out ? 1 : 0, s: +me.spin.toFixed(1) }, { volatile: true });
          lastSend = now;
        }
        M.drawRt = rt;
      }

      // ── sounds on phase changes (both devices)
      if (M.ph !== lastPh) {
        if (M.ph === "roundover") sfx.honk();
        if (M.ph === "play") sfx.beep(true);
        if (M.ph === "matchover" && !L.host) sfx.fanfare();
        lastPh = M.ph;
      }
      if (M.ph === "countdown") {
        const n = Math.ceil(T.COUNTDOWN - M.t);
        if (n !== lastBeep && n > 0) { sfx.beep(false); lastBeep = n; }
      } else lastBeep = -1;

      // ── draw: tiles (shake, then fall)
      const rt = L.host ? M.rt : (M.drawRt || 0);
      const playing = M.ph === "play" || M.ph === "roundover";
      arena.tiles.forEach((tl, i) => {
        const tm = tileMeshes[i];
        const gone = playing && !tileSolid(tl, rt);
        if (!playing) { tm.y = 0; tm.vy = 0; tm.g.visible = true; tm.top.material.color.set(tm.base); tm.g.position.set(tl.x, 0, tl.z); return; }
        if (gone) {
          if (tm.y === 0) sfx.crack();
          tm.vy -= 30 * dt; tm.y += tm.vy * dt;
          tm.g.position.set(tl.x, tm.y, tl.z);
          tm.g.visible = tm.y > -25;
        } else if (tileShaking(tl, rt)) {
          const j = 0.06;
          tm.g.position.set(tl.x + (Math.random() - 0.5) * j, (Math.random() - 0.5) * j, tl.z + (Math.random() - 0.5) * j);
          tm.top.material.color.set(tm.base).lerp(new THREE.Color("#ff5d73"), Math.min(1, (rt - (tl.fallAt - T.SHAKE)) / T.SHAKE));
        }
      });

      // ── draw: blobs
      const key = `${M.opp}|${L.look.color}|${L.look.hat}|${L.look.eyes}|${JSON.stringify(guestRef.current.look)}`;
      if (key !== avatarKey) { setupAvatars(); avatarKey = key; }
      const showOpp = M.opp === "cpu" || (L.host ? guestRef.current.joined : true);
      for (const slot of [0, 1]) {
        const b = blobs[slot], av = avatars[slot];
        av.group.visible = !b.out && (slot === L.mySlot || showOpp) && M.ph !== "ready";
        const sc = b.giantT > 0 ? T.GIANT_SCALE : 1;
        av.group.scale.lerp(new THREE.Vector3(sc, sc, sc), 1 - Math.exp(-dt * 10));
        av.group.position.set(b.x, b.y, b.z);
        av.group.rotation.set(b.falling ? b.spin : 0, b.face + (b.slipT > 0 ? b.spin : 0), b.dashT > 0 ? 0 : 0);
        av.group.children[0].rotation.x = b.dashT > 0 ? 0.35 : 0;
        av.animate(tSec + slot, Math.hypot(b.vx || 0, b.vz || 0) > 0.8, b.falling || b.dashT > 0);
      }

      // ── Hot Potato: bomb, ticking, boom, launch
      if (L.POTATO) {
        const frac = L.host ? Math.min(1, M.fuseT / M.fuse) : (M.fuseFrac || 0);
        const holder = blobs[M.holder];
        bomb.visible = M.ph === "play" && holder && !holder.out;
        if (bomb.visible) {
          const sc = holder.giantT > 0 ? T.GIANT_SCALE : 1;
          const pulse = 1 + Math.sin(tSec * (6 + frac * 30)) * (0.05 + frac * 0.12);
          bomb.position.set(holder.x, holder.y + 2.2 * sc + Math.sin(tSec * 5) * 0.08, holder.z);
          bomb.scale.setScalar(1.4 * pulse * (0.9 + frac * 0.3));
          bomb.rotation.y = tSec * 2;
          bombMat.emissive.setRGB(frac * 0.9 * (0.6 + 0.4 * Math.sin(tSec * (8 + frac * 25))), 0, 0);
          spark.visible = Math.random() > 0.25;
          spark.scale.setScalar(0.7 + Math.random() * 0.8);
          if (tSec >= nextTick) { sfx.tick(); nextTick = tSec + (0.7 - 0.62 * frac); }
        }
        if (M.boom && !lastBoom && !L.host) {          // the guest hears/sees the boom from the host's state
          sfx.boom();
          const lb = blobs[1 - (M.roundWin ?? 0)]; burst(lb.x, lb.z, 26, "#ff8a3d", 1); burst(lb.x, lb.z, 14, "#333333", 1);
        }
        lastBoom = M.boom;
        // the loser rockets into the sky, spinning
        if (M.ph === "roundover" && M.boom && M.roundWin != null) {
          const loser = 1 - M.roundWin, av = avatars[loser], b = blobs[loser], tt = M.t;
          av.group.visible = true;
          av.group.position.set(b.x, b.y + 10 * tt + 8 * tt * tt, b.z);
          av.group.rotation.set(tt * 9, tt * 7, tt * 5);
        }
      }

      // ── draw: power-ups + bananas
      const want = new Set();
      for (const p of M.pu || []) {
        want.add(p.id);
        let m = itemMeshes.get(p.id);
        if (!m) { m = p.kind === "giant" ? makeMushroom() : makeBolt(); scene.add(m); itemMeshes.set(p.id, m); }
        m.position.set(p.x, 0.15 + Math.sin(tSec * 3 + p.id) * 0.15, p.z); m.rotation.y = tSec * 1.5;
      }
      for (const p of M.bn || []) {
        want.add(p.id);
        let m = itemMeshes.get(p.id);
        if (!m) { m = makeBanana(); scene.add(m); itemMeshes.set(p.id, m); }
        m.position.set(p.x, 0, p.z);
      }
      for (const [id, m] of itemMeshes) if (!want.has(id) || !playing) { scene.remove(m); itemMeshes.delete(id); }

      // ── particles + clouds
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i], u = p.userData;
        u.life -= dt; u.vy -= 9 * dt;
        p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
        p.material.opacity = Math.max(0, u.life / 0.6);
        if (u.life <= 0) { scene.remove(p); p.material.dispose(); parts.splice(i, 1); }
      }
      for (const c of clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 30) c.position.x = -30; }

      renderer.render(scene, camera);

      // ── HUD (throttled)
      if (now - lastUi > 120) {
        lastUi = now;
        const names = [L.mySlot === 0 ? myName : partnerName, L.mySlot === 1 ? myName : (M.opp === "cpu" ? "CPU Blob" : partnerName)];
        setUi({
          ph: M.ph, rd: M.rd, sc: [...M.sc], opp: M.opp, win: M.win, rw: M.roundWin,
          countdown: M.ph === "countdown" ? Math.max(1, Math.ceil(T.COUNTDOWN - M.t)) : 0,
          guestJoined: L.host ? guestRef.current.joined : true, names,
          dashCd: me.dashCd, giant: me.giantT > 0, zoom: me.zoomT > 0, holder: M.holder, boom: M.boom,
          oppName: M.opp === "cpu" ? "CPU Blob" : partnerName,
        });
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      fxRef.current = null;
      scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose()); } });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI ─────────────────────────────────────────────────────────────────────
  const names = ui.names || [myName, partnerName];
  const slotColor = (slot) => (slot === mySlot ? myColor : ui.opp === "cpu" ? "#cccccc" : partnerColor);
  const toggleMute = () => { const m = !muted; setMuted(m); setMutedUi(m); };
  const leave = () => { onExit(); };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, overflow: "hidden", background: "#8fd0ff", ...noSelect, fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      <button onClick={leave} style={{ ...btn, position: "absolute", top: 10, left: 10, zIndex: 20 }}>← back to world</button>
      <button onClick={toggleMute} style={{ ...btn, position: "absolute", top: 10, right: 10, zIndex: 20 }}>{muted ? "sound off" : "sound on"}</button>

      {/* scoreboard */}
      {ui.ph !== "ready" && (
        <div style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: 12, padding: "6px 14px", borderRadius: 999, background: "rgba(15,12,30,0.7)", color: "#fff", fontWeight: 800, fontSize: 14, pointerEvents: "none", whiteSpace: "nowrap" }}>
          <span style={{ color: slotColor(0) }}>{names[0]}</span>
          <Pips n={ui.sc[0]} color={slotColor(0)} />
          <span style={{ color: C.dim, fontSize: 12 }}>round {ui.rd}</span>
          <Pips n={ui.sc[1]} color={slotColor(1)} />
          <span style={{ color: slotColor(1) }}>{names[1]}</span>
        </div>
      )}

      {ui.ph === "countdown" && <Big>{ui.countdown}</Big>}
      {ui.ph === "roundover" && ui.rw != null && <Big small>{POTATO && ui.boom ? "BOOM! " : ""}{ui.rw === mySlot ? "You" : names[ui.rw]} {ui.rw === mySlot ? "take" : "takes"} the round!</Big>}
      {POTATO && ui.ph === "play" && (
        <div style={{ position: "absolute", top: 92, left: 0, right: 0, textAlign: "center", zIndex: 20, pointerEvents: "none", fontWeight: 900, fontSize: 18, textShadow: "0 2px 6px rgba(0,0,0,0.6)", color: ui.holder === mySlot ? "#ff8a3d" : "#ffffff", padding: "0 16px" }}>
          {ui.holder === mySlot ? "You have the bomb! Bump them to pass it!" : `Run! ${names[ui.holder]} has the bomb!`}
        </div>
      )}
      {(ui.giant || ui.zoom) && ui.ph === "play" && (
        <div style={{ position: "absolute", top: POTATO ? 120 : 92, left: 0, right: 0, textAlign: "center", zIndex: 20, pointerEvents: "none", color: "#fff", fontWeight: 900, textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
          {ui.giant ? "GIANT!" : ""} {ui.zoom ? "ZOOM!" : ""}
        </div>
      )}

      {ui.ph === "ready" && (
        <Panel>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim }}>{POTATO ? "hot potato" : "bumper blobs"}</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{POTATO ? "Don't be holding the bomb!" : "Bump each other off!"}</div>
          <div style={{ fontSize: 13, color: C.dim }}>{POTATO
            ? "One of you starts with a fizzing bomb. Bump the other blob to pass it (no passing straight back!). Nobody knows exactly when it blows, but the ticking speeds up. Whoever's holding it at BOOM gets launched to the moon. Fall off and you pop back in the middle holding the bomb. First to 3 rounds wins."
            : "Slide around, DASH to charge, and knock your opponent off the platform. Tiles crumble from the edges. First to 3 rounds wins. Grab mushrooms to go GIANT and bolts to ZOOM. Watch out for banana peels!"}</div>
          {host ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: ui.guestJoined ? C.good : C.dim }}>{ui.guestJoined ? `${partnerName} is in!` : `Waiting for ${partnerName} to join… (or play the CPU)`}</div>
              <button disabled={!ui.guestJoined} onClick={() => startMatch("guest")} style={{ ...bigBtn(true), opacity: ui.guestJoined ? 1 : 0.4 }}>Start vs {partnerName}</button>
              <button onClick={() => startMatch("cpu")} style={bigBtn(false)}>Play vs CPU</button>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: C.good }}>You're in! Waiting for {partnerName} to start…</div>
          )}
          <div style={{ fontSize: 11, color: C.faint }}>{isTouch() ? "Joystick to move · DASH button to charge" : "WASD / arrows to move · Space or Shift to dash"}</div>
        </Panel>
      )}

      {ui.ph === "matchover" && (
        <Panel>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim }}>match over</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: slotColor(ui.win) }}>{ui.win === mySlot ? "You win!" : `${names[ui.win]} wins!`}</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{ui.sc[0]} – {ui.sc[1]}</div>
          {host
            ? <button onClick={() => startMatch(ui.opp === "guest" && ui.guestJoined ? "guest" : "cpu")} style={bigBtn(true)}>Again!</button>
            : <div style={{ fontSize: 13, color: C.dim }}>Waiting for {partnerName} to start another…</div>}
          <button onClick={leave} style={bigBtn(false)}>Back to world</button>
        </Panel>
      )}

      {ui.ph === "play" && <TouchStick stickRef={stickRef} />}
      {ui.ph === "play" && isTouch() && (
        <button
          onPointerDown={(e) => { e.preventDefault(); unlockSfx(); dashRef.current = true; }}
          style={{
            position: "absolute", right: 24, bottom: "calc(28px + env(safe-area-inset-bottom, 0px))", zIndex: 22,
            width: 92, height: 92, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.7)", touchAction: "none",
            background: (ui.dashCd || 0) > 0 ? "rgba(15,12,30,0.35)" : "rgba(255,93,115,0.75)", color: "#fff", fontWeight: 900, fontSize: 17, fontFamily: "inherit", ...noSelect,
          }}
        >DASH</button>
      )}
      {!isTouch() && ui.ph === "play" && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "rgba(20,30,40,0.6)", fontSize: 12, fontWeight: 700, zIndex: 5, pointerEvents: "none" }}>
          WASD / arrows to move · Space or Shift to dash
        </div>
      )}
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Pips({ n, color }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: i < n ? color : "rgba(255,255,255,0.15)", border: `1px solid ${color}` }} />)}
    </span>
  );
}
function Big({ children, small }) {
  return (
    <div style={{ position: "absolute", top: "32%", left: 0, right: 0, textAlign: "center", zIndex: 25, pointerEvents: "none", color: "#fff", fontWeight: 900, fontSize: small ? "clamp(24px, 5vw, 40px)" : "clamp(60px, 14vw, 120px)", textShadow: "0 4px 14px rgba(0,0,0,0.5)", padding: "0 16px" }}>
      {children}
    </div>
  );
}
function Panel({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, background: "rgba(10,20,40,0.25)" }}>
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "calc(100svh - 24px)", overflowY: "auto", boxSizing: "border-box", background: "rgba(20,16,40,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, color: C.text, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}
function TouchStick({ stickRef }) {
  const zoneRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const R = 60;
  if (!isTouch()) return null;
  const setFrom = (e) => {
    const r = zoneRef.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / R, dy = (e.clientY - (r.top + r.height / 2)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    stickRef.current = { x: m < 0.15 ? 0 : dx, y: m < 0.15 ? 0 : dy, active: true };
    setKnob({ x: dx * R, y: dy * R, on: true });
  };
  const end = () => { stickRef.current = { x: 0, y: 0, active: false }; setKnob({ x: 0, y: 0, on: false }); };
  return (
    <div
      ref={zoneRef}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); setFrom(e); }}
      onPointerMove={(e) => { if (knob.on || e.buttons) setFrom(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      style={{
        position: "absolute", left: 22, bottom: "calc(22px + env(safe-area-inset-bottom, 0px))", zIndex: 22,
        width: R * 2, height: R * 2, borderRadius: "50%", touchAction: "none", ...noSelect,
        background: "rgba(15,12,30,0.2)", border: "2px solid rgba(255,255,255,0.45)",
      }}
    >
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, borderRadius: "50%", background: knob.on ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, pointerEvents: "none" }} />
    </div>
  );
}

const noSelect = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent" };
const btn = {
  padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
  background: "rgba(15,12,30,0.65)", border: "1px solid rgba(255,255,255,0.2)", color: C.text,
};
function bigBtn(primary) {
  return {
    padding: 12, borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
    ...(primary ? { background: C.accent, color: "#1a1300", border: "none" } : { background: "transparent", color: C.dim, border: "1px solid rgba(255,255,255,0.15)" }),
  };
}