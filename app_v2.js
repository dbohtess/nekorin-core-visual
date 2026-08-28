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
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.28, 0.52, 0.04);
composer.addPass(bloom);

const root = new THREE.Group();
scene.add(root);

const COLORS = {
  red: 0xff2447,
  crimson: 0xff4b5f,
  gold: 0xffb01e,
  warm: 0xffd69a,
  white: 0xffffff,
  softWhite: 0xfff5df,
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

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.11, 'rgba(255,255,255,.98)');
  g.addColorStop(0.28, 'rgba(255,225,165,.58)');
  g.addColorStop(0.58, 'rgba(255,95,72,.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = radialTexture();

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

// Sparse star field
{
  const count = 620;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color(COLORS.red), new THREE.Color(COLORS.gold), new THREE.Color(COLORS.softWhite), new THREE.Color(COLORS.blue)];
  for (let i = 0; i < count; i++) {
    const r = 2.0 + rnd() * 6.2;
    const a = rnd() * Math.PI * 2;
    const ys = 0.48 + rnd() * 0.46;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * ys;
    pos[i * 3 + 2] = (rnd() - 0.5) * 1.7;
    const c = palette[Math.floor(rnd() * palette.length)];
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false });
  root.add(new THREE.Points(g, m));
}

// Outer paths: fewer, smaller, thinner, closer to the reference framing
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
  const color = index % 3 === 0 ? COLORS.gold : COLORS.red;

  const pts = [];
  const segs = 220;
  const start = rnd() * Math.PI * 2;
  const span = Math.PI * (1.58 + rnd() * 0.32); // broken, not full loops
  for (let i = 0; i < segs; i++) {
    const t = start + (i / (segs - 1)) * span;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geom, mat);
  line.rotation.set(xRot, yRot, zRot);
  line.position.copy(offset);
  orbitGroup.add(line);

  const def = { rx, ry, line, phase: rnd() * Math.PI * 2 };
  orbitDefs.push(def);

  const nodeCount = 2 + Math.floor(rnd() * 3);
  for (let n = 0; n < nodeCount; n++) {
    const s = sprite(n % 3 === 0 ? COLORS.softWhite : color, 0.11 + rnd() * 0.05, 0.82);
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

// Fine broken technical rings around the core
const ringGroup = new THREE.Group();
root.add(ringGroup);
for (let i = 0; i < 11; i++) {
  const r = 0.52 + i * 0.064;
  const pts = [];
  const start = (i * 0.73 + 0.4) % (Math.PI * 2);
  const span = Math.PI * (0.82 + (i % 4) * 0.12);
  for (let k = 0; k < 100; k++) {
    const t = start + (k / 99) * span;
    pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const c = i % 3 === 0 ? COLORS.gold : COLORS.red;
  const m = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.10 + (i % 2) * 0.03, blending: THREE.AdditiveBlending });
  const l = new THREE.Line(g, m);
  l.rotation.z = i * 0.14;
  ringGroup.add(l);
}

// Dense living core mesh
const coreGroup = new THREE.Group();
root.add(coreGroup);
const corePoints = [];
const corePositions = [];
const coreColors = [];
const paletteCore = [new THREE.Color(COLORS.white), new THREE.Color(COLORS.softWhite), new THREE.Color(COLORS.warm), new THREE.Color(COLORS.gold)];

for (let i = 0; i < 235; i++) {
  const a = rnd() * Math.PI * 2;
  const rr = Math.pow(rnd(), 0.52) * 1.18;
  const wobble = 1 + 0.13 * Math.sin(3 * a + 0.6) + 0.07 * Math.sin(7 * a + 1.4);
  const p = new THREE.Vector3(
    Math.cos(a) * rr * wobble,
    Math.sin(a) * rr * wobble * 0.90,
    (rnd() - 0.5) * 0.20
  );
  corePoints.push(p);
  corePositions.push(p.x, p.y, p.z);
  const c = paletteCore[Math.floor(rnd() * paletteCore.length)];
  coreColors.push(c.r, c.g, c.b);
}

const pointGeom = new THREE.BufferGeometry();
pointGeom.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3));
pointGeom.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
const pointMat = new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
coreGroup.add(new THREE.Points(pointGeom, pointMat));

