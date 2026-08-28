import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const app=document.getElementById('app');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x01040b);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,100); camera.position.z=8.8;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; app.appendChild(renderer.domElement);
const composer=new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.18,.46,.05));
const root=new THREE.Group(); scene.add(root);
const C={red:0xff2447,gold:0xffb01e,warm:0xffd69a,white:0xffffff,soft:0xfff5df,blue:0x83d8ff};
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}} const rnd=seeded(22112003);
function makeGlowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.96)');g.addColorStop(.3,'rgba(255,225,165,.52)');g.addColorStop(.62,'rgba(255,90,65,.11)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)} const glowTex=makeGlowTexture();
function sprite(color,size,opacity=1){const m=new THREE.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});const s=new THREE.Sprite(m);s.scale.setScalar(size);return s}
// stars
{const n=620,p=new Float32Array(n*3),co=new Float32Array(n*3),pal=[new THREE.Color(C.red),new THREE.Color(C.gold),new THREE.Color(C.soft),new THREE.Color(C.blue)];for(let i=0;i<n;i++){const r=2+rnd()*6.2,a=rnd()*Math.PI*2,ys=.48+rnd()*.46;p[i*3]=Math.cos(a)*r;p[i*3+1]=Math.sin(a)*r*ys;p[i*3+2]=(rnd()-.5)*1.7;const cc=pal[Math.floor(rnd()*pal.length)];co[i*3]=cc.r;co[i*3+1]=cc.g;co[i*3+2]=cc.b}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(co,3));root.add(new THREE.Points(g,new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false})))}
// outer paths
const orbitDefs=[],orbitGroup=new THREE.Group();root.add(orbitGroup);
function makeOrbit(index){const rx=2.35+rnd()*1.55,ry=.72+rnd()*1.05,zRot=rnd()*Math.PI,xRot=(rnd()-.5)*.82,yRot=(rnd()-.5)*.46,offset=new THREE.Vector3((rnd()-.5)*.26,(rnd()-.5)*.2,(rnd()-.5)*.16),color=index%3===0?C.gold:C.red,pts=[],start=rnd()*Math.PI*2,span=Math.PI*(1.58+rnd()*.32);for(let i=0;i<220;i++){const t=start+i/219*span;pts.push(new THREE.Vector3(Math.cos(t)*rx,Math.sin(t)*ry,0))}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:.16,blending:THREE.AdditiveBlending}));line.rotation.set(xRot,yRot,zRot);line.position.copy(offset);orbitGroup.add(line);const def={rx,ry,line};orbitDefs.push(def);const nodeCount=2+Math.floor(rnd()*3);for(let n=0;n<nodeCount;n++){const s=sprite(n%3===0?C.soft:color,.11+rnd()*.05,.82);s.userData={angle:rnd()*Math.PI*2,speed:(.07+rnd()*.10)*(rnd()>.5?1:-1),orbit:def};orbitGroup.add(s)}} for(let i=0;i<7;i++)makeOrbit(i);
function orbitPoint(def,angle){const p=new THREE.Vector3(Math.cos(angle)*def.rx,Math.sin(angle)*def.ry,0);p.applyEuler(def.line.rotation);p.add(def.line.position);return p}
// clean faceted center lattice
const coreGroup=new THREE.Group();root.add(coreGroup);
const corePoints=[];
const rings=[
  {r:.30,count:8,jitter:.045},
  {r:.55,count:12,jitter:.060},
  {r:.82,count:16,jitter:.075},
  {r:1.05,count:20,jitter:.090},
];
for(let li=0;li<rings.length;li++){
  const L=rings[li];
  const phase=li*.31;
  for(let i=0;i<L.count;i++){
    const a=phase+i/L.count*Math.PI*2+(rnd()-.5)*.08;
    const rr=L.r+(rnd()-.5)*L.jitter + .025*Math.sin(a*3+li*.7);
    corePoints.push({p:new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr*.9,(rnd()-.5)*.12),layer:li,index:i,count:L.count});
  }
}
// points
{const pos=[],col=[];for(const n of corePoints){pos.push(n.p.x,n.p.y,n.p.z);const cc=n.layer<2?new THREE.Color(C.white):(n.index%3===0?new THREE.Color(C.gold):new THREE.Color(C.soft));col.push(cc.r,cc.g,cc.b)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));coreGroup.add(new THREE.Points(g,new THREE.PointsMaterial({size:.025,vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false})))}
// organized triangular links: around each layer + selected cross-layer diagonals
{const verts=[];
  let offset=0; const starts=[]; for(const L of rings){starts.push(offset); offset+=L.count;}
  for(let li=0;li<rings.length;li++){
    const start=starts[li],count=rings[li].count;
    for(let i=0;i<count;i++){
      const a=corePoints[start+i].p;
      const b=corePoints[start+((i+1)%count)].p;
      // broken perimeter, not a full polygon ring
      if((i+li)%4!==0) verts.push(a.x,a.y,a.z,b.x,b.y,b.z);
      if(li<rings.length-1){
        const nextStart=starts[li+1],nextCount=rings[li+1].count;
        const j=Math.floor((i/count)*nextCount)%nextCount;
        const c=corePoints[nextStart+j].p;
        verts.push(a.x,a.y,a.z,c.x,c.y,c.z);
        if(i%3===0){const d=corePoints[nextStart+((j+1)%nextCount)].p;verts.push(a.x,a.y,a.z,d.x,d.y,d.z)}
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));coreGroup.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:C.soft,transparent:true,opacity:.34,blending:THREE.AdditiveBlending})));
}
// a handful of intentional warm diagonal filaments
const filamentGroup=new THREE.Group();root.add(filamentGroup);
for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2,r=.72+(i%2)*.18,p0=new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.9,0),p3=new THREE.Vector3(Math.cos(a+1.65)*r,Math.sin(a+1.65)*r*.9,0),p1=p0.clone().multiplyScalar(.42),p2=p3.clone().multiplyScalar(.42),curve=new THREE.CubicBezierCurve3(p0,p1,p2,p3),g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(44)),m=new THREE.LineBasicMaterial({color:i%3===0?C.gold:C.red,transparent:true,opacity:.09,blending:THREE.AdditiveBlending});filamentGroup.add(new THREE.Line(g,m))}
// nucleus
const nucleus=new THREE.Group();root.add(nucleus);const h1=sprite(C.red,.70,.065),h2=sprite(C.gold,.53,.095),h3=sprite(C.soft,.32,.68),h4=sprite(C.white,.11,1);nucleus.add(h1,h2,h3,h4);
// sparks
const sparkGroup=new THREE.Group();root.add(sparkGroup);for(let i=0;i<95;i++){const a=rnd()*Math.PI*2,r=.13+rnd()*1.18,s=sprite(i%5===0?C.red:i%4===0?C.gold:C.soft,.024+rnd()*.019,.64);s.position.set(Math.cos(a)*r,Math.sin(a)*r*.88,(rnd()-.5)*.16);s.userData={base:s.position.clone(),phase:rnd()*Math.PI*2};sparkGroup.add(s)}
// memory nodes
const memories=[];function spawnMemory(){const def=orbitDefs[Math.floor(rnd()*orbitDefs.length)],s=sprite(rnd()>.45?C.soft:C.gold,.16,1);s.position.set(0,0,.06);root.add(s);memories.push({sprite:s,orbit:def,angle:rnd()*Math.PI*2,speed:(.08+rnd()*.1)*(rnd()>.5?1:-1),age:0,launch:1.2})}
let paused=false;addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m')spawnMemory();if(e.key==='Escape')paused=!paused});
const clock=new THREE.Clock();let t=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused){t+=dt;orbitGroup.rotation.z=Math.sin(t*.075)*.018;coreGroup.rotation.z-=dt*.008;coreGroup.rotation.x=Math.sin(t*.16)*.018;filamentGroup.rotation.z+=dt*.006;nucleus.scale.setScalar(1+Math.sin(t*2.15)*.022);h3.material.opacity=.64+Math.sin(t*2.65)*.055;for(const c of orbitGroup.children)if(c.isSprite&&c.userData.orbit){c.userData.angle+=c.userData.speed*dt;c.position.copy(orbitPoint(c.userData.orbit,c.userData.angle))}for(const s of sparkGroup.children){const p=s.userData.base,w=1+Math.sin(t*1.5+s.userData.phase)*.025;s.position.set(p.x*w,p.y*w,p.z)}for(const m of memories){m.age+=dt;m.angle+=m.speed*dt;const target=orbitPoint(m.orbit,m.angle),u=Math.min(1,m.age/m.launch),ease=1-Math.pow(1-u,3);m.sprite.position.lerpVectors(new THREE.Vector3(0,0,.06),target,ease);m.sprite.scale.setScalar(.16*(.35+.65*ease))}}composer.render()}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
