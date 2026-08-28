import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const app=document.getElementById('app');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x01040b);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,100);camera.position.set(0,0,8.8);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;app.appendChild(renderer.domElement);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.12,.42,.06));
const root=new THREE.Group();scene.add(root);
const C={red:0xff2447,gold:0xffb01e,soft:0xfff5df,white:0xffffff,blue:0x83d8ff};
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}const rnd=seeded(22112003);
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.95)');g.addColorStop(.34,'rgba(255,220,150,.44)');g.addColorStop(.68,'rgba(255,70,65,.08)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}const glowTex=glowTexture();
function sprite(color,size,opacity=1){const m=new THREE.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});const s=new THREE.Sprite(m);s.scale.setScalar(size);return s}

// sparse background
{const n=520,p=new Float32Array(n*3),co=new Float32Array(n*3),pal=[new THREE.Color(C.red),new THREE.Color(C.gold),new THREE.Color(C.soft),new THREE.Color(C.blue)];for(let i=0;i<n;i++){const r=2+rnd()*6.2,a=rnd()*Math.PI*2,ys=.48+rnd()*.46;p[i*3]=Math.cos(a)*r;p[i*3+1]=Math.sin(a)*r*ys;p[i*3+2]=(rnd()-.5)*1.7;const q=pal[Math.floor(rnd()*pal.length)];co[i*3]=q.r;co[i*3+1]=q.g;co[i*3+2]=q.b}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(co,3));root.add(new THREE.Points(g,new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false})))}

// outer memory paths only
const orbitDefs=[],orbitGroup=new THREE.Group();root.add(orbitGroup);
function makeOrbit(index){const rx=2.35+rnd()*1.55,ry=.72+rnd()*1.05,z=rnd()*Math.PI,x=(rnd()-.5)*.82,y=(rnd()-.5)*.46,offset=new THREE.Vector3((rnd()-.5)*.26,(rnd()-.5)*.20,(rnd()-.5)*.16),color=index%3===0?C.gold:C.red,pts=[],start=rnd()*Math.PI*2,span=Math.PI*(1.58+rnd()*.32);for(let i=0;i<220;i++){const t=start+i/219*span;pts.push(new THREE.Vector3(Math.cos(t)*rx,Math.sin(t)*ry,0))}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:.16,blending:THREE.AdditiveBlending}));line.rotation.set(x,y,z);line.position.copy(offset);orbitGroup.add(line);const def={rx,ry,line};orbitDefs.push(def);for(let n=0;n<2+Math.floor(rnd()*3);n++){const s=sprite(n%3===0?C.soft:color,.11+rnd()*.05,.8);s.userData={angle:rnd()*Math.PI*2,speed:(.07+rnd()*.1)*(rnd()>.5?1:-1),orbit:def};orbitGroup.add(s)}}for(let i=0;i<7;i++)makeOrbit(i);
function orbitPoint(def,a){const p=new THREE.Vector3(Math.cos(a)*def.rx,Math.sin(a)*def.ry,0);p.applyEuler(def.line.rotation);return p.add(def.line.position)}

// CLEAN CENTER: NO WHITE LINES, NO POLYGONS, NO INNER RINGS
const heart=new THREE.Group();root.add(heart);
for(let i=0;i<125;i++){const a=rnd()*Math.PI*2,r=.14+Math.pow(rnd(),.72)*1.0,w=1+.08*Math.sin(3*a+.4);const s=sprite(i%8===0?C.red:i%6===0?C.gold:C.soft,.016+rnd()*.024,.32+rnd()*.36);s.position.set(Math.cos(a)*r*w,Math.sin(a)*r*w*.86,(rnd()-.5)*.12);s.userData={base:s.position.clone(),phase:rnd()*Math.PI*2};heart.add(s)}

// only five short red/gold curves; none are connected and none are white
for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2+.25,r=.56+(i%2)*.14,p0=new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.86,0),p3=new THREE.Vector3(Math.cos(a+.72)*r,Math.sin(a+.72)*r*.86,0),p1=p0.clone().multiplyScalar(.58),p2=p3.clone().multiplyScalar(.58),curve=new THREE.CubicBezierCurve3(p0,p1,p2,p3);heart.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)),new THREE.LineBasicMaterial({color:i%2?C.red:C.gold,transparent:true,opacity:.09,blending:THREE.AdditiveBlending})))}

const nucleus=new THREE.Group();root.add(nucleus);const g1=sprite(C.red,.60,.05),g2=sprite(C.gold,.44,.07),g3=sprite(C.soft,.27,.58),g4=sprite(C.white,.10,1);nucleus.add(g1,g2,g3,g4);

const memories=[];function spawnMemory(){const def=orbitDefs[Math.floor(rnd()*orbitDefs.length)],s=sprite(rnd()>.45?C.soft:C.gold,.16,1);s.position.set(0,0,.06);root.add(s);memories.push({sprite:s,orbit:def,angle:rnd()*Math.PI*2,speed:(.08+rnd()*.1)*(rnd()>.5?1:-1),age:0,launch:1.2})}
let paused=false;addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m')spawnMemory();if(e.key==='Escape')paused=!paused});const clock=new THREE.Clock();let t=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused){t+=dt;orbitGroup.rotation.z=Math.sin(t*.075)*.018;heart.rotation.z-=dt*.008;nucleus.scale.setScalar(1+Math.sin(t*2.15)*.022);g3.material.opacity=.56+Math.sin(t*2.65)*.05;for(const child of orbitGroup.children){if(!child.isSprite||!child.userData.orbit)continue;child.userData.angle+=child.userData.speed*dt;child.position.copy(orbitPoint(child.userData.orbit,child.userData.angle))}for(const s of heart.children){if(!s.isSprite||!s.userData.base)continue;const p=s.userData.base,w=1+Math.sin(t*1.45+s.userData.phase)*.024;s.position.set(p.x*w,p.y*w,p.z)}for(const m of memories){m.age+=dt;m.angle+=m.speed*dt;const target=orbitPoint(m.orbit,m.angle),u=Math.min(1,m.age/m.launch),ease=1-Math.pow(1-u,3);m.sprite.position.lerpVectors(new THREE.Vector3(0,0,.06),target,ease);m.sprite.scale.setScalar(.16*(.35+.65*ease))}}composer.render()}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
