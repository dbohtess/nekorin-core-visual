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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.16, 0.46, 0.055));

const root = new THREE.Group();
scene.add(root);

const C = { red: 0xff2447, gold: 0xffb01e, warm: 0xffd69a, white: 0xffffff, soft: 0xfff5df, blue: 0x83d8ff };

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
  const material = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(material);
  s.scale.setScalar(size);
  return s;
}

// Background particles.
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
    const c = palette[Math.floor(rnd() * palette.length)];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false })));
}

// Existing visual paths: exactly ONE node on each path.
const orbitDefs = [];
const orbitGroup = new THREE.Group();
root.add(orbitGroup);

function makeOrbit(index) {
  // Keep the original paths varied, but stop the largest ones from clipping off-screen.
  const rx = 2.20 + rnd() * 1.20;
  const ry = 0.70 + rnd() * 0.90;
  const zRot = rnd() * Math.PI;
  const xRot = (rnd() - 0.5) * 0.82;
  const yRot = (rnd() - 0.5) * 0.46;
  const offset = new THREE.Vector3((rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.14);
  const color = index % 3 === 0 ? C.gold : C.red;

  const pts = [];
  const start = rnd() * Math.PI * 2;
  for (let i = 0; i < 220; i++) {
    const t = start + (i / 219) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
  }

  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
  line.rotation.set(xRot, yRot, zRot);
  line.position.copy(offset);
  orbitGroup.add(line);

  const def = { rx, ry, line };
  orbitDefs.push(def);

  const s = sprite(index % 3 === 0 ? C.soft : color, 0.11 + rnd() * 0.05, 0.82);
  s.userData.angle = rnd() * Math.PI * 2;
  s.userData.speed = (0.21 + rnd() * 0.30) * (rnd() > 0.5 ? 1 : -1);
  s.userData.orbit = def;
  orbitGroup.add(s);
}
for (let i = 0; i < 7; i++) makeOrbit(i);

function orbitPoint(def, angle) {
  const p = new THREE.Vector3(Math.cos(angle) * def.rx, Math.sin(angle) * def.ry, 0);
  p.applyEuler(def.line.rotation);
  p.add(def.line.position);
  return p;
}

// CLEAN CORE.
const core = new THREE.Group();
root.add(core);
for (let i = 0; i < 115; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.12 + Math.pow(rnd(), 0.72) * 1.08;
  const wobble = 1 + 0.08 * Math.sin(3 * a + 0.5);
  const color = i % 8 === 0 ? C.red : (i % 5 === 0 ? C.gold : C.soft);
  const s = sprite(color, 0.018 + rnd() * 0.028, 0.38 + rnd() * 0.34);
  s.position.set(Math.cos(a) * r * wobble, Math.sin(a) * r * wobble * 0.86, (rnd() - 0.5) * 0.12);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  core.add(s);
}

const nucleus = new THREE.Group();
root.add(nucleus);
const glowRed = sprite(C.red, 3.84, 0.055);
const glowGold = sprite(C.gold, 2.88, 0.085);
const glowSoft = sprite(C.soft, 1.74, 0.64);
const glowWhite = sprite(C.white, 0.63, 1.0);
nucleus.add(glowRed, glowGold, glowSoft, glowWhite);

const sparks = new THREE.Group();
root.add(sparks);
for (let i = 0; i < 85; i++) {
  const a = rnd() * Math.PI * 2;
  const r = 0.42 + rnd() * 1.16;
  const color = i % 6 === 0 ? C.red : (i % 4 === 0 ? C.gold : C.soft);
  const s = sprite(color, 0.020 + rnd() * 0.018, 0.52);
  s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.88, (rnd() - 0.5) * 0.10);
  s.userData.base = s.position.clone();
  s.userData.phase = rnd() * Math.PI * 2;
  sparks.add(s);
}

// M creates ONE new persistent memory node with ONE brand-new orbit.
// New memory paths stay compact/on-screen, draw in blue, then become red at 100%.
const memories = [];
const memoryOrbitSignatures = [];

function angleDistance(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(d, Math.PI * 2 - d);
}

