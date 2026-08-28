import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01040b);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.20, 0.48, 0.05));

const root = new THREE.Group();
scene.add(root);

const C = {
  red: 0xff2447,
  gold: 0xffb01e,
  warm: 0xffd69a,
  white: 0xffffff,
  soft: 0xfff5df,
  blue: 0x83d8ff,
};

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rnd = seeded(22112003);

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,.96)');
  g.addColorStop(0.30, 'rgba(255,225,165,.52)');
  g.addColorStop(0.62, 'rgba(255,90,65,.11)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();

function sprite(color, size, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: glowTex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(material);
  s.scale.setScalar(size);
  return s;
}

// Sparse background stars
{
  const count = 620;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color(C.red), new THREE.Color(C.gold), new THREE.Color(C.soft), new THREE.Color(C.blue)];
  for (let i = 0; i < count; i++) {
    const r = 2.0 + rnd() * 6.2;
    const a = rnd() * Math.PI * 2;
    const ys = 0.48 + rnd() * 0.46;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * ys;
    pos[i * 3 + 2] = (rnd() - 0.5) * 1.7;
    const cc = palette[Math.floor(rnd() * palette.length)];
    col[i * 3] = cc.r;
    col[i * 3 + 1] = cc.g;
    col[i * 3 + 2] = cc.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE.Points(g, m));
}

// Outer broken memory paths
const orbitDefs = [];
const orbitGroup = new THREE.Group();
root.add(orbitGroup);

function makeOrbit(index) {
  const rx = 2.35 + rnd() * 1.55;
  const ry = 0.72 + rnd() * 1.05;
  const zRot = rnd() * Math.PI;
  const xRot = (rnd() - 0.5) * 0.82;
  const yRot = (rnd() - 0.5) * 0.46;
  const offset = new THREE.Vector3((rnd() - 0.5) * 0.26, (rnd() - 0.5) * 0.20, (rnd() - 0.5) * 0.16);
  const color = index % 3 === 0 ? C.gold : C.red;
  const pts = [];
  const start = rnd() * Math.PI * 2;
  const span = Math.PI * (1.58 + rnd() * 0.32);

  for (let i = 0; i < 220; i++) {
    const t = start + (i / 219) * span;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
  }

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending })
  );
  line.rotation.set(xRot, yRot, zRot);
  line.position.copy(offset);
  orbitGroup.add(line);

  const def = { rx, ry, line };
  orbitDefs.push(def);

  const nodeCount = 2 + Math.floor(rnd() * 3);
  for (let n = 0; n < nodeCount; n++) {
    const s = sprite(n % 3 === 0 ? C.soft : color, 0.11 + rnd() * 0.05, 0.82);
    s.userData.angle = rnd() * Math.PI * 2;
    s.userData.speed = (0.07 + rnd() * 0.10) * (rnd() > 0.5 ? 1 : -1);
    s.userData.orbit = def;
    orbitGroup.add(s);
  }
}
for (let i = 0; i < 7; i++) makeOrbit(i);

function orbitPoint(def, angle) {
  const p = new THREE.Vector3(Math.cos(angle) * def.rx, Math.sin(angle) * def.ry, 0);
  p.applyEuler(def.line.rotation);
  p.add(def.line.position);
  return p;
}

// Organic core point cloud
const coreGroup = new THREE.Group();
root.add(coreGroup);
const corePoints = [];
const corePositions = [];
const coreColors = [];
const paletteCore = [new THREE.Color(C.white), new THREE.Color(C.soft), new THREE.Color(C.warm), new THREE.Color(C.gold)];

for (let i = 0; i < 245; i++) {
  const a = rnd() * Math.PI * 2;
  const rr = Math.pow(rnd(), 0.50) * 1.12;
  const wobble = 1 + 0.12 * Math.sin(3 * a + 0.6) + 0.06 * Math.sin(7 * a + 1.4);
  const p = new THREE.Vector3(
    Math.cos(a) * rr * wobble,
    Math.sin(a) * rr * wobble * 0.90,
    (rnd() - 0.5) * 0.18
  );
  corePoints.push(p);
  corePositions.push(p.x, p.y, p.z);
  const cc = paletteCore[Math.floor(rnd() * paletteCore.length)];
  coreColors.push(cc.r, cc.g, cc.b);
}

