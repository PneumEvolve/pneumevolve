// src/Pages/Arcade/games/walk-3d/world3d.js
//
// The 3D world for the walk-around tester: grass, a hill, a pond, trees,
// rocks, flowers and a little house. Everything is built from simple shapes
// in code (no models, no image files, no emojis).
//
// The world is generated from a fixed seed, so both players see exactly the
// same trees in the same places without sending anything over the network.

import * as THREE from "three";

export const WORLD_HALF = 70;               // you can walk from -70 to 70 on x and z
const SEED = 20261124;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Landmarks ────────────────────────────────────────────────────────────────
const HILL = { x: -20, z: -18, r: 14, h: 4 };
const POND = { x: 16, z: -8, r: 7 };
const HOUSE = { x: 0, z: -30, w: 8, d: 7 };

// Ground height at a spot (the hill is a smooth bump).
export function heightAt(x, z) {
  const d = Math.hypot(x - HILL.x, z - HILL.z);
  if (d >= HILL.r) return 0;
  return HILL.h * (Math.cos(Math.PI * d / HILL.r) + 1) / 2;
}

// Builds everything into `scene`. Returns { colliders } — circles you can't walk through.
export function buildWorld(scene) {
  const r = rng(SEED);
  const colliders = [];   // { x, z, r }

  // sky + light
  scene.background = new THREE.Color("#9fd6ff");
  scene.fog = new THREE.Fog("#9fd6ff", 45, 110);
  scene.add(new THREE.HemisphereLight("#dff3ff", "#4c7a3a", 0.9));

  // ground (with the hill pushed up out of it)
  const groundGeo = new THREE.PlaneGeometry(WORLD_HALF * 2 + 40, WORLD_HALF * 2 + 40, 90, 90);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: "#5fa34c" }));
  ground.receiveShadow = true;
  scene.add(ground);

  // a few darker grass patches for texture
  const patchMat = new THREE.MeshLambertMaterial({ color: "#56964a" });
  for (let i = 0; i < 40; i++) {
    const x = (r() - 0.5) * WORLD_HALF * 2, z = (r() - 0.5) * WORLD_HALF * 2;
    if (heightAt(x, z) > 0.05 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 2) continue;
    const p = new THREE.Mesh(new THREE.CircleGeometry(2 + r() * 3, 16), patchMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); p.receiveShadow = true;
    scene.add(p);
  }

  // pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 40), new THREE.MeshLambertMaterial({ color: "#4aa8e0" }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, 0.03, POND.z);
  scene.add(pond);
  const shore = new THREE.Mesh(new THREE.RingGeometry(POND.r, POND.r + 0.8, 40), new THREE.MeshLambertMaterial({ color: "#d9c48a" }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(POND.x, 0.02, POND.z);
  scene.add(shore);
  pond.userData.water = true;
  colliders.push({ x: POND.x, z: POND.z, r: POND.r - 0.4 });
  // lily pads
  const padMat = new THREE.MeshLambertMaterial({ color: "#3f8f3a" });
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, d = r() * (POND.r - 1.5);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5 + r() * 0.3, 12, 0.4, Math.PI * 1.8), padMat);
    pad.rotation.x = -Math.PI / 2; pad.position.set(POND.x + Math.cos(a) * d, 0.05, POND.z + Math.sin(a) * d);
    scene.add(pad);
  }

  // house
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(HOUSE.w, 4, HOUSE.d), new THREE.MeshLambertMaterial({ color: "#e8d7b5" }));
  walls.position.y = 2; walls.castShadow = true; walls.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(HOUSE.w * 0.78, 3, 4), new THREE.MeshLambertMaterial({ color: "#b5483a" }));
  roof.position.y = 5.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: "#7a4a2a" }));
  door.position.set(0, 1.2, HOUSE.d / 2 + 0.05);
  const winMat = new THREE.MeshLambertMaterial({ color: "#bfe6ff", emissive: "#3a5a70" });
  for (const wx of [-2.6, 2.6]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 0.1), winMat);
    w.position.set(wx, 2.4, HOUSE.d / 2 + 0.05); house.add(w);
  }
  house.add(walls, roof, door);
  house.position.set(HOUSE.x, 0, HOUSE.z);
  scene.add(house);
  // the house is a box; approximate it with a few circles along it
  for (const dx of [-2.6, 0, 2.6]) colliders.push({ x: HOUSE.x + dx, z: HOUSE.z, r: 3.6 });

  // trees: trunk + stacked cones, kept away from the middle, pond and house
  const trunkMat = new THREE.MeshLambertMaterial({ color: "#7a5230" });
  const leafMats = ["#3f8f3a", "#4c9c3f", "#357a33"].map(c => new THREE.MeshLambertMaterial({ color: c }));
  const blocked = (x, z, pad) =>
    Math.hypot(x, z) < 9 ||
    Math.hypot(x - POND.x, z - POND.z) < POND.r + pad ||
    (Math.abs(x - HOUSE.x) < HOUSE.w / 2 + pad && Math.abs(z - HOUSE.z) < HOUSE.d / 2 + pad) ||
    colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + pad);
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < 55; tries++) {
    const x = (r() - 0.5) * (WORLD_HALF * 2 - 6), z = (r() - 0.5) * (WORLD_HALF * 2 - 6);
    if (blocked(x, z, 3)) continue;
    const s = 0.8 + r() * 0.7, y = heightAt(x, z);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 1.6 * s, 8), trunkMat);
    trunk.position.y = 0.8 * s; trunk.castShadow = true;
    tree.add(trunk);
    const mat = leafMats[Math.floor(r() * leafMats.length)];
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.6 - k * 0.4) * s, 1.8 * s, 9), mat);
      cone.position.y = (1.8 + k * 0.9) * s; cone.castShadow = true;
      tree.add(cone);
    }
    tree.position.set(x, y, z); tree.rotation.y = r() * Math.PI;
    scene.add(tree);
    colliders.push({ x, z, r: 0.6 * s });
    placed++;
  }

  // rocks
  const rockMat = new THREE.MeshLambertMaterial({ color: "#9a9a9a", flatShading: true });
  for (let i = 0; i < 22; i++) {
    const x = (r() - 0.5) * (WORLD_HALF * 2 - 6), z = (r() - 0.5) * (WORLD_HALF * 2 - 6);
    if (blocked(x, z, 1.5)) continue;
    const s = 0.4 + r() * 0.9;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(x, heightAt(x, z) + s * 0.4, z); rock.rotation.set(r() * 3, r() * 3, r() * 3);
    rock.scale.y = 0.7; rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
    if (s > 0.6) colliders.push({ x, z, r: s * 0.9 });
  }

  // flowers (decoration only, walk right through them)
  const flowerCols = ["#ff7aa8", "#ffd65a", "#ffffff", "#b98cff"];
  const stemMat = new THREE.MeshLambertMaterial({ color: "#3f8f3a" });
  const headGeo = new THREE.SphereGeometry(0.16, 8, 6), stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4);
  for (let i = 0; i < 90; i++) {
    const x = (r() - 0.5) * WORLD_HALF * 2, z = (r() - 0.5) * WORLD_HALF * 2;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1) continue;
    const y = heightAt(x, z);
    const stem = new THREE.Mesh(stemGeo, stemMat); stem.position.set(x, y + 0.2, z);
    const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: flowerCols[i % flowerCols.length] }));
    head.position.set(x, y + 0.45, z);
    scene.add(stem, head);
  }

  // edge of the world: a ring of bushy trees just outside the walkable area
  for (let i = 0; i < 70; i++) {
    const a = i / 70 * Math.PI * 2, d = WORLD_HALF + 4 + r() * 4;
    const bush = new THREE.Mesh(new THREE.ConeGeometry(2 + r(), 5 + r() * 2, 8), leafMats[i % 3]);
    bush.position.set(Math.cos(a) * d, 2.5, Math.sin(a) * d);
    scene.add(bush);
  }

  return { colliders };
}

// Push a point out of any collider it's inside, and keep it inside the world.
export function resolveCollisions(p, colliders, radius = 0.6) {
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + radius;
    if (d < min && d > 0.0001) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
  }
  p.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, p.x));
  p.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, p.z));
}