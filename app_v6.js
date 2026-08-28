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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.14, 0.44, 0.055));

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
  g.addColorStop(0.30, 'rgba(255,225,165,.50)');
  g.addColorStop(0.62, 'rgba(255,90,65,.10)');
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
  root.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
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

// ===== ORDERED HEART LATTICE =====
// Instead of a random point cloud, use three irregular rings of anchor points.
const heart = new THREE.Group();
root.add(heart);

function makeAnchorRing(count, radius, squish, phase, jitter) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    const rr = radius * (1 + Math.sin(i * 1.7 + phase) * jitter);
    pts.push(new THREE.Vector3(
      Math.cos(a) * rr,
      Math.sin(a) * rr * squish,
      (i % 2 === 0 ? 1 : -1) * 0.018
    ));
  }
  return pts;
}

const outer = makeAnchorRing(18, 1.06, 0.86, 0.18, 0.07);
const middle = makeAnchorRing(12, 0.72, 0.90, 0.44, 0.06);
const inner = makeAnchorRing(7, 0.38, 0.94, 0.12, 0.05);
const anchorPoints = [...outer, ...middle, ...inner];

// point glow at lattice vertices
{
  const positions = [];
  const colors = [];
  const palette = [new THREE.Color(C.soft), new THREE.Color(C.warm), new THREE.Color(C.gold)];
  for (let i = 0; i < anchorPoints.length; i++) {
    const p = anchorPoints[i];
    positions.push(p.x, p.y, p.z);
    const c = palette[i % palette.length];
    colors.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  heart.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
}

function addSegment(list, a, b) {
  list.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

// carefully controlled geometry: perimeter + selected diagonals between neighboring layers
{
  const whiteVerts = [];

  // perimeter segments
  for (let i = 0; i < outer.length; i++) addSegment(whiteVerts, outer[i], outer[(i + 1) % outer.length]);
  for (let i = 0; i < middle.length; i++) addSegment(whiteVerts, middle[i], middle[(i + 1) % middle.length]);
  for (let i = 0; i < inner.length; i++) addSegment(whiteVerts, inner[i], inner[(i + 1) % inner.length]);

  // outer -> middle connectors, regularly spaced
  for (let i = 0; i < outer.length; i += 2) {
    const j = Math.round((i / outer.length) * middle.length) % middle.length;
    addSegment(whiteVerts, outer[i], middle[j]);
    addSegment(whiteVerts, outer[(i + 1) % outer.length], middle[(j + 1) % middle.length]);
  }

  // middle -> inner connectors
  for (let i = 0; i < middle.length; i += 2) {
    const j = Math.round((i / middle.length) * inner.length) % inner.length;
    addSegment(whiteVerts, middle[i], inner[j]);
  }

  // a handful of elegant cross braces only
  for (let i = 0; i < outer.length; i += 3) {
    addSegment(whiteVerts, outer[i], outer[(i + 5) % outer.length]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(whiteVerts, 3));
  heart.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: C.soft,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
  })));
}

// warm accent braces - few only
{
  const warmVerts = [];
  for (let i = 0; i < middle.length; i += 3) {
    addSegment(warmVerts, middle[i], middle[(i + 4) % middle.length]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(warmVerts, 3));
  heart.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: C.red,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
  })));
}

// small hot nucleus - no huge disk
const nucleus = new THREE.Group();
root.add(nucleus);
const heartGlow1 = sprite(C.red, 0.66, 0.06);
const heartGlow2 = sprite(C.gold, 0.50, 0.09);
const heartGlow3 = sprite(C.soft, 0.30, 0.66);
const heartGlow4 = sprite(C.white, 0.11, 1.0);
nucleus.add(heartGlow1, heartGlow2, heartGlow3, heartGlow4);

// fine sparks around heart, not inside it excessively
const sparkGroup = new THREE.Group();
root.add(sparkGroup);
for (let i = 0; i < 80; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.48 + rnd() * 1.05;
  const s = sprite(i % 5 === 0 ? C.red : (i % 4 === 0 ? C.gold : C.soft), 0.022 + rnd() * 0.018, 0.58);
  s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.88, (rnd() - 0.5) * 0.12);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  sparkGroup.add(s);
}

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
    heart.rotation.z -= dt * 0.012;
    heart.rotation.x = Math.sin(t * 0.18) * 0.018;
    nucleus.scale.setScalar(1 + Math.sin(t * 2.15) * 0.022);
    heartGlow3.material.opacity = 0.62 + Math.sin(t * 2.65) * 0.05;

    for (const child of orbitGroup.children) {
      if (!child.isSprite || !child.userData.orbit) continue;
      child.userData.angle += child.userData.speed * dt;
      child.position.copy(orbitPoint(child.userData.orbit, child.userData.angle));
    }

    for (const s of sparkGroup.children) {
      const p = s.userData.base;
      const wob = 1 + Math.sin(t * 1.5 + s.userData.phase) * 0.024;
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
