import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const app = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01050d);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
app.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.65, 0.72, 0.02);
composer.addPass(bloom);

const root = new THREE.Group();
scene.add(root);

const COLORS = {
  red: 0xff214d,
  crimson: 0xff3a57,
  gold: 0xffb31a,
  warm: 0xffd98a,
  white: 0xffffff,
  softWhite: 0xfff2dc,
  blue: 0x75d8ff,
};

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rnd = seeded(22011203);

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.13, 'rgba(255,255,255,.95)');
  g.addColorStop(0.35, 'rgba(255,220,150,.55)');
  g.addColorStop(0.7, 'rgba(255,100,80,.12)');
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

// Background dust / stars
{
  const count = 850;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color(COLORS.red), new THREE.Color(COLORS.gold), new THREE.Color(COLORS.softWhite), new THREE.Color(COLORS.blue)];
  for (let i = 0; i < count; i++) {
    const r = 1.5 + rnd() * 6.8;
    const a = rnd() * Math.PI * 2;
    const yScale = 0.55 + rnd() * 0.55;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * yScale;
    pos[i * 3 + 2] = (rnd() - 0.5) * 2.5;
    const cc = palette[Math.floor(rnd() * palette.length)];
    col[i * 3] = cc.r;
    col[i * 3 + 1] = cc.g;
    col[i * 3 + 2] = cc.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.022, vertexColors: true, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
  const p = new THREE.Points(g, m);
  root.add(p);
}

// Large asymmetric orbital paths
const orbitDefs = [];
const orbitGroup = new THREE.Group();
root.add(orbitGroup);

function makeOrbit(index) {
  const rx = 2.7 + rnd() * 2.2;
  const ry = 0.85 + rnd() * 1.7;
  const zRot = rnd() * Math.PI;
  const xRot = (rnd() - 0.5) * 1.1;
  const yRot = (rnd() - 0.5) * 0.7;
  const offset = new THREE.Vector3((rnd() - 0.5) * 0.35, (rnd() - 0.5) * 0.28, (rnd() - 0.5) * 0.25);
  const color = index % 3 === 0 ? COLORS.gold : COLORS.red;

  const pts = [];
  const segs = 240;
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending });
  const line = new THREE.LineLoop(geom, mat);
  line.rotation.set(xRot, yRot, zRot);
  line.position.copy(offset);
  orbitGroup.add(line);

  const def = { rx, ry, line, phase: rnd() * Math.PI * 2, speed: 0.05 + rnd() * 0.09 };
  orbitDefs.push(def);

  const nodeCount = 3 + Math.floor(rnd() * 3);
  for (let n = 0; n < nodeCount; n++) {
    const s = sprite(n % 3 === 0 ? COLORS.softWhite : color, 0.18 + rnd() * 0.08, 0.9);
    s.userData.angle = (n / nodeCount) * Math.PI * 2 + rnd() * 0.35;
    s.userData.speed = (0.08 + rnd() * 0.13) * (rnd() > 0.5 ? 1 : -1);
    s.userData.orbit = def;
    orbitGroup.add(s);
  }
}
for (let i = 0; i < 9; i++) makeOrbit(i);

function orbitPoint(def, angle) {
  const p = new THREE.Vector3(Math.cos(angle) * def.rx, Math.sin(angle) * def.ry, 0);
  p.applyEuler(def.line.rotation);
  p.add(def.line.position);
  return p;
}

// Central thin technical rings — deliberately delicate, not solid bands
const ringGroup = new THREE.Group();
root.add(ringGroup);
for (let i = 0; i < 13; i++) {
  const r = 0.46 + i * 0.075;
  const pts = [];
  const start = (i * 0.61) % (Math.PI * 2);
  const span = Math.PI * (1.22 + (i % 4) * 0.13);
  for (let k = 0; k < 110; k++) {
    const t = start + (k / 109) * span;
    pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const c = i % 3 === 0 ? COLORS.gold : COLORS.red;
  const m = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.16 + (i % 2) * 0.04, blending: THREE.AdditiveBlending });
  const l = new THREE.Line(g, m);
  l.rotation.z = i * 0.11;
  ringGroup.add(l);
}

// Dense organic core cloud
const corePoints = [];
const coreGeomPositions = [];
const coreColors = [];
const paletteCore = [new THREE.Color(COLORS.white), new THREE.Color(COLORS.warm), new THREE.Color(COLORS.gold), new THREE.Color(COLORS.red)];
for (let i = 0; i < 165; i++) {
  const a = rnd() * Math.PI * 2;
  const rr = Math.pow(rnd(), 0.58) * 1.05;
  const wobble = 1 + 0.11 * Math.sin(3 * a) + 0.07 * Math.sin(7 * a + 0.8);
  const p = new THREE.Vector3(Math.cos(a) * rr * wobble, Math.sin(a) * rr * wobble * 0.92, (rnd() - 0.5) * 0.18);
  corePoints.push(p);
  coreGeomPositions.push(p.x, p.y, p.z);
  const c = paletteCore[Math.floor(rnd() * paletteCore.length)];
  coreColors.push(c.r, c.g, c.b);
}

