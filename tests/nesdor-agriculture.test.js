import test from 'node:test';
import assert from 'node:assert/strict';
import {NESDOR_FIELDS as fields,NESDOR_AGRICULTURE_BUILDINGS as buildings,nesdorFoodCapacity} from '../src/content/regions/nesdor/nesdor-agriculture.js';
import {OVESOS_FIELDS,OVESOS_AGRICULTURE_BUILDINGS} from '../src/content/regions/oves/ovesos-agriculture.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {sourceModule} from './module-loader.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';

test('Nesdor represents fewer cultivated fields and barely covers the agreed civilian and military demand',()=>{
  assert.equal(nesdorFoodCapacity(),85);assert.equal(new Set(fields.map(f=>f.id)).size,fields.length);
  const homes=bs=>bs.filter(b=>b.kind==='house').length,area=fs=>fs.reduce((n,f)=>n+f.width*f.depth,0);
  assert.equal(homes(buildings),homes(OVESOS_AGRICULTURE_BUILDINGS));assert(area(fields)<area(OVESOS_FIELDS));
  const s=createCampaign(createLizeemFoodScenario()).step(),f=s.regions.nesdor.food;
  assert.equal(f.population,750);assert.equal(f.last.production,85);
  assert.equal(f.last.civilianDemand+f.last.militaryDemand,80.5);assert.equal(f.last.imports,0);assert.equal(f.civilianRation,1);
  assert.equal(s.regions.nesdor.housing.capacity,950);assert.equal(s.regions.isareos.food.last.imports,170);
});

test('Nesdor parcels and town lots remain dry, in their region and separate from one another',()=>{
  const lots=[...fields.map(f=>({...f,w:f.width,d:f.depth})),...buildings];
  for(const [i,a] of lots.entries()){
    for(let u=0;u<=8;u++)for(let v=0;v<=8;v++){
      const x=a.x+(u/8-.5)*a.w,z=a.z+(v/8-.5)*a.d;
      assert.equal(hexOwnerAt(x,z),'Nesdor',`${a.id}: region at ${x},${z}`);
      assert.equal(westWaterSurface(x,z),null,`${a.id}: wet at ${x},${z}`);
    }
    for(const b of lots.slice(i+1))assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2,`${a.id} overlaps ${b.id}`);
  }
});

test('Nesdor disruption diverts Caricas exports to friendly relief, and restoration recovers with exact replay',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario);c.step();
  assert(c.foodAction({type:'production',region:'nesdor',condition:.5}).ok);
  let s=c.step(14);assert.equal(s.regions.nesdor.food.last.production,42.5);
  assert(s.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='nesdor'&&t.amount>0));
  assert(!s.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='isareos'));
  assert(s.regions.isareos.food.store<2380);assert.equal(s.regions.nesdor.food.population,750);
  assert(c.foodAction({type:'production',region:'nesdor',condition:1}).ok);s=c.step(28);
  assert.equal(s.regions.nesdor.food.last.production,85);assert.equal(s.regions.nesdor.food.civilianRation,1);
  assert(s.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='isareos'&&t.amount>0));
  assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
});

test('Nesdor woodland leaves fields and routes clear with walkable town, farm and quay approaches',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  const {createFarmlandTerrain}=await sourceModule('../src/app/farmland-review/terrain.js');
  const parent=new THREE.Group(),config=FARMLAND_REGIONS.nesdor,terrain=await createFarmlandTerrain(parent,()=>{},config),colliders=[];
  const steps=config.createScenery({parent,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders});let r;do{r=steps.next();}while(!r.done);
  const world={...terrain,heightAt:terrain.walkHeight,colliders},blocked=[];
  for(const [index,lane] of config.lanes.entries())for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],count=Math.ceil(Math.hypot(bx-ax,bz-az));
    for(let j=0;j<=count;j++){const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count;if(!canStand(x,z,world,.34))blocked.push({lane:index,x,z});}
  }
  assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,25)));
  for(const [x,z] of Object.values(config.spawns)){assert(canStand(x,z,world,.34));const p={x,z,y:world.heightAt(x,z)};moveCharacter(p,3,0,world,.34);assert(p.x>x+2);}
  assert(westWaterSurface(terrain.quay.end,terrain.quay.z)!==null);
  assert(r.value.woodlandTrees>600,'Woodland must be a substantial part of the region');
  for(const tree of colliders.filter(c=>c.kind==='tree')){
    assert.equal(hexOwnerAt(tree.x,tree.z),'Nesdor');assert.equal(westWaterSurface(tree.x,tree.z),null);
    assert(!fields.some(f=>Math.abs(tree.x-f.x)<f.width/2&&Math.abs(tree.z-f.z)<f.depth/2));
  }
  assert(parent.children.length<15);assert(r.value.vertices<900000);
  parent.traverse(o=>{if(o.geometry){assert(o.geometry.attributes.position.array.every(Number.isFinite));o.geometry.dispose();}});
});
