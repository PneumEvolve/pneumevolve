// src/Pages/Arcade/games/walk-3d/avatar3d.js
//
// A customizable blob character, built from simple shapes.
//   look = { color, hat, eyes }
//     color  one of COLORS
//     hat    none | cap | party | tophat | crown | flower | propeller
//     eyes   round | big | sleepy
//
// makeAvatar(look, name) → { group, setLook(look), setName(name), animate(t, moving, airborne) }

import * as THREE from "three";

export const COLORS = ["#ff8a5c", "#ffd65a", "#7ee081", "#6fd3ff", "#b98cff", "#ff7aa8", "#f2f2f2", "#5a6b8a"];
export const HATS = ["none", "cap", "party", "tophat", "crown", "flower", "propeller"];
export const EYES = ["round", "big", "sleepy"];
export const DEFAULT_LOOK = { color: COLORS[3], hat: "cap", eyes: "round" };

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function lighten(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + amt));
}

function buildHat(kind) {
  const g = new THREE.Group();
  if (kind === "cap") {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert("#e04848"));
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 16, 1, false, -Math.PI / 2, Math.PI), lambert("#c23a3a"));
    brim.position.set(0, 0.02, 0.22); brim.scale.set(1, 1, 1.4);
    g.add(top, brim);
  } else if (kind === "party") {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 16), lambert("#b98cff"));
    cone.position.y = 0.37;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lambert("#ffd65a"));
    pom.position.y = 0.78;
    g.add(cone, pom);
  } else if (kind === "tophat") {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), lambert("#222233"));
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 20), lambert("#222233"));
    tube.position.y = 0.32;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.1, 20), lambert("#e04848"));
    band.position.y = 0.1;
    g.add(brim, tube, band);
  } else if (kind === "crown") {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 20, 1, true), lambert("#ffd65a", { side: THREE.DoubleSide }));
    ring.position.y = 0.1;
    g.add(ring);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), lambert("#ffd65a"));
      spike.position.set(Math.cos(a) * 0.32, 0.3, Math.sin(a) * 0.32);
      g.add(spike);
    }
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lambert("#ff5d73"));
    gem.position.set(0, 0.1, 0.34);
    g.add(gem);
  } else if (kind === "flower") {
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lambert("#ffd65a"));
    centre.position.set(0.22, 0.05, 0.1);
    g.add(centre);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lambert("#ff7aa8"));
      petal.position.set(0.22 + Math.cos(a) * 0.15, 0.05 + Math.sin(a) * 0.15, 0.1);
      petal.scale.z = 0.5;
      g.add(petal);
    }
  } else if (kind === "propeller") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert("#6fd3ff"));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), lambert("#444"));
    pole.position.y = 0.48;
    const blades = new THREE.Group();
    for (const [c, a] of [["#e04848", 0], ["#ffd65a", Math.PI / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.12), lambert(c));
      b.rotation.y = a; blades.add(b);
    }
    blades.position.y = 0.6;
    blades.name = "spin";
    g.add(cap, pole, blades);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildEyes(kind) {
  const g = new THREE.Group();
  const white = lambert("#ffffff"), dark = lambert("#1b1530");
  const size = kind === "big" ? 0.17 : 0.12;
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), white);
    eye.position.set(side * 0.2, 0, 0);
    if (kind === "sleepy") eye.scale.y = 0.45;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 10, 8), dark);
    pupil.position.set(side * 0.2, kind === "sleepy" ? -0.01 : 0, size * 0.65);
    if (kind === "sleepy") pupil.scale.y = 0.45;
    g.add(eye, pupil);
    if (kind === "sleepy") {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(size * 1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark);
      lid.position.set(side * 0.2, 0.005, 0); lid.scale.y = 0.15;
      g.add(lid);
    }
  }
  return g;
}