function createUniqueMemoryOrbit() {
  for (let attempt = 0; attempt < 100; attempt++) {
    // Keep new memories inside the same visual field as the original paths.
    const rx = 2.15 + rnd() * 0.95;
    const ry = 0.72 + rnd() * 0.72;
    const tiltX = (rnd() - 0.5) * 0.62;
    const tiltY = (rnd() - 0.5) * 0.34;
    const tiltZ = rnd() * Math.PI;
    const offset = new THREE.Vector3((rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.08);

    const tooClose = memoryOrbitSignatures.some(o =>
      Math.abs(o.rx - rx) < 0.20 &&
      Math.abs(o.ry - ry) < 0.16 &&
      angleDistance(o.tiltZ, tiltZ) < 0.18 &&
      Math.abs(o.tiltX - tiltX) < 0.13 &&
      Math.abs(o.tiltY - tiltY) < 0.11
    );
    if (tooClose) continue;

    memoryOrbitSignatures.push({ rx, ry, tiltX, tiltY, tiltZ });

    const segments = 220;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.60,
        blending: THREE.AdditiveBlending,
      })
    );
    line.rotation.set(tiltX, tiltY, tiltZ);
    line.position.copy(offset);
    root.add(line);

    return { rx, ry, line, segments };
  }

  throw new Error('Could not generate a unique memory orbit');
}

function memoryOrbitPoint(def, angle) {
  const p = new THREE.Vector3(
    Math.cos(angle) * def.rx,
    Math.sin(angle) * def.ry,
    0
  );
  p.applyEuler(def.line.rotation);
  p.add(def.line.position);
  return p;
}

function drawMemoryOrbitBehind(mem) {
  const count = Math.min(
    mem.orbit.segments + 1,
    Math.max(2, Math.floor(mem.progress * mem.orbit.segments) + 1)
  );

  const attr = mem.orbit.line.geometry.getAttribute('position');

  for (let i = 0; i < count; i++) {
    const u = i / mem.orbit.segments;
    const angle = mem.startAngle + mem.direction * u * Math.PI * 2;
    const p = new THREE.Vector3(
      Math.cos(angle) * mem.orbit.rx,
      Math.sin(angle) * mem.orbit.ry,
      0
    );
    attr.setXYZ(i, p.x, p.y, p.z);
  }

  attr.needsUpdate = true;
  mem.orbit.line.geometry.setDrawRange(0, count);
}

function spawnMemory() {
  const def = createUniqueMemoryOrbit();

  const s = sprite(rnd() > 0.45 ? C.soft : C.gold, 0.16, 1);
  s.position.set(0, 0, 0.06);
  root.add(s);

  const startAngle = rnd() * Math.PI * 2;
  const direction = rnd() > 0.5 ? 1 : -1;

  memories.push({
    sprite: s,
    orbit: def,
    angle: startAngle,
    startAngle,
    direction,
    speed: (0.28 + rnd() * 0.40) * direction,
    age: 0,
    launch: 1.2,
    drawing: true,
    progress: 0,
    traveled: 0,
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
    core.rotation.z -= dt * 0.020;
    nucleus.scale.setScalar(1 + Math.sin(t * 2.15) * 0.022);
    glowSoft.material.opacity = 0.60 + Math.sin(t * 2.65) * 0.05;

    for (const child of orbitGroup.children) {
      if (!child.isSprite || !child.userData.orbit) continue;
      child.userData.angle += child.userData.speed * dt;
      child.position.copy(orbitPoint(child.userData.orbit, child.userData.angle));
    }

    for (const s of core.children) {
      const p = s.userData.base;
      const wobble = 1 + Math.sin(t * 1.45 + s.userData.phase) * 0.024;
      s.position.set(p.x * wobble, p.y * wobble, p.z);
    }

    for (const s of sparks.children) {
      const p = s.userData.base;
      const wobble = 1 + Math.sin(t * 1.5 + s.userData.phase) * 0.022;
      s.position.set(p.x * wobble, p.y * wobble, p.z);
    }

    for (const mem of memories) {
      mem.age += dt;

      // First: the new memory leaves the core. Orbit stays invisible here.
      if (mem.age < mem.launch) {
        const u = mem.age / mem.launch;
        const ease = 1 - Math.pow(1 - u, 3);
        const first = memoryOrbitPoint(mem.orbit, mem.startAngle);
        mem.sprite.position.lerpVectors(new THREE.Vector3(0, 0, 0.06), first, ease);
        mem.sprite.scale.setScalar(0.16 * (0.35 + 0.65 * ease));
        continue;
      }

      // Then: it travels on ONLY its own new orbit.
      const step = Math.abs(mem.speed) * dt;
      mem.angle += mem.speed * dt;
      mem.traveled += step;
      mem.sprite.position.copy(memoryOrbitPoint(mem.orbit, mem.angle));

      // 0-99% = blue. At exactly 100% the completed path becomes red.
      if (mem.drawing) {
        mem.progress = Math.min(1, mem.traveled / (Math.PI * 2));
        drawMemoryOrbitBehind(mem);

        if (mem.progress >= 1) {
          mem.drawing = false;
          mem.orbit.line.geometry.setDrawRange(0, mem.orbit.segments + 1);
          mem.orbit.line.material.color.setHex(C.red);
          mem.orbit.line.material.opacity = 0.15;
          mem.orbit.line.material.needsUpdate = true;
        }
      }
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
