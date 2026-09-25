import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { LIZ, LIZ_STAND, CAT, createCatQuest } from '../src/cat-quest.js';
import { LIZ_CLEARING, LIZ_COTTAGE, LIZ_SKEPS, LIZ_WOOD_HIVES, LIZ_GARDEN, LIZ_HOME_PATHS,
  PUETH_NPC_POSITIONS, puethRiverDistance } from '../src/pueth-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene=new THREE.Scene(),world=createWorld(scene);
const clearWalk=(from,to,radius=.45)=>{
  const walker={x:from.x,z:from.z},length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.ceil(length/.2);
  for(let i=1;i<=steps;i++){
    const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
    assert.ok(canStand(x,z,world,radius),`clear approach at ${x.toFixed(2)},${z.toFixed(2)}`);
    moveCharacter(walker,x-walker.x,z-walker.z,world,radius);
    assert.ok(Math.hypot(walker.x-x,walker.z-z)<.01,`walk stopped at ${walker.x},${walker.z}`);
  }
};

test('Liz keeps her identity and stand beside a real cottage and expanded apiary',()=>{
  assert.deepEqual(PUETH_NPC_POSITIONS[LIZ.id],{x:LIZ_STAND.x,z:LIZ_STAND.z});
  assert.deepEqual({x:LIZ_CLEARING.x,z:LIZ_CLEARING.z},{x:LIZ_STAND.x,z:LIZ_STAND.z});
  assert.equal(LIZ.look.hairStyle,'long');
  const cottage=world.colliders.find(c=>c.id===LIZ_COTTAGE.id);
  assert.ok(cottage?.kind==='house','cottage is an actual building with collision');
  assert.equal(canStand(LIZ_COTTAGE.x,LIZ_COTTAGE.z,world),false,'cannot walk through the cottage');
  for(const hive of [...LIZ_SKEPS,...LIZ_WOOD_HIVES]){
    assert.ok(puethRiverDistance(hive.x,hive.z)>7,'hives remain above the riverbank');
    assert.ok(world.heightAt(hive.x,hive.z)>world.waterAt(hive.x,hive.z));
    assert.ok(world.colliders.some(c=>['bee-skep','bee-hive'].includes(c.kind)&&Math.hypot(c.x-hive.x,c.z-hive.z)<.01));
  }
  assert.equal(LIZ_SKEPS.length,3,'the original apiary stays in place');
  assert.ok(LIZ_WOOD_HIVES.length>=3,'wooden hives add a second working apiary row');
});

test('the homestead paths, cottage approach and open garden gate can all be walked',()=>{
  assert.ok(canStand(LIZ_STAND.x,LIZ_STAND.z,world));
  for(const path of LIZ_HOME_PATHS)for(let i=1;i<path.length;i++)clearWalk(path[i-1],path[i]);
  clearWalk(LIZ_STAND,LIZ_GARDEN.entry);
  clearWalk(LIZ_GARDEN.entry,LIZ_GARDEN);
  assert.ok(world.colliders.filter(c=>c.kind==='liz-garden-fence').length>=5);
  assert.equal(canStand(LIZ_GARDEN.x-LIZ_GARDEN.width/2,LIZ_GARDEN.z,world),false,'the solid fence stops walking through it');
  assert.ok(canStand(LIZ_GARDEN.entry.x,LIZ_GARDEN.entry.z,world),'the garden entrance stays open');
});

test('returning with Mop remains open and completes his existing home condition',()=>{
  // The camp is east of home. The final twenty metres must not be fenced off
  // or occupied by a cottage, hive or garden bed added around Liz.
  const approach={x:LIZ_STAND.x+20,z:LIZ_STAND.z};
  clearWalk(approach,LIZ_STAND);
  clearWalk({x:approach.x,z:approach.z+1},{x:LIZ_STAND.x+1,z:LIZ_STAND.z+1},.25);
  const quest=createCatQuest();
  quest.ask();quest.accept();quest.found();quest.home();
  assert.equal(quest.state.stage,'home');
  assert.ok(Math.hypot(CAT.at.x-LIZ_STAND.x,CAT.at.z-LIZ_STAND.z)>80,'cat and quest destinations have not moved');
});

test('Liz and the cottage frontage meet the rendered ground',()=>{
  scene.updateMatrixWorld(true);
  const terrain=[];
  scene.traverse(mesh=>{if(mesh.isMesh&&(mesh.name.startsWith('Terrain ')||mesh.name==='Whole-world terrain'))terrain.push(mesh);});
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const p of [LIZ_STAND,LIZ_COTTAGE.porch,LIZ_GARDEN.entry]){
    ray.set(new THREE.Vector3(p.x,150,p.z),down);
    const hit=ray.intersectObjects(terrain,false)[0];
    assert.ok(hit,'visible terrain at the interaction point');
    assert.ok(Math.abs(hit.point.y-world.heightAt(p.x,p.z))<.06,`feet meet visible ground at ${p.x},${p.z}`);
  }
});
