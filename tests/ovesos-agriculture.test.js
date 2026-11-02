import test from 'node:test';
import assert from 'node:assert/strict';
import {OVESOS_FIELDS as fields,OVESOS_AGRICULTURE_BUILDINGS as buildings,ovesosFoodCapacity,inOvesosAgricultureWildland} from '../src/content/regions/oves/ovesos-agriculture.js';
import {NETHEREUM_BUILDINGS,NETHEREUM_FIELDS} from '../src/content/regions/nethereum/nethereum-agriculture.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {sourceModule} from './module-loader.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';

test('Ovesos retains its agreed budget and authored town',()=>{
  assert.equal(ovesosFoodCapacity(),100);assert.equal(new Set(fields.map(f=>f.id)).size,fields.length);
  const homes=bs=>bs.filter(b=>b.kind==='house'&&b.id.startsWith('town')).length;
  assert(homes(buildings)>homes(NETHEREUM_BUILDINGS));
  assert(fields.reduce((n,f)=>n+f.width*f.depth,0)<NETHEREUM_FIELDS.reduce((n,f)=>n+f.width*f.depth,0));
  const s=createCampaign(createLizeemFoodScenario()).step(),f=s.regions.ovesos.food;
  assert.equal(f.population,750);assert.equal(f.last.production,100);assert.equal(f.last.civilianDemand,75);
  assert.equal(f.civilianRation,1);assert.equal(s.regions.ovesos.housing.capacity,950);
  assert.equal(s.regions.isareos.food.last.imports,170);
});

test('Ovesos fields and homes stay dry, within the region, and clear of each other and the wild margin',()=>{
  const lots=[...fields.map(f=>({...f,w:f.width,d:f.depth})),...buildings];
  for(const [i,a] of lots.entries()){
    for(let u=0;u<=8;u++)for(let v=0;v<=8;v++){
      const x=a.x+(u/8-.5)*a.w,z=a.z+(v/8-.5)*a.d;
      assert.equal(hexOwnerAt(x,z),'Ovesos',`${a.id}: region at ${x},${z}`);
      assert.equal(westWaterSurface(x,z),null,`${a.id}: wet at ${x},${z}`);
      assert(!inOvesosAgricultureWildland(x,z));
    }
    for(const b of lots.slice(i+1))assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2,`${a.id} overlaps ${b.id}`);
  }
});

test('disrupting Ovesos uses friendly supply and restoring its farms replays through the campaign',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario);c.step();
  assert(c.foodAction({type:'production',region:'ovesos',condition:0}).ok);
  let s=c.step(14);assert.equal(s.regions.ovesos.food.last.production,0);assert(s.regions.ovesos.food.last.imports>0);
  assert.equal(s.regions.ovesos.food.population,750);assert.equal(s.regions.ovesos.housing.capacity,950);
  assert(c.foodAction({type:'production',region:'ovesos',condition:1}).ok);s=c.step(14);
  assert.equal(s.regions.ovesos.food.last.production,100);assert.equal(s.regions.ovesos.food.civilianRation,1);
  assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
});

test('Ovesos farm lanes, town and quay remain walkable with bounded rendering cost',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  const {createFarmlandTerrain}=await sourceModule('../src/app/farmland-review/terrain.js');
  const parent=new THREE.Group(),config=FARMLAND_REGIONS.ovesos,terrain=await createFarmlandTerrain(parent,()=>{},config),colliders=[];
  const steps=config.createScenery({parent,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders});let r;do{r=steps.next();}while(!r.done);
  const world={...terrain,heightAt:terrain.walkHeight,colliders},blocked=[];
  for(const [index,lane] of config.lanes.entries())for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],count=Math.ceil(Math.hypot(bx-ax,bz-az));
    for(let j=0;j<=count;j++){const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count;if(!canStand(x,z,world,.34))blocked.push({lane:index,x,z});}
  }
  assert.deepEqual(blocked,[],'Farm lanes and the quay approach must remain clear');
  for(const [x,z] of Object.values(config.spawns)){assert(canStand(x,z,world,.34));const p={x,z,y:world.heightAt(x,z)};moveCharacter(p,3,0,world,.34);assert(p.x>x+2);}
  const q=terrain.quay;assert(westWaterSurface(q.end,q.z)!==null,'Quay must reach actual river water');
  assert(parent.children.length<15);assert(r.value.vertices<500000);
  parent.traverse(o=>{if(o.geometry){assert(o.geometry.attributes.position.array.every(Number.isFinite));o.geometry.dispose();}});
});
