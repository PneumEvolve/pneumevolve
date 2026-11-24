// src/Pages/Arcade/games/walk-3d/Walk3D.jsx
//
// 3D Tester — a little 3D world where you and your partner walk around.
// Nothing to win: it's here to test 3D in the browser (Three.js) on the
// tablet and the phone, plus character customization saved to your account.
//
//   world3d.js   the world (seeded, so both players see the same trees)
//   avatar3d.js  the blob characters + hats/eyes/colours
//   games3d.js   3D mini-games started from the glowing pads (Bumper Blobs, …)
//   this file    screen, camera, controls, syncing with your partner, the pads
//
// Controls
//   desktop  WASD / arrows to walk, Space to jump, drag (or Q/E) to turn the camera
//   touch    joystick (left) to walk, JUMP button (right), drag the screen to turn the camera
//
// Network (no shared world to save — everyone just reports themselves):
//   "w3_me"   { x, y, z, r, m, a }   ~15/s volatile   position, facing, moving, airborne
//   "w3_look" { look }               reliable          sent on change and when the partner (re)joins
//   "g3_go"   { id }                 someone started a pad game (partner gets a Join banner)
//   "g3_end"  {}                     the game's host left it (everyone in it comes back)
//
// Needs:  npm install three

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useArcadeEvent } from "../../net/useArcadeRoom";
import { useArcadeSave } from "../../net/useArcadeSave";
import { C } from "../../ui";
import { buildWorld, heightAt, resolveCollisions } from "./world3d";
import { makeAvatar, makeNameTag, COLORS, HATS, EYES, DEFAULT_LOOK } from "./avatar3d";
import { GAMES3D } from "./games3d";

const SPEED = 6, JUMP = 7.5, GRAVITY = 22;
const SLOT_COLORS = { p1: C.accent, p2: C.accent2 };
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;
const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
  q: "turnL", Q: "turnL", e: "turnR", E: "turnR",
};
const HAT_NAMES = { none: "No hat", cap: "Cap", party: "Party", tophat: "Top hat", crown: "Crown", flower: "Flower", propeller: "Propeller" };
const EYE_NAMES = { round: "Round", big: "Big", sleepy: "Sleepy" };

