import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MENORA_CAMP,MENORA} from '../src/content/regions/minora-frontier/menora-city.js';
import {createSkirmishGround,SKIRMISH_RADIUS} from '../src/app/exploration/skirmish-ground.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';

test('the former camp remains clear practice ground without military scenery or colliders',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {buildCampGround,campHeightAt,CAMP_RADIUS}=await sourceModule('../src/app/exploration/combat-camp-world.js');
  const {createMenoraScenery}=await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
  const root=new THREE.Group(),colliders=[],steps=buildCampGround(root);let built;
  do{built=steps.next();}while(!built.done);
  assert(built.value.vertices<10000,'Local terrain must not grow to a regional terrain build');
  const terrain=root.children[0].geometry.attributes.position;
  for(let i=0;i<terrain.count;i++){
    const x=terrain.getX(i),z=terrain.getZ(i);
    if(Math.hypot(x-MENORA_CAMP.x,z-MENORA_CAMP.z)<SKIRMISH_RADIUS)
      assert(Math.abs(terrain.getY(i)-campHeightAt(x,z))<.0001,'Drawn camp terrain matches physical ground');
  }
  const scenery=createMenoraScenery({parent:root,heightAt:groundWithRiver,colliders});
  assert.equal(scenery.metrics.tents,0);assert.equal(campHeightAt(MENORA_CAMP.x,MENORA_CAMP.z),MENORA.elevation);
  assert.deepEqual(MENORA_CAMP.tents,[]);assert.ok(!colliders.some(c=>c.id?.startsWith('blood-prince-tent-')));
  const world={heightAt:campHeightAt,waterAt:()=>.45,regionAt:()=>({id:16}),readyAt:()=>true,colliders,
    bounds:{minX:MENORA_CAMP.x-CAMP_RADIUS,maxX:MENORA_CAMP.x+CAMP_RADIUS,minZ:MENORA_CAMP.z-CAMP_RADIUS,maxZ:MENORA_CAMP.z+CAMP_RADIUS}};
  const ground=createSkirmishGround(world,MENORA_CAMP,16),setup=ground.interception(MENORA_CAMP);
  assert.equal(setup.guards.length,3);assert(setup.guards.every(p=>ground.clear(p.x,p.z)));
  assert(setup.route.every(p=>ground.canHit(MENORA_CAMP,p)));
  for(const [x,z]of [[-2500,47],[-2483,43],[-2464,43],[-2500,111],[-2483,114],[-2464,114],[-2453,84],[-2453,96]])
    assert(ground.clear(x,z),'Former tents and supply barrels leave no invisible barriers');
});
