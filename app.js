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
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const rnd = seeded(22112003);

function makeGlowTexture() { const c=document.createElement('canvas'); c.width=c.height=128; const ctx=c.getContext('2d'); const g=ctx.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.12,'rgba(255,255,255,.96)'); g.addColorStop(.30,'rgba(255,225,165,.50)'); g.addColorStop(.62,'rgba(255,90,65,.10)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); }
const glowTex=makeGlowTexture();
function sprite(color,size,opacity=1){const material=new THREE.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});const s=new THREE.Sprite(material);s.scale.setScalar(size);return s;}

{ const count=620,pos=new Float32Array(count*3),col=new Float32Array(count*3),palette=[new THREE.Color(C.red),new THREE.Color(C.gold),new THREE.Color(C.soft),new THREE.Color(C.blue)]; for(let i=0;i<count;i++){const r=2+rnd()*6.2,a=rnd()*Math.PI*2,ys=.48+rnd()*.46;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.sin(a)*r*ys;pos[i*3+2]=(rnd()-.5)*1.7;const c=palette[Math.floor(rnd()*palette.length)];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;} const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));root.add(new THREE.Points(g,new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false}))); }

const orbitDefs=[],orbitGroup=new THREE.Group();root.add(orbitGroup);
function makeOrbit(index){
  // Existing paths: keep their character, but cap the last tall orbit that clipped at the bottom.
  let rx=2.20+rnd()*1.20, ry=.70+rnd()*.90;
  if(index===6){ rx*=0.86; ry*=0.78; }
  const zRot=rnd()*Math.PI,xRot=(rnd()-.5)*.82,yRot=(rnd()-.5)*.46,offset=new THREE.Vector3((rnd()-.5)*.22,(rnd()-.5)*.16,(rnd()-.5)*.14),color=index%3===0?C.gold:C.red;
  const pts=[],start=rnd()*Math.PI*2;for(let i=0;i<220;i++){const t=start+(i/219)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*rx,Math.sin(t)*ry,0));}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:.15,blending:THREE.AdditiveBlending}));line.rotation.set(xRot,yRot,zRot);line.position.copy(offset);orbitGroup.add(line);
  const def={rx,ry,line};orbitDefs.push(def);const s=sprite(index%3===0?C.soft:color,.11+rnd()*.05,.82);s.userData.angle=rnd()*Math.PI*2;s.userData.speed=(.21+rnd()*.30)*(rnd()>.5?1:-1);s.userData.orbit=def;orbitGroup.add(s);
}
for(let i=0;i<7;i++)makeOrbit(i);
function orbitPoint(def,angle){const p=new THREE.Vector3(Math.cos(angle)*def.rx,Math.sin(angle)*def.ry,0);p.applyEuler(def.line.rotation);p.add(def.line.position);return p;}

const core=new THREE.Group();root.add(core);for(let i=0;i<115;i++){const a=rnd()*Math.PI*2,r=.12+Math.pow(rnd(),.72)*1.08,wobble=1+.08*Math.sin(3*a+.5),color=i%8===0?C.red:(i%5===0?C.gold:C.soft),s=sprite(color,.018+rnd()*.028,.38+rnd()*.34);s.position.set(Math.cos(a)*r*wobble,Math.sin(a)*r*wobble*.86,(rnd()-.5)*.12);s.userData.base=s.position.clone();s.userData.phase=rnd()*Math.PI*2;core.add(s);}
const nucleus=new THREE.Group();root.add(nucleus);const glowRed=sprite(C.red,3.84,.055),glowGold=sprite(C.gold,2.88,.085),glowSoft=sprite(C.soft,1.74,.64),glowWhite=sprite(C.white,.63,1);nucleus.add(glowRed,glowGold,glowSoft,glowWhite);
const sparks=new THREE.Group();root.add(sparks);for(let i=0;i<85;i++){const a=rnd()*Math.PI*2,r=.42+rnd()*1.16,color=i%6===0?C.red:(i%4===0?C.gold:C.soft),s=sprite(color,.020+rnd()*.018,.52);s.position.set(Math.cos(a)*r,Math.sin(a)*r*.88,(rnd()-.5)*.10);s.userData.base=s.position.clone();s.userData.phase=rnd()*Math.PI*2;sparks.add(s);}