// wide = true gives room for longer labels (like game pad names)
export function makeNameTag(name, color, wide = false) {
  const cv = document.createElement("canvas");
  const W = wide ? 512 : 256;
  cv.width = W; cv.height = 64;
  const ctx = cv.getContext("2d");
  ctx.font = "bold 34px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.min(W - 16, ctx.measureText(name).width + 30);
  ctx.fillStyle = "rgba(15,12,30,0.65)";
  ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 8, w, 48, 22); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(name, W / 2, 33);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(wide ? 4 : 2, 0.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function makeAvatar(look = DEFAULT_LOOK, name = "") {
  const group = new THREE.Group();     // positioned in the world, rotated to face where it walks
  const bodyRoot = new THREE.Group();  // bounces / squashes
  group.add(bodyRoot);

  const bodyMat = lambert(look.color);
  const bellyMat = lambert(lighten(look.color, 0.15));
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 18), bodyMat);
  body.scale.set(1, 0.92, 0.95); body.position.y = 0.62; body.castShadow = true;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), bellyMat);
  belly.position.set(0, 0.5, 0.25); belly.scale.set(1, 1, 0.6);
  const feet = [-1, 1].map(side => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), lambert(lighten(look.color, -0.15)));
    f.scale.set(1, 0.6, 1.3); f.position.set(side * 0.25, 0.08, 0.05); f.castShadow = true;
    return f;
  });
  const hands = [-1, 1].map(side => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bodyMat);
    h.position.set(side * 0.62, 0.55, 0.05); h.castShadow = true;
    return h;
  });
  const cheeks = [-1, 1].map(side => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lambert("#ff9aa8"));
    c.position.set(side * 0.34, 0.68, 0.5); c.scale.z = 0.4;
    return c;
  });
  bodyRoot.add(body, belly, ...feet, ...hands, ...cheeks);

  let eyes = buildEyes(look.eyes); eyes.position.set(0, 0.82, 0.48); bodyRoot.add(eyes);
  let hat = buildHat(look.hat); hat.position.set(0, 1.12, 0); bodyRoot.add(hat);
  let tag = null;

  const api = {
    group,
    look: { ...look },
    setLook(next) {
      const l = { ...DEFAULT_LOOK, ...next };
      if (l.color !== api.look.color) {
        bodyMat.color.set(l.color); bellyMat.color.copy(lighten(l.color, 0.15));
        for (const f of feet) f.material.color.copy(lighten(l.color, -0.15));
      }
      if (l.hat !== api.look.hat) { bodyRoot.remove(hat); hat = buildHat(l.hat); hat.position.set(0, 1.12, 0); bodyRoot.add(hat); }
      if (l.eyes !== api.look.eyes) { bodyRoot.remove(eyes); eyes = buildEyes(l.eyes); eyes.position.set(0, 0.82, 0.48); bodyRoot.add(eyes); }
      api.look = l;
    },
    setName(n, color = "#ffffff") {
      if (tag) group.remove(tag);
      tag = n ? makeNameTag(n, color) : null;
      if (tag) { tag.position.set(0, 2.2, 0); group.add(tag); }
    },
    // t: seconds, moving: walking, airborne: in a jump
    animate(t, moving, airborne) {
      const step = moving && !airborne ? t * 11 : 0;
      bodyRoot.position.y = moving && !airborne ? Math.abs(Math.sin(step)) * 0.12 : Math.sin(t * 2) * 0.02;
      const squash = airborne ? 1.08 : moving ? 1 + Math.sin(step * 2) * 0.03 : 1;
      bodyRoot.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      feet[0].position.z = 0.05 + (moving ? Math.sin(step) * 0.18 : 0);
      feet[1].position.z = 0.05 - (moving ? Math.sin(step) * 0.18 : 0);
      hands[0].position.y = 0.55 + (moving ? Math.sin(step) * 0.08 : 0) + (airborne ? 0.3 : 0);
      hands[1].position.y = 0.55 - (moving ? Math.sin(step) * 0.08 : 0) + (airborne ? 0.3 : 0);
      const spin = hat.getObjectByName("spin");
      if (spin) spin.rotation.y += moving || airborne ? 0.5 : 0.05;
    },
  };
  if (name) api.setName(name);
  return api;
}