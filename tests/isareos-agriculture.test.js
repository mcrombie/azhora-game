import test from 'node:test';
import assert from 'node:assert/strict';
import {ISAREOS_FIELDS as fields,ISAREOS_RURAL_BUILDINGS as buildings,isareosFoodCapacity,MINORA_HOUSING_CAPACITY} from '../src/content/regions/minora-frontier/isareos-agriculture.js';
import {housingCapacity} from '../src/content/settlements/housing-capacity.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {foodReport,foodTestActions} from '../src/app/lizeem/food-report.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {westGroundAt,westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {MENORA_BUILDINGS,MENORA_BRIDGES,menoraReserved} from '../src/content/regions/minora-frontier/menora-city.js';
import {sourceModule} from './module-loader.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';

test('Isareos retains the agreed import-dependent budget with independent city and rural housing',()=>{
  assert.equal(isareosFoodCapacity(),100);assert.equal(fields.length,18);
  const s=createCampaign(createLizeemFoodScenario()).step(),f=s.regions.isareos.food;
  assert.equal(f.population,2640);assert.equal(f.last.production,100);
  assert.equal(f.last.civilianDemand+f.last.militaryDemand,270);assert.equal(f.last.imports,170);
  assert.equal(s.regions.isareos.housing.capacity,3300);
  assert.equal(housingCapacity(buildings)+MINORA_HOUSING_CAPACITY,3300);
  assert.equal(f.store,2380);assert.equal(f.civilianRation,1);
});

test('fresh Isareos fields and farmsteads stay dry, separate and outside the retained city',()=>{
  const lots=[...fields.map(f=>({...f,w:f.width,d:f.depth})),...buildings];
  for(const [i,a] of lots.entries()){
    for(let u=0;u<=8;u++)for(let v=0;v<=8;v++){
      const x=a.x+(u/8-.5)*a.w,z=a.z+(v/8-.5)*a.d;
      assert.equal(hexOwnerAt(x,z),'Isareos',`${a.id}: region at ${x},${z}`);
      assert.equal(westWaterSurface(x,z),null,`${a.id}: water at ${x},${z}`);
      assert(!menoraReserved(x,z,8),`${a.id} intrudes on Minora`);
      if(a.crop){
        const slope=Math.hypot((westGroundAt(x+2,z)-westGroundAt(x-2,z))/4,(westGroundAt(x,z+2)-westGroundAt(x,z-2))/4);
        assert(slope<.38,`${a.id}: field is too steep at ${x},${z} (${slope})`);
      }
    }
    for(const b of lots.slice(i+1))assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2,`${a.id} overlaps ${b.id}`);
  }
});

test('Minora import cutoff spends fourteen days of reserves, then shortages and recovery replay exactly',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario);c.step();
  for(const a of foodTestActions('cut-imports'))assert(c.foodAction(a).ok);
  let s=c.snapshot();assert.equal(foodReport(scenario,s,s,'isareos').reserveNote,'','Do not forecast from yesterday after a route change');
  s=c.step(7);assert.equal(s.regions.isareos.food.store,1190);assert.equal(s.regions.isareos.food.last.imports,0);
  assert.match(foodReport(scenario,s,s,'isareos').reserveNote,/About 7 more days/);
  s=c.step(7);assert.equal(s.regions.isareos.food.store,0);assert.equal(s.regions.isareos.food.civilianRation,1);
  s=c.step();assert(s.regions.isareos.food.civilianRation<1);assert(s.regions.isareos.food.unrest>0);
  for(const a of foodTestActions('restore-imports'))assert(c.foodAction(a).ok);
  s=c.step(35);assert.equal(s.regions.isareos.food.civilianRation,1);assert.equal(s.regions.isareos.food.unrest,0);assert(s.regions.isareos.food.store>0);
  assert.equal(s.regions.isareos.food.population,2640);assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
});

test('retained Minora and new fields render with open lanes, usable bridges and bounded geometry',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  const {createFarmlandTerrain}=await sourceModule('../src/app/farmland-review/terrain.js');
  const parent=new THREE.Group(),config=FARMLAND_REGIONS.isareos,terrain=await createFarmlandTerrain(parent,()=>{},config),colliders=[];
  const steps=config.createScenery({parent,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders});let r;do{r=steps.next();}while(!r.done);
  assert.equal(r.value.city.buildings,MENORA_BUILDINGS.length);assert.equal(r.value.city.bridges,MENORA_BRIDGES.length);
  assert.equal(housingCapacity(config.buildings),3300);
  const world={...terrain,heightAt:terrain.walkHeight,colliders},blocked=[];
  for(const [index,lane] of config.lanes.entries())for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],count=Math.ceil(Math.hypot(bx-ax,bz-az));
    for(let j=0;j<=count;j++){const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count;if(!canStand(x,z,world,.34))blocked.push({lane:index,x,z});}
  }
  assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,25)));
  for(const [x,z] of Object.values(config.spawns)){assert(canStand(x,z,world,.34));const p={x,z,y:world.heightAt(x,z)};moveCharacter(p,3,0,world,.34);assert(p.x>x+2);}
  for(const b of MENORA_BRIDGES)assert.equal(world.heightAt(b.x,b.z),b.deck);
  assert(r.value.vertices<900000);
  parent.traverse(o=>{if(o.geometry){assert(o.geometry.attributes.position.array.every(Number.isFinite));o.geometry.dispose();}});
});