const memories=[],memoryOrbitSignatures=[];
function angleDistance(a,b){let d=Math.abs(a-b)%(Math.PI*2);return Math.min(d,Math.PI*2-d);}
function createUniqueMemoryOrbit(){for(let attempt=0;attempt<100;attempt++){const rx=2.15+rnd()*.95,ry=.72+rnd()*.72,tiltX=(rnd()-.5)*.62,tiltY=(rnd()-.5)*.34,tiltZ=rnd()*Math.PI,offset=new THREE.Vector3((rnd()-.5)*.16,(rnd()-.5)*.12,(rnd()-.5)*.08);const tooClose=memoryOrbitSignatures.some(o=>Math.abs(o.rx-rx)<.20&&Math.abs(o.ry-ry)<.16&&angleDistance(o.tiltZ,tiltZ)<.18&&Math.abs(o.tiltX-tiltX)<.13&&Math.abs(o.tiltY-tiltY)<.11);if(tooClose)continue;memoryOrbitSignatures.push({rx,ry,tiltX,tiltY,tiltZ});const segments=220,positions=new Float32Array((segments+1)*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x4fc3f7,transparent:true,opacity:.60,blending:THREE.AdditiveBlending}));line.rotation.set(tiltX,tiltY,tiltZ);line.position.copy(offset);root.add(line);return{rx,ry,line,segments};}throw new Error('Could not generate a unique memory orbit');}
function memoryOrbitPoint(def,angle){const p=new THREE.Vector3(Math.cos(angle)*def.rx,Math.sin(angle)*def.ry,0);p.applyEuler(def.line.rotation);p.add(def.line.position);return p;}
function drawMemoryOrbitBehind(mem){const count=Math.min(mem.orbit.segments+1,Math.max(2,Math.floor(mem.progress*mem.orbit.segments)+1)),attr=mem.orbit.line.geometry.getAttribute('position');for(let i=0;i<count;i++){const u=i/mem.orbit.segments,angle=mem.startAngle+mem.direction*u*Math.PI*2,p=new THREE.Vector3(Math.cos(angle)*mem.orbit.rx,Math.sin(angle)*mem.orbit.ry,0);attr.setXYZ(i,p.x,p.y,p.z);}attr.needsUpdate=true;mem.orbit.line.geometry.setDrawRange(0,count);}
function spawnMemory(){const def=createUniqueMemoryOrbit(),s=sprite(rnd()>.45?C.soft:C.gold,.16,1);s.position.set(0,0,.06);root.add(s);const startAngle=rnd()*Math.PI*2,direction=rnd()>.5?1:-1;memories.push({sprite:s,orbit:def,angle:startAngle,startAngle,direction,speed:(.28+rnd()*.40)*direction,age:0,launch:1.2,drawing:true,progress:0,traveled:0});}
let paused=false;addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m')spawnMemory();if(e.key==='Escape')paused=!paused;});
const clock=new THREE.Clock();let t=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused){t+=dt;orbitGroup.rotation.z=Math.sin(t*.075)*.018;core.rotation.z-=dt*.020;nucleus.scale.setScalar(1+Math.sin(t*2.15)*.022);glowSoft.material.opacity=.60+Math.sin(t*2.65)*.05;
for(const child of orbitGroup.children){if(!child.isSprite||!child.userData.orbit)continue;child.userData.angle+=child.userData.speed*dt;child.position.copy(orbitPoint(child.userData.orbit,child.userData.angle));}
for(const s of core.children){const p=s.userData.base,wobble=1+Math.sin(t*1.45+s.userData.phase)*.024;s.position.set(p.x*wobble,p.y*wobble,p.z);}for(const s of sparks.children){const p=s.userData.base,wobble=1+Math.sin(t*1.5+s.userData.phase)*.022;s.position.set(p.x*wobble,p.y*wobble,p.z);}
for(const mem of memories){mem.age+=dt;if(mem.age<mem.launch){const u=mem.age/mem.launch,ease=1-Math.pow(1-u,3),first=memoryOrbitPoint(mem.orbit,mem.startAngle);mem.sprite.position.lerpVectors(new THREE.Vector3(0,0,.06),first,ease);mem.sprite.scale.setScalar(.16*(.35+.65*ease));continue;}const step=Math.abs(mem.speed)*dt;mem.angle+=mem.speed*dt;mem.traveled+=step;mem.sprite.position.copy(memoryOrbitPoint(mem.orbit,mem.angle));if(mem.drawing){mem.progress=Math.min(1,mem.traveled/(Math.PI*2));drawMemoryOrbitBehind(mem);if(mem.progress>=1){mem.drawing=false;mem.orbit.line.geometry.setDrawRange(0,mem.orbit.segments+1);mem.orbit.line.material.color.setHex(C.red);mem.orbit.line.material.opacity=.15;mem.orbit.line.material.needsUpdate=true;}}}}
composer.render();}
animate();addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});