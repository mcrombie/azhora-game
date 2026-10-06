import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {URUBOND,urubondOwns,urubondLedge} from './urubond-world.js';
import {landDistance} from '../../../world/terrain/region-world.js';
/** Lifeless exterior: no animals, birds, trees, houses, roads or exterior gates. */
export function* createUrubondScenerySteps({parent,heightAt,colliders}){
 const b=createSceneryBuilder('Urubond: fractured basalt and cooled lava'),c=URUBOND;
 let seed=0x72b019;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let rocks=0,columns=0;
 for(let i=0;i<1450;i++){
  if(i%40===0)yield;
  const x=c.bounds.minX+random()*(c.bounds.maxX-c.bounds.minX),z=c.bounds.minZ+random()*(c.bounds.maxZ-c.bounds.minZ),s=.5+random()*3.2;
  if(!urubondOwns(x,z)||landDistance(x,z)<4||urubondLedge(x,z).distance<9||Math.hypot(x-c.x,z-c.z)<57)continue;
  const y=heightAt(x,z),shore=landDistance(x,z),tint=i%5===0?'#654b4b':i%3===0?'#242a30':'#4b4a50';
  if(shore<28&&i%3===0){const h=5+random()*13;b.cylinder(tint,x,y-2,z,s*.7,h,random()*6.28);columns++;}
  else b.rock(tint,x,y+s*.24,z,s,s*(.3+random()),s*.66,random()*6.28);
  rocks++;
 }
 // Cooled lava tongues are continuous irregular ribbons, broken at the walking ledge.
 for(let arm=0;arm<9;arm++)for(let j=0;j<48;j++){
  const point=t=>{const a=arm*6.283/9+.10*Math.sin(t*.19+arm),r=64+t*2.5,w=1.1+1.3*Math.sin(t*.11+arm)**2;
   return {x:c.x+Math.cos(a)*r,z:c.z+Math.sin(a)*r,a,w};};
  const p=point(j),q=point(j+1);if(!urubondOwns(p.x,p.z)||urubondLedge(p.x,p.z).distance<12||urubondLedge(q.x,q.z).distance<12||landDistance(p.x,p.z)<30)continue;
  const side=(p,s)=>{const x=p.x-Math.sin(p.a)*p.w*s,z=p.z+Math.cos(p.a)*p.w*s;return [x,heightAt(x,z)+.12,z];};
  b.sheet('#272830',side(p,-1),side(p,1),side(q,1),side(q,-1));
 }
 // An unmarked basalt cleft on the inner crater shelf conceals the only portal.
 const e=c.entrance,y=heightAt(e.x,e.z);
 for(const side of [-1,1]){b.rock('#29282e',e.x+side*2.7,y+2,e.z-3,2.1,4.7,2.4,side*.4);colliders.push({x:e.x+side*2.7,z:e.z-3,r:1.4,minY:y,maxY:y+6,kind:'urubond-cleft'});}
 b.rock('#393139',e.x,y+5.8,e.z-2.7,4.3,1.8,2.6,.1);
 b.block('#0b0b10',e.x,y,e.z-4.8,3.4,5.7,.2);
 b.finish(parent);
 // A small exposed lava lake is deep inside the crater, not a bright lava island.
 const lava=new THREE.Mesh(new THREE.CircleGeometry(16,48),new THREE.MeshStandardMaterial({color:0x983119,emissive:0xee4111,emissiveIntensity:.85,roughness:.85}));
 lava.rotation.x=-Math.PI/2;lava.position.set(c.x,209,c.z);lava.name='Urubond: caldera furnace';parent.add(lava);
 const crust=createSceneryBuilder('Urubond: floating black caldera crust');
 for(let i=0;i<32;i++){const a=random()*6.28,r=random()*14;crust.rock('#252329',c.x+Math.cos(a)*r,209.15,c.z+Math.sin(a)*r,1.2+random()*2,.22,1+random()*2,a);}crust.finish(parent);
 const smokeGeometry=new THREE.IcosahedronGeometry(1,1),smokeMaterial=new THREE.MeshStandardMaterial({color:0x49454b,transparent:true,opacity:.065,depthWrite:false,roughness:1});
 const smoke=new THREE.InstancedMesh(smokeGeometry,smokeMaterial,45),matrix=new THREE.Matrix4();
 for(let i=0;i<45;i++){const t=i/3;matrix.makeScale(6+t*1.4,9+t,6+t);matrix.setPosition(c.x+t*2.8+(random()-.5)*(8+t*2),228+t*16,c.z-t*2+(random()-.5)*(8+t*2));smoke.setMatrixAt(i,matrix);}smoke.name='Urubond: drifting volcanic haze';smoke.frustumCulled=false;parent.add(smoke);
 return {metrics:{rocks,columns,characters:0,wildlife:0},entrance:{...e,y}};
}