const corePointGeom = new THREE.BufferGeometry();
corePointGeom.setAttribute('position', new THREE.Float32BufferAttribute(coreGeomPositions, 3));
corePointGeom.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
const corePointMat = new THREE.PointsMaterial({ size: 0.036, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
const corePointMesh = new THREE.Points(corePointGeom, corePointMat);
root.add(corePointMesh);

// Nearest-neighbour filaments
{
  const verts = [];
  for (let i = 0; i < corePoints.length; i++) {
    const ds = [];
    for (let j = 0; j < corePoints.length; j++) {
      if (i === j) continue;
      ds.push([corePoints[i].distanceToSquared(corePoints[j]), j]);
    }
    ds.sort((a, b) => a[0] - b[0]);
    const links = 3 + (i % 3 === 0 ? 1 : 0);
    for (let k = 0; k < links; k++) {
      const j = ds[k][1];
      if (i < j) {
        verts.push(corePoints[i].x, corePoints[i].y, corePoints[i].z, corePoints[j].x, corePoints[j].y, corePoints[j].z);
      }
    }
  }
  // extra long crossing threads
  for (let q = 0; q < 34; q++) {
    const a = Math.floor(rnd() * corePoints.length);
    const b = Math.floor(rnd() * corePoints.length);
    if (a !== b) verts.push(corePoints[a].x, corePoints[a].y, corePoints[a].z, corePoints[b].x, corePoints[b].y, corePoints[b].z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const m = new THREE.LineBasicMaterial({ color: COLORS.softWhite, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending });
  root.add(new THREE.LineSegments(g, m));
}

// Bright heart nucleus and layered bloom sprites
const nucleus = new THREE.Group();
root.add(nucleus);
const heartGlow1 = sprite(COLORS.red, 1.55, 0.17);
const heartGlow2 = sprite(COLORS.gold, 1.12, 0.22);
const heartGlow3 = sprite(COLORS.softWhite, 0.62, 0.9);
const heartGlow4 = sprite(COLORS.white, 0.22, 1.0);
nucleus.add(heartGlow1, heartGlow2, heartGlow3, heartGlow4);

// Tiny hot sparks inside/around heart
const sparkGroup = new THREE.Group();
root.add(sparkGroup);
for (let i = 0; i < 80; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.25 + rnd() * 1.35;
  const s = sprite(i % 4 === 0 ? COLORS.red : (i % 3 === 0 ? COLORS.gold : COLORS.softWhite), 0.045 + rnd() * 0.035, 0.7);
  s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.88, (rnd() - 0.5) * 0.2);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  sparkGroup.add(s);
}

// Memory nodes spawned by M
const memories = [];
function spawnMemory() {
  const def = orbitDefs[Math.floor(rnd() * orbitDefs.length)];
  const s = sprite(rnd() > 0.5 ? COLORS.softWhite : COLORS.gold, 0.24, 1);
  s.position.set(0, 0, 0.08);
  root.add(s);
  memories.push({
    sprite: s,
    orbit: def,
    angle: rnd() * Math.PI * 2,
    speed: (0.10 + rnd() * 0.12) * (rnd() > 0.5 ? 1 : -1),
    age: 0,
    launch: 1.15,
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
    orbitGroup.rotation.z = Math.sin(t * 0.08) * 0.025;
    ringGroup.rotation.z += dt * 0.025;
    corePointMesh.rotation.z -= dt * 0.035;

    nucleus.scale.setScalar(1 + Math.sin(t * 2.2) * 0.035);
    heartGlow3.material.opacity = 0.82 + Math.sin(t * 2.8) * 0.12;

    for (const child of orbitGroup.children) {
      if (!child.isSprite || !child.userData.orbit) continue;
      child.userData.angle += child.userData.speed * dt;
      child.position.copy(orbitPoint(child.userData.orbit, child.userData.angle));
    }

    for (const s of sparkGroup.children) {
      const p = s.userData.base;
      const wob = 1 + Math.sin(t * 1.6 + s.userData.phase) * 0.035;
      s.position.set(p.x * wob, p.y * wob, p.z);
    }

    for (const mem of memories) {
      mem.age += dt;
      mem.angle += mem.speed * dt;
      const target = orbitPoint(mem.orbit, mem.angle);
      const u = Math.min(1, mem.age / mem.launch);
      const ease = 1 - Math.pow(1 - u, 3);
      const bend = Math.sin(ease * Math.PI) * 0.32;
      mem.sprite.position.lerpVectors(new THREE.Vector3(0, 0, 0.08), target, ease);
      mem.sprite.position.x += bend * Math.sin(mem.angle + 1.4);
      mem.sprite.position.y += bend * Math.cos(mem.angle + 1.4);
      mem.sprite.scale.setScalar(0.12 + ease * 0.12);
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
