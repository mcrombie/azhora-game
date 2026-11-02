import test from 'node:test';
import assert from 'node:assert/strict';
import {CARICAS_FIELDS as fields,CARICAS_AGRICULTURE_BUILDINGS as buildings,CARICAS_FARMS,CARICAS_MINORA_APPROACH,caricasFoodCapacity} from '../src/content/regions/minora-frontier/caricas-agriculture.js';
import {MENORA_PATHS} from '../src/content/regions/minora-frontier/menora-city.js';
import {NETHEREUM_FIELDS} from '../src/content/regions/nethereum/nethereum-agriculture.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {sourceModule} from './module-loader.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import {CARICAS_ORCHARD} from '../src/content/regions/minora-frontier/caricas-agriculture.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';
import {caricasTownGround} from '../src/content/regions/minora-frontier/caricas-town-ground.js';

const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;
test('Caricas preserves its regional economy with a compact representative settlement',()=>{
  assert.equal(caricasFoodCapacity(),170);assert.equal(new Set(fields.map(f=>f.id)).size,fields.length);
  assert(fields.every(f=>f.capacity===undefined));assert(buildings.every(b=>b.housingCapacity===undefined&&b.name&&b.purpose));
  assert(buildings.length<=20);assert(fields.length<=12);
  const area=parcels=>parcels.reduce((sum,f)=>sum+f.width*f.depth,0);
  assert(area(fields)<area(NETHEREUM_FIELDS));assert.equal(CARICAS_FARMS.length,3);
  const s=createCampaign(createLizeemFoodScenario()).step();
  assert.equal(s.regions.caricas.food.population,1265);assert.equal(s.regions.caricas.food.last.production,170);
  assert.equal(s.regions.caricas.food.last.exports,30);assert.equal(s.regions.caricas.food.civilianRation,1);
  assert.equal(s.regions.isareos.food.last.imports,170);
});
test('new Caricas parcels and buildings stay dry, in-region, and do not overlap',()=>{
  const lots=[...fields.map(f=>({...f,w:f.width,d:f.depth})),...buildings];
  for(const [i,a] of lots.entries()){
    for(let u=0;u<=8;u++)for(let v=0;v<=8;v++){
      const x=a.x+(u/8-.5)*a.w,z=a.z+(v/8-.5)*a.d;
      assert.equal(hexOwnerAt(x,z),'Caricas',`${a.id}: region`);
      assert.equal(westWaterSurface(x,z),null,`${a.id}: wet footprint at ${x},${z}`);
    }
    for(const b of lots.slice(i+1))assert(!overlap(a,b),`${a.id} overlaps ${b.id}`);
  }
});
test('changing representative scenery cannot change regional people, supplies or housing',()=>{
  const expected=createLizeemFoodScenario().regions.find(r=>r.id==='caricas');
  const removed=buildings.splice(0),parcels=fields.splice(0);
  try{assert.deepEqual(createLizeemFoodScenario().regions.find(r=>r.id==='caricas'),expected);assert.equal(caricasFoodCapacity(),170);}
  finally{buildings.push(...removed);fields.push(...parcels);}
});
test('market grading preserves riverbeds and feathers into the countryside',()=>{
  for(const [x,z] of [[-2190,279],[-2164,348],[-1990,395],[-2125,116]])assert.equal(caricasTownGround(x,z,4.5),4.5);
  for(let x=-2140;x<=-2060;x+=3)for(let z=225;z<=325;z+=3){
    assert(Math.abs(caricasTownGround(x,z)-caricasTownGround(x+1,z))<.05);
    assert(Math.abs(caricasTownGround(x,z)-caricasTownGround(x,z+1))<.05);
  }
});
test('Caricas disruption affects its people and Minora through the existing campaign, with exact replay',()=>{
  const scenario=createLizeemFoodScenario(),campaign=createCampaign(scenario);campaign.step();
  assert(campaign.foodAction({type:'production',region:'caricas',condition:.5}).ok);
  let s=campaign.step(24);assert.equal(s.regions.caricas.food.last.exports,0);
  assert(s.regions.caricas.food.civilianRation<1);assert(s.regions.caricas.food.unrest>0);assert(s.regions.isareos.food.store<2380);
  assert(campaign.foodAction({type:'production',region:'caricas',condition:1}).ok);s=campaign.step(14);
  assert.equal(caricasFoodCapacity(),170);assert.equal(s.regions.caricas.food.civilianRation,1);
  assert.deepEqual(replayCampaign(scenario,{scenario:scenario.id,seed:scenario.defaultSeed,day:s.day,commands:s.commands}).snapshot(),s);
});
test('Caricas scenery keeps its lanes, market and quay walkable with bounded rendering cost',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  const {createFarmlandTerrain}=await sourceModule('../src/app/farmland-review/terrain.js');
  const parent=new THREE.Group(),config=FARMLAND_REGIONS.caricas,terrain=await createFarmlandTerrain(parent,()=>{},config),colliders=[];
  const steps=config.createScenery({parent,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders});let r;do{r=steps.next();}while(!r.done);
  const treeColliders=assertRegisteredTrees(parent,colliders);
  for(const id of ['market-lime-west','market-lime-east'])assert.equal(treeColliders.find(t=>t.id===id)?.species,'small-leaved-lime');
  for(const [i,[x,z]] of CARICAS_ORCHARD.entries()){
    const t=treeColliders.find(t=>t.id==='orchard-'+i);assert(t);assert.equal(t.species,'apple');assert.equal(t.x,x);assert.equal(t.z,z);assert.equal(t.r,.28);
  }
  const world={...terrain,heightAt:terrain.walkHeight,colliders};
  const bridgeApproach=MENORA_PATHS.find(p=>p.id==='menora-temple-way').points.at(-1);
  assert.deepEqual(CARICAS_MINORA_APPROACH[0],[bridgeApproach.x,bridgeApproach.z],'Caricas meets the actual White Bridge approach');
  const road=config.lanes.find(l=>l[0][0]===bridgeApproach.x&&l[0][1]===bridgeApproach.z);
  assert(road.some(([x,z])=>x===config.spawns.town[0]&&z===config.spawns.town[1]),'The bridge approach reaches the market in one continuous lane');
  const drawn=parent.getObjectByName('Cart lanes');assert(drawn,'The route is built as a visible road');
  const ray=new THREE.Raycaster();
  // Probe the actual road triangles and traverse both ways at horse width.
  // Endpoint-only checks previously let a whole missing approach go unnoticed.
  for(const line of [CARICAS_MINORA_APPROACH,[...CARICAS_MINORA_APPROACH].reverse()]){
    const p={x:line[0][0],z:line[0][1]};p.y=world.heightAt(p.x,p.z);
    for(let i=1;i<line.length;i++){
      const [ax,az]=line[i-1],[bx,bz]=line[i],length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length);
      for(let j=1;j<=n;j++){
        const x=ax+(bx-ax)*j/n,z=az+(bz-az)*j/n;
        moveCharacter(p,x-p.x,z-p.z,world,.8);p.y=world.heightAt(p.x,p.z);
        assert(Math.hypot(p.x-x,p.z-z)<.01,'Rideable Minora approach at '+x+','+z);
        assert(world.heightAt(x,z)>world.waterAt(x,z),'Approach stays on dry ground');
        if(j===n)continue;
        for(const offset of [-1.2,0,1.2]){
          const rx=x-(bz-az)/length*offset,rz=z+(bx-ax)/length*offset;
          ray.set(new THREE.Vector3(rx,world.heightAt(rx,rz)+10,rz),new THREE.Vector3(0,-1,0));
          const hit=ray.intersectObject(drawn)[0];
          assert(hit&&Math.abs(hit.point.y-world.heightAt(rx,rz)-.095)<.002,'Continuous terrain-following road at '+rx+','+rz);
        }
      }
    }
  }
  const blocked=[];
  for(const [index,lane] of config.lanes.entries())for(let i=1;i<lane.length;i++){
    const [ax,az]=lane[i-1],[bx,bz]=lane[i],count=Math.ceil(Math.hypot(bx-ax,bz-az));
    for(let j=0;j<=count;j++){const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count;if(!canStand(x,z,world,.34))blocked.push({lane:index,x,z});}
  }
  assert.deepEqual(blocked,[],'Farm cart lanes must remain clear');
  for(const [x,z] of Object.values(config.spawns)){
    assert(canStand(x,z,world,.34));const p={x,z,y:world.heightAt(x,z)};moveCharacter(p,3,0,world,.34);assert(p.x>x+2);
  }
  assert(parent.children.length<15);assert(r.value.vertices<600000);
  parent.traverse(o=>{if(o.geometry){assert(o.geometry.attributes.position.array.every(Number.isFinite));o.geometry.dispose();}});
});
