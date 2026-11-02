import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { YUNETHRE_CAMP as C, YUNETHRE_PATHS, yunethreOwns, yunethreReserved,
 YUNETHRE_WILDLIFE_ZONES } from '../src/content/regions/minora-frontier/yunethre-world.js';
import { CAMP_WORKPLACES, CAMP_SHELTERS, CAMP_COUNCIL, CENTAUR_BATTLEFIELD as B,
 CAMP_MEADOW_APPROACH } from '../src/content/regions/minora-frontier/centaur-camp-layout.js';
import { groundWithRiver as heightAt } from '../src/world/terrain/world-terrain.js';
import { westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
const { buildCentaurCamp }=await sourceModule('../src/content/regions/minora-frontier/centaur-camp-scenery.js');
const root=new THREE.Group(),colliders=[],metrics={tents:0,wagons:0};
for(const _ of buildCentaurCamp({root,heightAt,terrainSurface:null,colliders,metrics})){}
const world={heightAt,colliders,bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000}};
const line=(a,b,visit)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));for(let i=0;i<=n;i++)visit(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n);};
test('Centaur household doors and council entrance provide actual horse-width openings',()=>{
 for(const p of CAMP_SHELTERS){
  for(let z=0;z<=p.r+3;z+=.5){const x=p.x+Math.sin(p.yaw)*z,zz=p.z+Math.cos(p.yaw)*z;
   assert.ok(canStand(x,zz,world,1.2),`${p.id} door blocked at ${z}`);}
 }
 for(let x=-5;x<=5;x+=.5)assert.ok(canStand(CAMP_COUNCIL.x+x,CAMP_COUNCIL.z+CAMP_COUNCIL.d/2,world,1.1));
});
test('All six resident work routes retain their clear speaking space',()=>{
 for(const [name,p]of Object.entries(CAMP_WORKPLACES))line(p,{x:p.x+p.walk[0],z:p.z+p.walk[1]},(x,z)=>{
  assert.ok(canStand(x,z,world,2.9),`${name} working lane obstructed`);
 });
});
test('Chapter speaker, trade routes and the meadow approach remain clear',()=>{
 const paths=[...YUNETHRE_PATHS.map(p=>p.points),CAMP_MEADOW_APPROACH,
  [{x:C.x-100,z:C.z-9},{x:C.x-40,z:C.z-5},{x:C.x-10,z:C.z-5},{x:C.x-5,z:C.z+6}]];
 for(const p of paths)for(let i=1;i<p.length;i++)line(p[i-1],p[i],(x,z)=>assert.ok(canStand(x,z,world,.9),`route blocked ${x-C.x},${z-C.z}`));
 for(let i=0;i<16;i++){const a=i*Math.PI/8;assert.ok(canStand(C.x-5+Math.cos(a)*2,C.z+4+Math.sin(a)*2,world,.9));}
});
test('The assembly meadow is dry, gently sloped, in Yunethre, and reserved against new vegetation',()=>{
 let grade=0;
 for(let x=-B.radius;x<=B.radius;x+=3)for(let z=-B.radius;z<=B.radius;z+=3){
  if(Math.hypot(x,z)>B.radius)continue;const xx=B.x+x,zz=B.z+z,y=heightAt(xx,zz),water=westWaterSurface(xx,zz);
  assert.ok(yunethreOwns(xx,zz));assert.ok(yunethreReserved(xx,zz));assert.ok(canStand(xx,zz,world,1.2));
  assert.ok(water===null||water<y-.1);grade=Math.max(grade,Math.hypot(heightAt(xx+.5,zz)-heightAt(xx-.5,zz),heightAt(xx,zz+.5)-heightAt(xx,zz-.5)));
 }
 assert.ok(grade<.23);assert.ok(YUNETHRE_WILDLIFE_ZONES.every(zone=>zone.sites.every(([x,z])=>Math.hypot(x-B.x,z-B.z)>B.clearance)));
});
test('Camp craft stays finite and merged into a single inexpensive scenery mesh',()=>{
 assert.equal(metrics.tents,7);assert.equal(metrics.wagons,3);assert.equal(metrics.campWorkplaces,6);assert.equal(metrics.archeryTargets,3);
 let meshes=0,vertices=0;root.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position;vertices+=a.count;for(const v of a.array)assert.ok(Number.isFinite(v));});
 assert.equal(meshes,1);assert.ok(vertices<100000,`${vertices} camp vertices`);
});
