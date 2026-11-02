import test from 'node:test';
import assert from 'node:assert/strict';
import {NETHEREUM_FIELDS,NETHEREUM_FARMS,NETHEREUM_BUILDINGS,NETHEREUM_FARM_TARGET,nethereumFoodCapacity,inNethereumWildland} from '../src/content/regions/nethereum/nethereum-agriculture.js';
import {LIZEEM_FOOD_TARGETS} from '../src/content/scenarios/lizeem-food-targets.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {sourceModule} from './module-loader.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';
import {createCameraObstruction} from '../src/app/exploration/camera-obstruction.js';

test('new physical parcels account for the regional target without changing the campaign budget',()=>{
  assert.equal(NETHEREUM_FARMS.length,5);assert.equal(NETHEREUM_FARM_TARGET,220);
  assert.equal(nethereumFoodCapacity(),LIZEEM_FOOD_TARGETS.nethereum.production);
  const scenario=createLizeemFoodScenario(),campaign=createCampaign(scenario),state=campaign.step();
  assert.equal(state.regions.nethereum.food.last.production,nethereumFoodCapacity());
  assert.equal(state.regions.nethereum.food.last.exports,140);
  assert.equal(state.regions.isareos.food.last.imports,170);
  assert.equal(new Set(NETHEREUM_FIELDS.map(p=>p.id)).size,NETHEREUM_FIELDS.length);
  assert(NETHEREUM_FIELDS.every(p=>p.capacity>0));
});
test('parcels stay on dry Nethereum land and preserve the northwestern wild margin',()=>{
  for(const f of NETHEREUM_FIELDS)for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
    const x=f.x+(i/8-.5)*f.width,z=f.z+(j/8-.5)*f.depth;
    assert.equal(hexOwnerAt(x,z),'Nethereum',`${f.id}: ownership at ${x},${z}`);
    assert.equal(westWaterSurface(x,z),null,`${f.id}: water at ${x},${z}`);
    assert(!inNethereumWildland(x,z),`${f.id}: wildland at ${x},${z}`);
  }
});
test('productive parcels never count the same land twice',()=>{
  for(let i=0;i<NETHEREUM_FIELDS.length;i++)for(let j=i+1;j<NETHEREUM_FIELDS.length;j++){
    const a=NETHEREUM_FIELDS[i],b=NETHEREUM_FIELDS[j];
    assert(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.z-b.z)>=(a.depth+b.depth)/2,`${a.id} overlaps ${b.id}`);
  }
});
test('farmhouses and town buildings have dry footprints separate from productive parcels',()=>{
  for(const b of NETHEREUM_BUILDINGS){
    for(const dx of [-b.w/2,0,b.w/2])for(const dz of [-b.d/2,0,b.d/2]){
      assert.equal(hexOwnerAt(b.x+dx,b.z+dz),'Nethereum',b.id);
      assert.equal(westWaterSurface(b.x+dx,b.z+dz),null,b.id);
    }
    for(const f of NETHEREUM_FIELDS)assert(Math.abs(b.x-f.x)>=(b.w+f.width)/2||Math.abs(b.z-f.z)>=(b.d+f.depth)/2,`${b.id} overlaps ${f.id}`);
  }
});
test('only the campaign applies disruption, export losses and recovery; commands replay exactly',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario);
  c.step();assert(c.foodAction({type:'production',region:'nethereum',condition:.5}).ok);let s=c.step(7);
  assert.equal(s.regions.nethereum.food.last.production,110);assert(s.regions.isareos.food.store<2380);assert.equal(nethereumFoodCapacity(),220);
  assert(c.foodAction({type:'production',region:'nethereum',condition:1}).ok);s=c.step();assert.equal(s.regions.nethereum.food.last.production,220);
  const replay=replayCampaign(scenario,{scenario:scenario.id,seed:scenario.defaultSeed,day:s.day,commands:s.commands});assert.deepEqual(replay.snapshot(),s);
});
test('bridge and quay foot placement matches the rendered triangles across their full width',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createFarmlandTerrain}=await sourceModule('../src/app/farmland-review/terrain.js');
  const {buildFarmlandDecks}=await sourceModule('../src/app/farmland-review/decks.js');
  const {createSceneryBuilder}=await sourceModule('../src/world/scenery/scenery-builder.js');
  const ground=new THREE.Group(),terrain=await createFarmlandTerrain(ground),parent=new THREE.Group();
  const builder=createSceneryBuilder('Deck regression');buildFarmlandDecks(builder,terrain.decks);builder.finish(parent);parent.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const deck of terrain.decks)for(let j=0;j<deck.rows;j++)for(let i=0;i<deck.columns;i++){
    const a=deck.points[j*(deck.columns+1)+i],b=deck.points[(j+1)*(deck.columns+1)+i+1];
    for(const t of [.2,.7]){
      const x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=terrain.walkHeight(x,z);
      ray.set(new THREE.Vector3(x,y+5,z),down);const hit=ray.intersectObjects(parent.children)[0];
      assert(hit,'Visible deck must exist under the walking surface');
      assert(Math.abs(hit.point.y-y)<.002,`Deck and feet disagree at ${x},${z}`);
      assert(y>=terrain.waterAt(x,z),'Deck stays above water');
    }
  }
  for(const group of [ground,parent])group.traverse(o=>o.geometry?.dispose());
});
test('rural detail stays merged, has building collisions, and contains finite geometry',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createNethereumAgricultureSteps}=await sourceModule('../src/content/regions/nethereum/nethereum-agriculture-scenery.js');
  const parent=new THREE.Group(),colliders=[];const it=createNethereumAgricultureSteps({parent,colliders,heightAt:()=>20});let result;do{result=it.next();}while(!result.done);
  assert.equal(colliders.filter(c=>c.kind==='building').length,NETHEREUM_BUILDINGS.length);assert(parent.children.length<15);assert(result.value.vertices<600000);
  const world={heightAt:()=>20,colliders,nearColliders:()=>colliders,bounds:{minX:-4000,maxX:0,minZ:0,maxZ:1000}};
  for(const kind of ['cart','well','market-stall','tree','fence']){
    const solid=colliders.find(c=>c.kind===kind);assert(solid,kind);
    assert(!canStand(solid.x,solid.z,world,.34),`${kind} must be solid`);
  }
  const stall=colliders.find(c=>c.kind==='market-stall'),walker={x:stall.x,z:stall.z-4,y:20};
  moveCharacter(walker,0,8,world,.34);assert(walker.z<stall.z-stall.hz,'Long movement steps cannot tunnel through a stall');
  const house=NETHEREUM_BUILDINGS[0],focus={x:house.x,y:24.5,z:house.z+house.d/2+1},desired={x:house.x,y:24.5,z:house.z-house.d/2-1};
  assert(createCameraObstruction(world)(focus,desired)<1,'Walking camera must stop at walls and roofs, even above the old two-metre fallback');
  parent.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));o.geometry.dispose();}});
});