export default function Walk3D({ net, room, role, onLeave }) {
  const myName = (role === "p1" ? room.player1_name : room.player2_name) || "me";
  const partnerName = (role === "p1" ? room.player2_name : room.player1_name) || "partner";
  const myColor = SLOT_COLORS[role] || C.accent, partnerColor = role === "p1" ? SLOT_COLORS.p2 : SLOT_COLORS.p1;

  const { data: save, update } = useArcadeSave("walk-3d", { look: DEFAULT_LOOK });
  const look = { ...DEFAULT_LOOK, ...(save.look || {}) };
  const [customizing, setCustomizing] = useState(false);
  const [partnerHere, setPartnerHere] = useState(false);
  const [nearPad, setNearPad] = useState(null);       // id of the game pad you're standing on
  const [active, setActive] = useState(null);         // { id, host } while in a pad game
  const [invite, setInvite] = useState(null);         // { id } partner started a game you can join

  const mountRef = useRef(null);
  const keysRef = useRef({});
  const stickRef = useRef({ x: 0, y: 0, active: false });
  const jumpRef = useRef(false);
  const camRef = useRef({ yaw: 0, dragging: false, lastX: 0 });
  const meRef = useRef({ x: 0, y: 0, z: 4, r: Math.PI, vy: 0, moving: false, airborne: false });
  const partnerRef = useRef({ avatar: null, x: 0, y: 0, z: 0, r: 0, tx: 0, ty: 0, tz: 0, tr: 0, m: false, a: false, look: null, seenAt: 0 });
  const sceneRef = useRef(null);          // { scene, me (avatar) }

  const live = useRef({});
  live.current = { net, look, customizing, partnerName, partnerColor, inGame: !!active, active, nearPad };

  // ── Network ────────────────────────────────────────────────────────────────
  const sendLook = useCallback(() => live.current.net.send("w3_look", { look: live.current.look }), []);
  const announceGame = useCallback(() => { const a = live.current.active; if (a?.host) live.current.net.send("g3_go", { id: a.id }); }, []);
  useArcadeEvent(net, "hello", () => { sendLook(); announceGame(); });
  useArcadeEvent(net, "partner_connected", () => { sendLook(); announceGame(); });
  useArcadeEvent(net, "g3_go", (m) => { if (!live.current.active) setInvite({ id: m.id }); });
  useArcadeEvent(net, "g3_end", () => {
    setInvite(null);
    if (live.current.active && !live.current.active.host) setActive(null);
  });
  useArcadeEvent(net, "partner_disconnected", () => {
    setInvite(null);
    if (live.current.active && !live.current.active.host) setActive(null);
    const P = partnerRef.current, S = sceneRef.current;
    if (P.avatar && S) S.scene.remove(P.avatar.group);
    P.avatar = null; setPartnerHere(false);
  });
  const ensurePartner = () => {
    const P = partnerRef.current, S = sceneRef.current;
    if (P.avatar || !S) return P;
    P.avatar = makeAvatar(P.look || DEFAULT_LOOK);
    P.avatar.setName(live.current.partnerName, live.current.partnerColor);
    P.avatar.group.position.set(P.tx, P.ty, P.tz);
    P.x = P.tx; P.y = P.ty; P.z = P.tz; P.r = P.tr;
    S.scene.add(P.avatar.group);
    setPartnerHere(true);
    sendLook();                                           // they just showed up — tell them what I look like
    return P;
  };
  useArcadeEvent(net, "w3_me", (m) => {
    const P = partnerRef.current;
    P.tx = m.x; P.ty = m.y; P.tz = m.z; P.tr = m.r; P.m = !!m.m; P.a = !!m.a; P.seenAt = performance.now();
    ensurePartner();
  });
  useArcadeEvent(net, "w3_look", (m) => {
    const P = partnerRef.current;
    P.look = m.look;
    if (P.avatar) P.avatar.setLook(m.look);
  });

  // my look changed (saved data loaded, or I customized) → update my avatar + tell partner
  useEffect(() => {
    const S = sceneRef.current;
    if (S) S.me.setLook(look);
    net.send("w3_look", { look });
  }, [look.color, look.hat, look.eyes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pad games ──────────────────────────────────────────────────────────────
  const startGame = (id) => {
    const g = GAMES3D.find(x => x.id === id);
    if (!g?.ready) return;
    setCustomizing(false); setInvite(null);
    setActive({ id, host: true });
    net.send("g3_go", { id });
  };
  const joinGame = () => { if (invite) { setActive({ id: invite.id, host: false }); setInvite(null); } };
  const exitGame = () => {
    if (active?.host) net.send("g3_end");
    setActive(null); keysRef.current = {};
  };

  const changeLook = (patch) => update(prev => ({ look: { ...DEFAULT_LOOK, ...(prev.look || {}), ...patch } }));

  const startGameRef = useRef(null);
  startGameRef.current = startGame;

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (live.current.inGame) return;                     // the pad game handles keys
      if (e.key === "Enter" && live.current.nearPad) { startGameRef.current?.(live.current.nearPad); return; }
      if (e.key === " ") { e.preventDefault(); jumpRef.current = true; return; }
      const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
    const up = (e) => { const k = KEYMAP[e.key]; if (k) delete keysRef.current[k]; };
    const blur = () => { keysRef.current = {}; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  // ── Three.js setup + game loop ─────────────────────────────────────────────
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
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    const { colliders } = buildWorld(scene);

    const sun = new THREE.DirectionalLight("#fff4e0", 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    scene.add(sun, sun.target);

    // glowing game pads
    const pads = GAMES3D.map(g => {
      const grp = new THREE.Group();
      const col = g.ready ? g.color : "#8a8a9a";
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.2, 32), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: g.ready ? 0.35 : 0.05 }));
      base.position.y = 0.1; base.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: g.ready ? 0.8 : 0.3 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
      const label = makeNameTag(g.ready ? g.name : `${g.name} (soon)`, g.ready ? "#ffffff" : "#bbbbbb", true);
      label.position.y = 2.6; label.scale.set(6, 0.75, 1);
      grp.add(base, ring, label);
      grp.position.set(g.pad.x, heightAt(g.pad.x, g.pad.z), g.pad.z);
      scene.add(grp);
      return { g, grp, ring };
    });

    const me = makeAvatar(live.current.look, myName);
    me.setName(myName, myColor);
    scene.add(me.group);
    sceneRef.current = { scene, me };
    if (window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.walk3d = { me: meRef, partner: partnerRef, cam: camRef, scene, renderer };

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    // drag anywhere on the 3D view to turn the camera
    const el = renderer.domElement;
    const pd = (e) => { camRef.current.dragging = true; camRef.current.lastX = e.clientX; el.setPointerCapture?.(e.pointerId); };
    const pm = (e) => { const c = camRef.current; if (!c.dragging) return; c.yaw -= (e.clientX - c.lastX) * 0.008; c.lastX = e.clientX; };
    const pu = () => { camRef.current.dragging = false; };
    el.addEventListener("pointerdown", pd); el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu); el.addEventListener("pointercancel", pu);

    const camPos = new THREE.Vector3(0, 8, 14), camLook = new THREE.Vector3();
    let raf = 0, last = performance.now(), lastSend = 0, lastPad = null;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000, L = live.current, M = meRef.current, cam = camRef.current, k = keysRef.current;
      if (L.inGame) return;                                 // a pad game is on screen — the world waits behind it

      // turn camera with Q/E
      if (k.turnL) cam.yaw += 1.8 * dt;
      if (k.turnR) cam.yaw -= 1.8 * dt;

      // ── walk (relative to where the camera is looking)
      const st = stickRef.current;
      let dx, dy;
      if (st.active) { dx = st.x; dy = st.y; } else { dx = (k.right ? 1 : 0) - (k.left ? 1 : 0); dy = (k.down ? 1 : 0) - (k.up ? 1 : 0); }
      if (L.customizing) { dx = 0; dy = 0; }
      let mag = Math.hypot(dx, dy);
      if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
      M.moving = mag > 0.05;
      if (M.moving) {
        const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
        const vx = dx * c + dy * s, vz = -dx * s + dy * c;
        M.x += vx * SPEED * dt; M.z += vz * SPEED * dt;
        const want = Math.atan2(vx, vz);
        let diff = want - M.r;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        M.r += diff * Math.min(1, dt * 12);
      }
      resolveCollisions(M, colliders);

      // ── jump + gravity, standing on the ground (or the hill)
      const groundY = heightAt(M.x, M.z);
      if (jumpRef.current && !M.airborne && !L.customizing) { M.vy = JUMP; M.airborne = true; }
      jumpRef.current = false;
      if (M.airborne || M.y > groundY + 0.01) {
        M.vy -= GRAVITY * dt; M.y += M.vy * dt;
        if (M.y <= groundY) { M.y = groundY; M.vy = 0; M.airborne = false; }
      } else M.y = groundY;

      me.group.position.set(M.x, M.y, M.z);
      me.group.rotation.y = M.r;
      me.animate(t, M.moving, M.airborne);
      for (const ch of me.group.children) if (ch.isSprite) ch.visible = !L.customizing;   // hide my name tag in close-up

      // ── partner: glide toward their last reported spot
      const P = partnerRef.current;
      if (P.avatar) {
        const a = 1 - Math.exp(-dt * 12);
        P.x += (P.tx - P.x) * a; P.y += (P.ty - P.y) * a; P.z += (P.tz - P.z) * a;
        let dr = P.tr - P.r;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        P.r += dr * a;
        P.avatar.group.position.set(P.x, P.y, P.z);
        P.avatar.group.rotation.y = P.r;
        P.avatar.animate(t + 1.3, P.m, P.a);
      }

      // ── game pads: pulse, and notice when I'm standing on one
      let onPad = null;
      for (const p of pads) {
        p.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
        p.ring.position.y = 0.25 + Math.sin(t * 2) * 0.05;
        if (Math.hypot(M.x - p.g.pad.x, M.z - p.g.pad.z) < 1.9) onPad = p.g.id;
      }
      if (onPad !== lastPad) { lastPad = onPad; setNearPad(onPad); }

      // ── tell the partner where I am
      if (now - lastSend > 66) {
        L.net.send("w3_me", { x: +M.x.toFixed(2), y: +M.y.toFixed(2), z: +M.z.toFixed(2), r: +M.r.toFixed(2), m: M.moving ? 1 : 0, a: M.airborne ? 1 : 0 }, { volatile: true });
        lastSend = now;
      }

      // ── camera: follows behind/above; swings in front of you while customizing
      const close = L.customizing;
      const yaw = close ? M.r : cam.yaw;
      const dist = close ? 4.2 : 10, height = close ? 2.2 : 6.5;
      const wantPos = new THREE.Vector3(M.x + Math.sin(yaw) * dist, M.y + height, M.z + Math.cos(yaw) * dist);
      camPos.lerp(wantPos, 1 - Math.exp(-dt * (close ? 5 : 8)));
      camLook.lerp(new THREE.Vector3(M.x, M.y + (close ? 0.9 : 1.2), M.z), 1 - Math.exp(-dt * 10));
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      // the sun follows you so shadows stay crisp nearby
      sun.position.set(M.x + 12, 25, M.z + 8);
      sun.target.position.set(M.x, 0, M.z);

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", pd); el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu); el.removeEventListener("pointercancel", pu);
      scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose()); } });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      partnerRef.current.avatar = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100svh", overflow: "hidden", background: "#9fd6ff", ...noSelect, fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      <button onClick={onLeave} style={{ ...btn, position: "absolute", top: 10, left: 10, zIndex: 20 }}>← rooms</button>
      <button onClick={() => setCustomizing(c => !c)} style={{ ...btn, position: "absolute", top: 10, right: 10, zIndex: 20, ...(customizing ? { background: C.accent, color: "#1a1300", border: "none" } : {}) }}>
        {customizing ? "Done" : "Customize"}
      </button>
      <div style={{ position: "absolute", top: 50, right: 10, zIndex: 20, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "rgba(15,12,30,0.6)", color: partnerHere ? C.good : C.dim, fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: partnerHere ? C.good : C.dim }} />
        {partnerHere ? `${partnerName} is here` : `waiting for ${partnerName}`}
      </div>

      {customizing && (
        <div style={{
          position: "absolute", zIndex: 30, right: 10, top: 86, bottom: 10, width: "min(300px, 46vw)", overflowY: "auto",
          background: "rgba(20,16,40,0.88)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, color: C.text,
          display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box",
        }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Your look</div>
          <Section title="Colour">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} aria-label={c} onClick={() => changeLook({ color: c })} style={{
                  width: 34, height: 34, borderRadius: "50%", background: c, cursor: "pointer",
                  border: look.color === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
                }} />
              ))}
            </div>
          </Section>
          <Section title="Hat">
            <Choices items={HATS} names={HAT_NAMES} value={look.hat} onPick={(hat) => changeLook({ hat })} />
          </Section>
          <Section title="Eyes">
            <Choices items={EYES} names={EYE_NAMES} value={look.eyes} onPick={(eyes) => changeLook({ eyes })} />
          </Section>
          <div style={{ fontSize: 11, color: C.faint }}>Saved to your account. {partnerName} sees your new look right away.</div>
        </div>
      )}

      {nearPad && !active && !customizing && (() => {
        const g = GAMES3D.find(x => x.id === nearPad);
        return (
          <div style={{ position: "absolute", left: "50%", bottom: isTouch() ? 150 : 34, transform: "translateX(-50%)", zIndex: 25, width: "min(360px, 80vw)", background: "rgba(20,16,40,0.9)", border: `2px solid ${g.ready ? g.color : "rgba(255,255,255,0.2)"}`, borderRadius: 16, padding: "12px 14px", color: C.text, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{g.name}</div>
            <div style={{ fontSize: 13, color: C.dim }}>{g.desc}</div>
            {g.ready
              ? <button onClick={() => startGame(g.id)} style={{ ...btn, padding: 11, fontSize: 16, background: g.color, color: "#1a1300", border: "none" }}>Play{!isTouch() ? " (Enter)" : ""}</button>
              : <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>COMING SOON</div>}
          </div>
        );
      })()}

      {invite && !active && (
        <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", zIndex: 26, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 14px", borderRadius: 14, background: "rgba(15,12,30,0.9)", border: `1px solid ${partnerColor}`, color: C.text, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
          {partnerName} started {GAMES3D.find(g => g.id === invite.id)?.name ?? "a game"}
          <button onClick={joinGame} style={{ ...btn, background: partnerColor, color: "#06202a", border: "none" }}>Join</button>
          <button onClick={() => setInvite(null)} style={{ ...btn, padding: "7px 9px" }} aria-label="dismiss">x</button>
        </div>
      )}

      {active && (() => {
        const g = GAMES3D.find(x => x.id === active.id);
        const Game = g?.component;
        return Game && (
          <Suspense fallback={<div style={{ position: "absolute", inset: 0, zIndex: 60, background: "#8fd0ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a2a40", fontWeight: 800 }}>loading {g.name}…</div>}>
            <Game net={net} host={active.host} look={look} partnerLook={partnerRef.current.look}
              myName={myName} partnerName={partnerName} myColor={myColor} partnerColor={partnerColor} onExit={exitGame} />
          </Suspense>
        );
      })()}

      {!isTouch() && !customizing && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "rgba(20,30,40,0.6)", fontSize: 12, fontWeight: 700, zIndex: 5, pointerEvents: "none" }}>
          WASD / arrows to walk · Space to jump · drag or Q/E to turn the camera
        </div>
      )}

      {!customizing && <TouchStick stickRef={stickRef} />}
      {!customizing && isTouch() && (
        <button
          onPointerDown={(e) => { e.preventDefault(); jumpRef.current = true; }}
          style={{
            position: "absolute", right: 24, bottom: "calc(28px + env(safe-area-inset-bottom, 0px))", zIndex: 22,
            width: 86, height: 86, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.5)", touchAction: "none",
            background: "rgba(15,12,30,0.45)", color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "inherit", ...noSelect,
          }}
        >JUMP</button>
      )}
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</div>
      {children}
    </div>
  );
}
function Choices({ items, names, value, onPick }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(id => (
        <button key={id} onClick={() => onPick(id)} style={{
          ...btn, padding: "7px 10px",
          ...(value === id ? { background: C.accent, color: "#1a1300", border: "none" } : {}),
        }}>{names[id] || id}</button>
      ))}
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
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setFrom(e); }}
      onPointerMove={(e) => { if (knob.on || e.buttons) setFrom(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      style={{
        position: "absolute", left: 22, bottom: "calc(22px + env(safe-area-inset-bottom, 0px))", zIndex: 22,
        width: R * 2, height: R * 2, borderRadius: "50%", touchAction: "none", ...noSelect,
        background: "rgba(15,12,30,0.2)", border: "2px solid rgba(255,255,255,0.4)",
      }}
    >
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, borderRadius: "50%", background: knob.on ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, pointerEvents: "none" }} />
    </div>
  );
}

const noSelect = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent" };
const btn = {
  padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
  background: "rgba(15,12,30,0.65)", border: "1px solid rgba(255,255,255,0.2)", color: C.text,
};