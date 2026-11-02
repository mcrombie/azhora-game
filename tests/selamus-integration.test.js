import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { SELAMUS_BUILDINGS, SELAMUS_ARRIVAL, SELAMUS_BRIDGES, selamusPoint, selamusCanalAt } from '../src/content/regions/selamus/selamus-city.js';
import { canStand, canSwim, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { bodyWorld, BODY } from '../src/gameplay/combat/bodies.js';
import { COASTAL_HOMES, COASTAL_VILLAGES } from '../src/content/regions/ascarth/coastal-villages.js';
import { restoreWalkPosition } from '../src/world/collision/walk-surfaces.js';
const scene=new THREE.Scene(),world=await scopedWorld(scene,[24]);
const {runSelamusChecks}=await sourceModule('../src/dev/checks/selamus-checks.js');
const {SELAMUS_PIERS}=await sourceModule('../src/content/regions/selamus/selamus-harbor.js');
const {groundWithRiver}=await sourceModule('../src/world/terrain/world-terrain.js');
async function loadIsland(){
  const frame=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);globalThis.cancelAnimationFrame=clearTimeout;
  try{await world.loading.ensureRegion(54);}finally{world.loading.stop();
    if(frame===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=frame;
    if(cancel===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=cancel;}
}

test('Southern Ascarth first loads the shared headland surface without the island city, then reuses it',async()=>{
  const job=id=>world.loading.state().jobs.find(job=>job.id===id),patch=world.selamusGround.patches?.[0];
  try{
    assert.equal(world.loading.isReady(24),true);
    assert.equal(job('selamusGround').status,'ready');
    for(const id of ['selemisScenery','selamus','selamusHarbor'])assert.notEqual(job(id).status,'ready',`${id} should remain island-owned`);
    assert.equal(world.selamus.mapFeatures.length,0);assert.equal(world.selamusHarbor.walkSurfaces.length,0);
    assert.equal(world.mapBridges.filter(b=>b.id?.startsWith('selamus-')).length,0);
    assert.ok(patch);
    scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
    // Full-strength headland, plus the existing outer blending apron. All are
    // on Southern Ascarth; the first-load replacement must already be visible.
    for(const [x,z] of [[-700,2300],[-710,2300],[-700,2310],[-700,2290]]){
      assert.equal(world.regionAt(x,z).id,24);
      const height=world.heightAt(x,z);
      if(z>=2300){assert.ok(height>10);assert.ok(Math.abs(height-world.groundHeight(x,z))<.015);}
      ray.set(new THREE.Vector3(x,height+2,z),down);const hit=ray.intersectObject(patch,false)[0];
      assert.ok(hit,`missing shared headland at ${x},${z}`);assert.ok(Math.abs(hit.point.y-height)<.015);
      for(let object=patch;object;object=object.parent)assert.notEqual(object.visible,false,'shared ground is hidden until island arrival');
    }
  }finally{await loadIsland();}
  assert.equal(world.selamusGround.patches[0],patch,'later city arrival rebuilds the shared ground');
  assert.equal(world.selamusGround.patches.length,1);
});

test('Fast region travel installs the whole city, harbor and real walking bridges',()=>{
  assert.equal(world.loading.isReady(54),true);
  const checks=runSelamusChecks(world);assert.equal(checks.ok,true);assert.equal(checks.journeys.length,22);
  assert.equal(world.selamusHarbor.metrics.ships,12);
  const buildings=world.mapBuildings.filter(b=>b.id.startsWith('selamus-'));
  assert.equal(buildings.length,72);assert.equal(buildings.length,SELAMUS_BUILDINGS.length);
  const actualIds=new Set(SELAMUS_BUILDINGS.map(b=>b.id));
  assert.ok(buildings.every(b=>actualIds.has(b.id)),'a plaza is rendered as a house');
  assert.equal(world.mapBridges.filter(b=>b.id?.startsWith('selamus-')).length,8);
});

test('visible city terrain matches feet and open canal beds support swimming',()=>{
  scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const [u,v] of [[0,22],[0,32],[-20,0],[15,21],[-81,-5],[140,7],[0,85],[-155,20]]){
    const p=selamusPoint(u,v),height=world.heightAt(p.x,p.z);
    ray.set(new THREE.Vector3(p.x,height+.6,p.z),down);const hit=ray.intersectObjects(world.selamusGround.patches,false)[0];
    assert.ok(hit,`visible terrain ${u},${v}`);assert.ok(Math.abs(hit.point.y-height)<.015,`drawn surface ${u},${v}`);
  }
  const water=selamusPoint(-20,-2.5);assert.ok(canSwim(water.x,water.z,world),'open canal can be swum');
  assert.ok(canStand(SELAMUS_ARRIVAL.x,SELAMUS_ARRIVAL.z,world),'outdoor arrival');
});

test('bridge save positions restore onto visible decks with safe overhead clearance',()=>{
  scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const bridge of SELAMUS_BRIDGES){
    const x=(bridge.a.x+bridge.b.x)/2,z=(bridge.a.z+bridge.b.z)/2;
    const support=world.supportAt(x,z,{maxY:20});assert.ok(support.id);
    const restored=restoreWalkPosition({x,z,y:-100,surfaceId:support.id},world);assert.equal(restored.y,support.height);
    ray.set(new THREE.Vector3(x,support.height+.3,z),down);const hit=ray.intersectObject(world.selamus.root,true)[0];
    assert.ok(hit);assert.ok(Math.abs(hit.point.y-support.height)<.06,bridge.id);
  }
});