const pointGeom = new THREE.BufferGeometry();
pointGeom.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3));
pointGeom.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
const pointMat = new THREE.PointsMaterial({
  size: 0.023,
  vertexColors: true,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
coreGroup.add(new THREE.Points(pointGeom, pointMat));

// CLEAN STRUCTURED MESH
// Only short nearest-neighbour connections. No random long scratches across the heart.
{
  const verts = [];
  for (let i = 0; i < corePoints.length; i++) {
    const ds = [];
    for (let j = 0; j < corePoints.length; j++) {
      if (i === j) continue;
      const d2 = corePoints[i].distanceToSquared(corePoints[j]);
      ds.push([d2, j]);
    }
    ds.sort((a, b) => a[0] - b[0]);

    let connected = 0;
    for (let k = 0; k < ds.length && connected < 2; k++) {
      const j = ds[k][1];
      const dist = Math.sqrt(ds[k][0]);
      if (dist > 0.30) break;
      if (i < j) {
        verts.push(
          corePoints[i].x, corePoints[i].y, corePoints[i].z,
          corePoints[j].x, corePoints[j].y, corePoints[j].z
        );
        connected++;
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const m = new THREE.LineBasicMaterial({
    color: C.soft,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
  });
  coreGroup.add(new THREE.LineSegments(g, m));
}

// Controlled curved filaments: few, smooth, and symmetrical enough to look intentional
const filamentGroup = new THREE.Group();
root.add(filamentGroup);
for (let i = 0; i < 10; i++) {
  const base = (i / 10) * Math.PI * 2;
  const r = 0.72 + (i % 3) * 0.13;
  const p0 = new THREE.Vector3(Math.cos(base) * r, Math.sin(base) * r * 0.9, 0);
  const p3 = new THREE.Vector3(Math.cos(base + 1.55) * r, Math.sin(base + 1.55) * r * 0.9, 0);
  const p1 = p0.clone().multiplyScalar(0.45).add(new THREE.Vector3(Math.cos(base + 0.55) * 0.24, Math.sin(base + 0.55) * 0.24, 0));
  const p2 = p3.clone().multiplyScalar(0.45).add(new THREE.Vector3(Math.cos(base + 1.0) * 0.24, Math.sin(base + 1.0) * 0.24, 0));
  const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
  const m = new THREE.LineBasicMaterial({
    color: i % 4 === 0 ? C.gold : C.red,
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
  });
  filamentGroup.add(new THREE.Line(g, m));
}

// Small hot nucleus
const nucleus = new THREE.Group();
root.add(nucleus);
const heartGlow1 = sprite(C.red, 0.72, 0.07);
const heartGlow2 = sprite(C.gold, 0.55, 0.10);
const heartGlow3 = sprite(C.soft, 0.34, 0.70);
const heartGlow4 = sprite(C.white, 0.12, 1.0);
nucleus.add(heartGlow1, heartGlow2, heartGlow3, heartGlow4);

// Core sparks
const sparkGroup = new THREE.Group();
root.add(sparkGroup);
for (let i = 0; i < 110; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.12 + rnd() * 1.25;
  const s = sprite(i % 5 === 0 ? C.red : (i % 4 === 0 ? C.gold : C.soft), 0.025 + rnd() * 0.021, 0.66);
  s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.88, (rnd() - 0.5) * 0.17);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  sparkGroup.add(s);
}

// Memory nodes spawned by M
const memories = [];
function spawnMemory() {
  const def = orbitDefs[Math.floor(rnd() * orbitDefs.length)];
  const s = sprite(rnd() > 0.45 ? C.soft : C.gold, 0.16, 1);
  s.position.set(0, 0, 0.06);
  root.add(s);
  memories.push({
    sprite: s,
    orbit: def,
    angle: rnd() * Math.PI * 2,
    speed: (0.08 + rnd() * 0.10) * (rnd() > 0.5 ? 1 : -1),
    age: 0,
    launch: 1.2,
  });
}

let paused = false;
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') spawnMemory();
  if (e.key === 'Escape') paused = !paused;
});

const clock = new THREE.Clock();
let t = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) {
    t += dt;
    orbitGroup.rotation.z = Math.sin(t * 0.075) * 0.018;
    coreGroup.rotation.z -= dt * 0.010;
    coreGroup.rotation.x = Math.sin(t * 0.16) * 0.020;
    filamentGroup.rotation.z += dt * 0.008;

    nucleus.scale.setScalar(1 + Math.sin(t * 2.15) * 0.025);
    heartGlow3.material.opacity = 0.66 + Math.sin(t * 2.65) * 0.06;

    for (const child of orbitGroup.children) {
      if (!child.isSprite || !child.userData.orbit) continue;
      child.userData.angle += child.userData.speed * dt;
      child.position.copy(orbitPoint(child.userData.orbit, child.userData.angle));
    }

    for (const s of sparkGroup.children) {
      const p = s.userData.base;
      const wob = 1 + Math.sin(t * 1.5 + s.userData.phase) * 0.028;
      s.position.set(p.x * wob, p.y * wob, p.z);
    }

    for (const mem of memories) {
      mem.age += dt;
      mem.angle += mem.speed * dt;
      const target = orbitPoint(mem.orbit, mem.angle);
      const u = Math.min(1, mem.age / mem.launch);
      const ease = 1 - Math.pow(1 - u, 3);
      mem.sprite.position.lerpVectors(new THREE.Vector3(0, 0, 0.06), target, ease);
      mem.sprite.scale.setScalar(0.16 * (0.35 + 0.65 * ease));
    }
  }

  composer.render();
}

animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