// nearest-neighbour + crossing filaments
{
  const verts = [];
  for (let i = 0; i < corePoints.length; i++) {
    const ds = [];
    for (let j = 0; j < corePoints.length; j++) {
      if (i === j) continue;
      ds.push([corePoints[i].distanceToSquared(corePoints[j]), j]);
    }
    ds.sort((a, b) => a[0] - b[0]);
    const links = 4 + (i % 5 === 0 ? 1 : 0);
    for (let k = 0; k < links; k++) {
      const j = ds[k][1];
      if (i < j) {
        verts.push(corePoints[i].x, corePoints[i].y, corePoints[i].z, corePoints[j].x, corePoints[j].y, corePoints[j].z);
      }
    }
  }
  for (let q = 0; q < 56; q++) {
    const a = Math.floor(rnd() * corePoints.length);
    const b = Math.floor(rnd() * corePoints.length);
    if (a !== b) {
      verts.push(corePoints[a].x, corePoints[a].y, corePoints[a].z, corePoints[b].x, corePoints[b].y, corePoints[b].z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const m = new THREE.LineBasicMaterial({ color: COLORS.softWhite, transparent: true, opacity: 0.44, blending: THREE.AdditiveBlending });
  coreGroup.add(new THREE.LineSegments(g, m));
}

// Warm/red filament accents
{
  const verts = [];
  for (let q = 0; q < 70; q++) {
    const a = Math.floor(rnd() * corePoints.length);
    const b = Math.floor(rnd() * corePoints.length);
    if (a !== b && corePoints[a].distanceTo(corePoints[b]) < 1.35) {
      verts.push(corePoints[a].x, corePoints[a].y, corePoints[a].z, corePoints[b].x, corePoints[b].y, corePoints[b].z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const m = new THREE.LineBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending });
  coreGroup.add(new THREE.LineSegments(g, m));
}

// Nucleus: smaller but hotter, less blob-like
const nucleus = new THREE.Group();
root.add(nucleus);
const heartGlow1 = sprite(COLORS.red, 1.20, 0.10);
const heartGlow2 = sprite(COLORS.gold, 0.86, 0.15);
const heartGlow3 = sprite(COLORS.softWhite, 0.50, 0.82);
const heartGlow4 = sprite(COLORS.white, 0.16, 1.0);
nucleus.add(heartGlow1, heartGlow2, heartGlow3, heartGlow4);

// Hot sparks concentrated around the heart
const sparkGroup = new THREE.Group();
root.add(sparkGroup);
for (let i = 0; i < 105; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.18 + rnd() * 1.22;
  const s = sprite(i % 5 === 0 ? COLORS.red : (i % 4 === 0 ? COLORS.gold : COLORS.softWhite), 0.030 + rnd() * 0.026, 0.72);
  s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.88, (rnd() - 0.5) * 0.18);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  sparkGroup.add(s);
}

// Memories created with M
const memories = [];
function spawnMemory() {
  const def = orbitDefs[Math.floor(rnd() * orbitDefs.length)];
  const s = sprite(rnd() > 0.45 ? COLORS.softWhite : COLORS.gold, 0.16, 1);
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
  if (!paused) t += dt;

  if (!paused) {
    orbitGroup.rotation.z = Math.sin(t * 0.075) * 0.018;
    ringGroup.rotation.z += dt * 0.020;
    coreGroup.rotation.z -= dt * 0.018;
    coreGroup.rotation.x = Math.sin(t * 0.16) * 0.025;

    nucleus.scale.setScalar(1 + Math.sin(t * 2.15) * 0.025);
    heartGlow3.material.opacity = 0.76 + Math.sin(t * 2.65) * 0.08;

    for (const child of orbitGroup.children) {
      if (!child.isSprite || !child.userData.orbit) continue;
      child.userData.angle += child.userData.speed * dt;
      child.position.copy(orbitPoint(child.userData.orbit, child.userData.angle));
    }

    for (const s of sparkGroup.children) {
      const p = s.userData.base;
      const wob = 1 + Math.sin(t * 1.7 + s.userData.phase) * 0.028;
      s.position.set(p.x * wob, p.y * wob, p.z);
    }

    for (const mem of memories) {
      mem.age += dt;
      mem.angle += mem.speed * dt;
      const target = orbitPoint(mem.orbit, mem.angle);
      const u = Math.min(1, mem.age / mem.launch);
      const ease = 1 - Math.pow(1 - u, 3);
      const bend = Math.sin(ease * Math.PI) * 0.24;
      mem.sprite.position.lerpVectors(new THREE.Vector3(0, 0, 0.06), target, ease);
      mem.sprite.position.x += bend * Math.sin(mem.angle + 1.1);
      mem.sprite.position.y += bend * Math.cos(mem.angle + 1.1);
      const pulse = 0.94 + Math.sin(t * 4.0 + mem.angle) * 0.08;
      mem.sprite.scale.setScalar(0.16 * pulse);
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