test('city clearing leaves no natural tree or rock blockers in streets and canal beds',()=>{
  const blockers=world.colliders.filter(c=>['selemis-tree','ridge-rock'].includes(c.kind)&&selamusCanalAt(c.x,c.z)?.edge<3);
  assert.equal(blockers.length,0);
  for(const s of world.walkSurfaces.filter(s=>s.id.startsWith('selamus-')))assert.ok(s.width>=(s.id.includes(':quay:')?2.5:3));
});

test('pier-end saves resolve real deck support while unknown saved surfaces remain invalid',()=>{
  for(const pier of SELAMUS_PIERS){
    const {x,z}=pier.b,support=world.supportAt(x,z,{maxY:20});
    assert.equal(support.id,`${pier.id}-deck`);
    const restored=restoreWalkPosition({x,z,y:-100,surfaceId:support.id},world);
    assert.equal(restored.surfaceId,support.id);assert.equal(restored.y,support.height);
    assert.ok(canStand(x,z,{...world,heightAt:()=>restored.y,feetY:restored.y},.34,restored.y),`${pier.id} restored deck is blocked`);
    const bogus=restoreWalkPosition({x,z,y:100,surfaceId:'selamus-nonexistent-deck'},world);
    assert.equal(bogus.surfaceId,undefined);assert.equal(bogus.y,world.heightAt(x,z));
    assert.ok(bogus.y<0,'unknown surface must not create footing over the harbor');
  }
});

test('mainland households have clear walkable approaches and visible porch floors',()=>{
  scene.updateMatrixWorld(true);
  const root=scene.getObjectByName('Ascarth villages facing Selemis');assert.ok(root);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  assert.equal(COASTAL_HOMES.length,18);
  for(const home of COASTAL_HOMES){
    assert.ok(world.mapBuildings.some(b=>b.id===home.id),`${home.id} missing from chart`);
    const ramp=world.walkSurfaces.find(s=>s.id===`${home.id}:approach`),porch=world.walkSurfaces.find(s=>s.id===`${home.id}:porch`);
    assert.ok(ramp&&porch,`${home.id} missing its walking floors`);
    const village=COASTAL_VILLAGES.find(v=>v.id===home.village);
    const pos={x:ramp.a.x,z:village.z,y:world.heightAt(ramp.a.x,village.z)};
    const moving=bodyWorld(world).moving(pos,BODY.traveler);
    const dx=ramp.b.x-ramp.a.x,dz=ramp.b.z-ramp.a.z,length=Math.hypot(dx,dz);
    assert.ok(Math.abs(ramp.b.y-ramp.a.y)/length<.3,`${home.id} approach too steep`);
    for(const target of [ramp.a,ramp.b,{x:ramp.b.x+dx/length*.85,z:ramp.b.z+dz/length*.85}]){
      for(let step=0;Math.hypot(target.x-pos.x,target.z-pos.z)>.03;step++){
        assert.ok(step<150,`${home.id} cannot reach its porch from the lane`);
        const d=Math.hypot(target.x-pos.x,target.z-pos.z),amount=Math.min(.15,d),before=pos.y;
        moveCharacter(pos,(target.x-pos.x)/d*amount,(target.z-pos.z)/d*amount,moving,BODY.traveler);
        pos.y=moving.heightAt(pos.x,pos.z);
        assert.ok(Math.abs(pos.y-before)<.35,`${home.id} has an abrupt approach step`);
      }
    }
    assert.ok(Math.abs(pos.y-porch.a.y)<.015,`${home.id} porch support does not match its floor`);
    ray.set(new THREE.Vector3(pos.x,pos.y+.2,pos.z),down);
    const hit=ray.intersectObject(root,true)[0];assert.ok(hit);
    assert.ok(Math.abs(hit.point.y-pos.y)<.015,`${home.id} visible porch disagrees with feet`);
    const saved=restoreWalkPosition({...pos,surfaceId:porch.id},world);
    assert.equal(saved.y,porch.a.y);
  }
});

test('the mainland headland has no sunken strip at the edge of the city terrain',()=>{
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const x of [-724,-714,-704,-694,-684])for(let z=2278;z<=2296;z+=2){
    const y=world.heightAt(x,z),expected=groundWithRiver(x,z);
    assert.ok(Math.abs(y-expected)<.22,`artificial ditch at ${x},${z}: ${y} versus ${expected}`);
    ray.set(new THREE.Vector3(x,y+.2,z),down);
    const hit=ray.intersectObjects(world.selamusGround.patches,false)[0];assert.ok(hit);
    assert.ok(Math.abs(hit.point.y-y)<.015,`headland footing disagrees with rendering at ${x},${z}`);
  }
});
