import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {FRONTIER_SITES,FRONTIER_ROUTES,KUDAN_FIELDS,frontierBuildings,OREMINDI_HOLDS} from '../src/content/regions/oremindi-frontier/oremindi-frontier-layout.js';
import {westOremindiGround,westOremindiOwns,SEVRON_ENTRANCES,WEST_OREMINDI_PEAKS} from '../src/content/regions/west-oremindi/west-oremindi-world.js';
import {northernGround,northernCellAt,NORTHERN_PEAKS,northernWaterAt} from '../src/content/regions/northern-oremindi/northern-oremindi-world.js';
import {southOremindiGround,southOremindiOwns,southOremindiWaterAt,PEAKS} from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import {regionAt,landDistance} from '../src/world/terrain/region-world.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';
import {canWalkSlope} from '../src/gameplay/movement/climbing.js';
import {travelPlaces} from '../src/dev/tools/testing-travel.js';
import {ownerOf,factionRegions,stability} from '../src/ui/map/campaign-map-model.js';
const ground=(x,z)=>westOremindiOwns(x,z)?westOremindiGround(x,z):southOremindiOwns(x,z)?southOremindiGround(x,z):northernGround(x,z);
const {createOremindiFrontierSteps}=await sourceModule('../src/content/regions/oremindi-frontier/oremindi-frontier-scenery.js');
const colliders=[],built=[];
for(const region of new Set(FRONTIER_SITES.map(s=>s.region))){
 const parent=new THREE.Group(),steps=createOremindiFrontierSteps({parent,region,heightAt:ground,colliders});let n;do{n=steps.next();}while(!n.done);built.push({...n.value,parent});
}
const world={heightAt:ground,colliders,bounds:{minX:-5000,maxX:0,minZ:-3000,maxZ:0}};
test('independent countries and four rival surface occupants replace the old allocations',()=>{
 const factions=JSON.parse(readFileSync(new URL('../assets/campaign-factions.json',import.meta.url)));
 assert.equal(ownerOf('Cudon',factions),'kudan');assert.equal(ownerOf('Narcosh',factions),'narcosh');assert.equal(ownerOf('Lesser Oremindi Mountains',factions),'narcosh');
 assert.equal(ownerOf('Acor Wetlands',factions),'disputed');
 assert.ok(factions.find(f=>f.id==='narcosh').disputedRegions.includes('Acor Wetlands'));
 assert.deepEqual(factionRegions(factions.find(f=>f.id==='thalmagars-empire')),['Cape Thalmagar','Urubond']);
 for(const s of OREMINDI_HOLDS){assert.match(ownerOf(s.region,factions),/^oremindi-.*-orcs$/);assert.equal(stability(s.region)[1],'conflict');}
 assert.equal(new Set(OREMINDI_HOLDS.map(s=>ownerOf(s.region,factions))).size,4);
 for(const id of ['mountain-elfland','oremindi-kingdom'])assert.equal(factionRegions(factions.find(f=>f.id===id)).length,0);
 assert.equal(factions.find(f=>f.id==='narcosh').actualOverlord,undefined);
});
test('sites have dry footprints and clear developer travel arrivals',()=>{
 for(const s of FRONTIER_SITES){
  assert.equal(regionAt(s.x,s.z).id,s.regionId,s.id);assert.ok(travelPlaces(s.region).some(p=>p.id===s.id),s.id+' F8');
  assert.ok(canStand(s.x,s.z,world),s.id+' arrival');
  for(const h of frontierBuildings(s).filter(h=>!['ruin','tent'].includes(h.kind))){
   const levels=[[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]].map(([u,v])=>ground(h.x+u*h.w,h.z+v*h.d));
   assert.ok(Math.max(...levels)-Math.min(...levels)<3.5,h.id+' must not stand on a tall foundation column across a cliff');
  }
  for(const h of frontierBuildings(s))for(const u of [-.5,.5])for(const v of [-.5,.5]){
   const x=h.x+u*h.w,z=h.z+v*h.d;
   assert.ok(ground(x,z)>.8,h.id+' above sea');assert.ok(landDistance(x,z)>0,h.id+' on land');
   assert.equal(northernWaterAt(x,z),null);assert.equal(southOremindiWaterAt(x,z),null);
  }
 }
 for(const f of KUDAN_FIELDS)for(let x=f.x-f.w/2;x<=f.x+f.w/2;x+=2)for(let z=f.z-f.d/2;z<=f.z+f.d/2;z+=2){assert.equal(northernCellAt(x,z)?.region,'Cudon');assert.ok(landDistance(x,z)>0);}
});
test('all new mountain and coastal routes support walking both ways without blocked gates',()=>{
 for(const route of FRONTIER_ROUTES)for(const reverse of [false,true]){
  const points=reverse?[...route.points].reverse():route.points,p={...points[0]};
  for(const b of points.slice(1)){
   const a={...p},len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/.25),dx=(b.x-a.x)/n,dz=(b.z-a.z)/n;
   for(let i=0;i<n;i++){
    assert.ok(canWalkSlope(p.x,p.z,p.x+dx,p.z+dz,world),route.id+' grade at '+p.x+','+p.z);
    moveCharacter(p,dx,dz,world);
   }
   assert.ok(Math.hypot(p.x-b.x,p.z-b.z)<.3,route.id+' blocked at '+JSON.stringify(p));
  }
 }
});
test('high peaks and concealed elven entrances survive the new benches',()=>{
 for(const p of WEST_OREMINDI_PEAKS)assert.ok(ground(p.x,p.z)>220);
 for(const p of NORTHERN_PEAKS.filter(p=>p.id.includes('north-oremindi')||p.id.includes('east-oremindi')))assert.ok(ground(p.x,p.z)>(p.id.endsWith('blue-horn')?180:350),p.id);
 assert.ok(PEAKS.some(p=>ground(p.x,p.z)>390));
 for(const e of SEVRON_ENTRANCES){const expected=e.id==='sea-breach'?23:e.id==='inspection-passage'?180:119;assert.ok(Math.abs(ground(e.x,e.z)-expected)<.1,e.id);}
 assert.ok(FRONTIER_SITES.every(s=>!s.id.includes('sevron')));
});
test('occupation scenery is finite and batched by settlement and path',()=>{
 for(const b of built){assert.ok(b.metrics.batches<15);assert.ok(b.metrics.vertices<140000);b.parent.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});}
 assert.equal(built.reduce((n,b)=>n+b.metrics.fields,0),3);
});
